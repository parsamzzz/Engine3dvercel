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

setInterval(() => {
  successTimes = [];
  console.log('🔄 شمارش موفقیت‌ها ریست شد.');
}, 24 * 60 * 60 * 1000);

function sanitizeText(text) {
  if (!text) return '';
  const allowed = /[آ-ی۰-۹a-zA-Z\s.,:!?ءًٌٍَُِّْٰٔ]/;
  let result = '';
  let prevChar = '';

  for (const char of text) {
    if (!allowed.test(char)) continue;
    if (/[.,:!?]/.test(char) && char === prevChar) continue;
    result += char;
    prevChar = char;
  }

  return result.replace(/\s+/g, ' ').trim();
}

function getNextAvailableKey() {
  const now = Date.now();

  for (let i = 0; i < API_KEYS.length; i++) {
    const idx = (roundRobinIndex + i) % API_KEYS.length;
    const state = keyState[idx];

    state.requestsInMinute = state.requestsInMinute.filter(t => now - t < 60 * 1000);
    state.requestsInDay = state.requestsInDay.filter(t => now - t < 24 * 60 * 60 * 1000);

    if (
      !state.inUse &&
      now > state.cooldownUntil &&
      state.requestsInMinute.length < 10 &&
      state.requestsInDay.length < 100
    ) {
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
      .finally(() => {
        keyState[keyIdx].inUse = false;
        processQueue();
      });
  }
}

async function handleRequest(req, res, next, keyIdx) {
  let { text, multiSpeaker, voiceName } = req.body;
  text = sanitizeText(text);
  const key = API_KEYS[keyIdx];

  console.log(`[${new Date().toISOString()}] 🔹 TTS | key ${keyIdx}`);

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': key
        },
        body: JSON.stringify({
          model: 'gemini-2.5-flash-preview-tts',
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' }
              }
            }
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      const error = new Error(errorText);
      error.status = response.status;
      throw error;
    }

    const data = await response.json();

    const parts = data.candidates?.[0]?.content?.parts;
    const audioPart = parts?.find(p => p.inlineData?.mimeType?.startsWith('audio/'));

    if (!audioPart?.inlineData?.data) {
      throw new Error('NO_AUDIO');
    }

    successTimes.push(Date.now());

    if (!res.headersSent) {
      return res.json({
        base64: audioPart.inlineData.data,
        mimeType: audioPart.inlineData.mimeType
      });
    }

  } catch (err) {
    const status = err.status || 0;
    const errMsg = err.message || '';

    console.error(`❌ key ${keyIdx} failed | status: ${status}`);

    // ⛔ 403 → غیرفعال دائمی
    if (status === 403) {
      keyState[keyIdx].cooldownUntil = Infinity;
      console.log(`🚫 key ${keyIdx} permanently disabled`);
    }

    // ⏳ 429 → cooldown
    else if (status === 429) {
      keyState[keyIdx].cooldownUntil = getEndOfDayPacificTimestamp();
      console.log(`⏳ key ${keyIdx} cooldown`);
    }

    // 🔁 400 → برو کلید بعدی (بدون غیرفعال کردن)
    else if (status === 400) {
      console.log(`🔁 key ${keyIdx} got 400 → trying next key`);
    }

    // سایر خطاهای HTTP → برو کلید بعدی
    else if (status >= 400 && status < 600) {
      console.log(`🔁 HTTP error ${status} → trying next key`);
    }

    requestQueue.push({ req, res, next });
    setTimeout(processQueue, 500);
  }
}

router.post('/', (req, res, next) => {
  const clientKey = req.headers['x-api-key'];

  if (!clientKey || clientKey !== PRIVATE_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const { text } = req.body;

  if (!text || typeof text !== 'string' || text.trim() === '') {
    return res.status(400).json({ error: 'text معتبر نیست.' });
  }

  requestQueue.push({ req, res, next });
  processQueue();
});

router.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err);
  if (!res.headersSent) {
    res.status(500).json({ error: 'خطای سرور.' });
  }
});

export default router;