import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

const API_KEYS = process.env.TTS_KEYS?.split(',').map(k => k.trim()) || [];
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!API_KEYS.length) console.error("❌ هیچ کلیدی در TTS_KEYS پیدا نشد.");
if (!PRIVATE_KEY) console.error("❌ PRIVATE_KEY در .env یافت نشد.");

const keyState = API_KEYS.map(() => ({
  inUse: false,
  cooldownUntil: 0,
  requestsInMinute: [],
  requestsInDay: []
}));

let roundRobinIndex = 0;
const requestQueue = [];
let successTimes = [];

setInterval(() => { successTimes = []; console.log('🔄 شمارش موفقیت‌ها ریست شد.'); }, 24*60*60*1000);

function sanitizeText(text) {
  if (!text) return '';

  const allowed = /[آ-ی۰-۹a-zA-Z\s.,:!?ءًٌٍَُِّْٰٔ]/;

  let result = '';
  let prevChar = '';

  for (const char of text) {
    if (!allowed.test(char)) continue; 

    // حذف تکرار پشت سر هم علامت دستور زبانی
    if (/[.,:!?]/.test(char) && char === prevChar) continue;

    result += char;
    prevChar = char;
  }

  // تبدیل تمام فاصله‌های غیرمعمول به فاصله معمولی و حذف فاصله‌های پشت سر هم
  result = result.replace(/[\s\u200B-\u200D\uFEFF]+/g, ' ').trim();

  return result;
}


function getNextAvailableKey() {
  const now = Date.now();
  for (let i = 0; i < API_KEYS.length; i++) {
    const idx = (roundRobinIndex + i) % API_KEYS.length;
    const state = keyState[idx];

    state.requestsInMinute = state.requestsInMinute.filter(t => now - t < 60*1000);
    state.requestsInDay = state.requestsInDay.filter(t => now - t < 24*60*60*1000);

    if (!state.inUse && now > state.cooldownUntil &&
        state.requestsInMinute.length < 10 && state.requestsInDay.length < 100) {
      state.inUse = true;
      state.requestsInMinute.push(now);
      state.requestsInDay.push(now);
      roundRobinIndex = (idx + 1) % API_KEYS.length;
      return idx;
    }
  }
  return null;
}

function getEndOfDayPacificTimestamp() {
  const now = new Date();
  const options = { timeZone: 'America/Los_Angeles', hour12: false };
  const year = now.toLocaleString('en-US', { ...options, year: 'numeric' });
  const month = now.toLocaleString('en-US', { ...options, month: '2-digit' });
  const day = now.toLocaleString('en-US', { ...options, day: '2-digit' });

  const pacificEnd = new Date(`${year}-${month}-${day}T00:00:00-07:00`);
  pacificEnd.setDate(pacificEnd.getDate() + 1);
  return pacificEnd.getTime();
}

async function processQueue() {
  if (!requestQueue.length) return;
  for (let i = 0; i < requestQueue.length; i++) {
    const { req, res, next } = requestQueue[i];
    const keyIdx = getNextAvailableKey();
    if (keyIdx === null) {
      setTimeout(processQueue, 1000);
      continue;
    }
    requestQueue.splice(i, 1);
    i--;
    handleRequest(req, res, next, keyIdx)
      .finally(() => { keyState[keyIdx].inUse = false; processQueue(); });
  }
}

async function handleRequest(req, res, next, keyIdx) {
  let { text, multiSpeaker, voiceName } = req.body;
  text = sanitizeText(text);
  const key = API_KEYS[keyIdx];

  console.log(`[${new Date().toISOString()}] 🔹 درخواست TTS دریافت شد | key ${keyIdx} | text length: ${text.length}`);

  try {
    let speechConfig;
    if (multiSpeaker?.length) {
      speechConfig = {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: multiSpeaker.map(({ speaker, voiceName }) => ({
            speaker,
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' } }
          }))
        }
      };
    } else {
      speechConfig = { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' } } };
    }

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          model: 'gemini-2.5-flash-preview-tts',
          contents: [{ parts: [{ text }] }],
          generationConfig: { responseModalities: ["AUDIO"], speechConfig }
        })
      }
    );

    const data = await response.json();

    if (!data.candidates?.[0]?.content?.parts?.length) {
      console.error(`[TTS key ${keyIdx}] ❌ صوت تولید نشد`);
      return res.status(500).json({ error: 'صوت تولید نشد', data });
    }

    const parts = data.candidates[0].content.parts;
    const audioPart = parts.find(p => p.inlineData?.mimeType?.startsWith('audio/'));

    if (!audioPart?.inlineData?.data) {
      console.error(`[TTS key ${keyIdx}] ❌ audio data خالی است`);
      return res.status(500).json({ error: 'صوت تولید نشد', parts });
    }

    successTimes.push(Date.now());
    successTimes = successTimes.filter(t => t > Date.now() - 24*60*60*1000);

    console.log(`[TTS key ${keyIdx}] ✅ صوت تولید شد | total successes: ${successTimes.length}`);
    return res.json({
      base64: audioPart.inlineData.data,
      mimeType: audioPart.inlineData.mimeType,
      successNumber: successTimes.length
    });

  } catch (err) {
    const errMsg = err.message || '';
    console.error(`[TTS key ${keyIdx}] ⚠️ خطا: ${errMsg}`);

    if (errMsg.includes('ByteString') || errMsg.includes('8207')) {
      console.log('🔁 دوباره به صف اضافه شد');
      requestQueue.push({ req, res, next });
      setTimeout(processQueue, 1000);
      return;
    }

    if (err.status === 429 || errMsg.includes('429')) {
      keyState[keyIdx].cooldownUntil = getEndOfDayPacificTimestamp();
      console.log(`⏳ key ${keyIdx} در cooldown قرار گرفت`);
      requestQueue.push({ req, res, next });
      setTimeout(processQueue, 1000);
      return;
    }

    if (err.status === 403 || errMsg.includes('403')) {
      keyState[keyIdx].cooldownUntil = Infinity;
      console.log(`🚫 key ${keyIdx} غیرفعال شد`);
      requestQueue.push({ req, res, next });
      setTimeout(processQueue, 1000);
      return;
    }

    return res.status(500).json({ error: 'خطای سرویس TTS.' });
  }
}

router.post('/', (req, res, next) => {
  const clientKey = req.headers['x-api-key'];
  if (!clientKey || clientKey !== PRIVATE_KEY) return res.status(403).json({ error: 'Unauthorized' });

  const { text } = req.body;
  if (!text || typeof text !== 'string' || text.trim() === '') return res.status(400).json({ error: 'text معتبر نیست.' });

  requestQueue.push({ req, res, next });
  processQueue();
});

router.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err);
  res.status(500).json({ error: 'خطای سرور.' });
});

export default router;