import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// =====================
// 🔑 لود کردن کلیدها
// =====================
const API_KEYS = process.env.TTS_KEYS?.split(',').map(k => k.trim()) || [];
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!API_KEYS.length) console.error("❌ هیچ کلیدی در TTS_KEYS پیدا نشد.");
if (!PRIVATE_KEY) console.error("❌ PRIVATE_KEY در .env یافت نشد.");

// =====================
// وضعیت کلیدها و صف
// =====================
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

// =====================
// sanitize برای حذف کاراکترهای نامرئی
// =====================
function sanitizeText(text) {
  if (!text) return '';
  return text.replace(/[\u0000-\u001F\u007F\u2028\u2029\u200B-\u200D\uFEFF]/g, '');
}

// =====================
// گرفتن کلید آزاد
// =====================
function getNextAvailableKey() {
  const now = Date.now();
  for (let i = 0; i < API_KEYS.length; i++) {
    const idx = (roundRobinIndex + i) % API_KEYS.length;
    const state = keyState[idx];

    state.requestsInMinute = state.requestsInMinute.filter(t => now - t < 60 * 1000);
    state.requestsInDay = state.requestsInDay.filter(t => now - t < 24 * 60 * 60 * 1000);

    if (!state.inUse &&
        now > state.cooldownUntil &&
        state.requestsInMinute.length < 10 &&
        state.requestsInDay.length < 100) {
      state.inUse = true;
      state.requestsInMinute.push(now);
      state.requestsInDay.push(now);
      roundRobinIndex = (idx + 1) % API_KEYS.length;
      return idx;
    }
  }
  return null;
}

// =====================
// پایان روز Pacific Time
// =====================
function getEndOfDayPacificTimestamp() {
  const now = new Date();
  const options = { timeZone: 'America/Los_Angeles', hour12: false };
  const pacificYear = now.toLocaleString('en-US', { ...options, year: 'numeric' });
  const pacificMonth = now.toLocaleString('en-US', { ...options, month: '2-digit' });
  const pacificDate = now.toLocaleString('en-US', { ...options, day: '2-digit' });

  const pacificEnd = new Date(`${pacificYear}-${pacificMonth}-${pacificDate}T00:00:00-07:00`);
  pacificEnd.setDate(pacificEnd.getDate() + 1);

  return pacificEnd.getTime();
}

// =====================
// پردازش صف
// =====================
async function processQueue() {
  if (!requestQueue.length) return;

  for (let i = 0; i < requestQueue.length; i++) {
    const { req, res, next } = requestQueue[i];
    const keyIdx = getNextAvailableKey();
    if (keyIdx === null) continue;

    requestQueue.splice(i, 1);
    i--;

    handleRequest(req, res, next, keyIdx)
      .finally(() => {
        keyState[keyIdx].inUse = false;
        processQueue();
      });
  }
}

// =====================
// handleRequest اصلی
// =====================
async function handleRequest(req, res, next, keyIdx) {
  let { text, multiSpeaker, voiceName } = req.body;
  text = sanitizeText(text);
  const key = API_KEYS[keyIdx];

  console.log(`[${new Date().toISOString()}] 🔹 دریافت درخواست TTS | کلید ${keyIdx}`);

  try {
    // آماده‌سازی speechConfig
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

    // درخواست HTTP مستقیم
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
            speechConfig
          }
        })
      }
    );

    const data = await response.json();

    if (!data.candidates?.[0]?.content?.parts?.length) {
      return res.status(500).json({ error: 'صوت تولید نشد', data });
    }

    const parts = data.candidates[0].content.parts;
    const audioPart = parts.find(p => p.inlineData?.mimeType?.startsWith('audio/'));

    if (!audioPart?.inlineData?.data) {
      return res.status(500).json({ error: 'صوت تولید نشد', parts });
    }

    successTimes.push(Date.now());
    successTimes = successTimes.filter(t => t > Date.now() - 24 * 60 * 60 * 1000);

    return res.json({
      base64: audioPart.inlineData.data,
      mimeType: audioPart.inlineData.mimeType,
      successNumber: successTimes.length
    });

  } catch (err) {
    const errMsg = err.message || '';

    if (errMsg.includes('ByteString') || errMsg.includes('8207')) {
      console.log('⚠️ ByteString Error → دوباره به صف اضافه شد');
      requestQueue.push({ req, res, next });
      processQueue();
      return;
    }

    if (err.status === 429 || errMsg.includes('429')) {
      keyState[keyIdx].cooldownUntil = getEndOfDayPacificTimestamp();
      requestQueue.push({ req, res, next });
      processQueue();
      return;
    }

    if (err.status === 403 || errMsg.includes('403')) {
      keyState[keyIdx].cooldownUntil = Infinity;
      requestQueue.push({ req, res, next });
      processQueue();
      return;
    }

    console.error(`[TTS Error key ${keyIdx}]:`, errMsg);
    return res.status(500).json({ error: 'خطای سرویس TTS.' });
  }
}

// =====================
// مسیر POST
// =====================
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

// =====================
// error handler
// =====================
router.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err);
  res.status(500).json({ error: 'خطای سرور.' });
});

export default router;
