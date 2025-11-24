import express from 'express';
import { GoogleGenAI, Modality } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// =====================
// 🔑 لود کردن کلیدها از env
// =====================
const API_KEYS = process.env.TTS_KEYS
  ? process.env.TTS_KEYS.split(',').map(k => k.trim())
  : [];

const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (API_KEYS.length === 0) {
  console.error("❌ هیچ کلیدی در TTS_KEYS پیدا نشد. لطفاً .env را چک کنید.");
}

if (!PRIVATE_KEY) {
  console.error("❌ PRIVATE_KEY در .env یافت نشد.");
}


// =====================
// ⬇ ادامهٔ کد شما بدون حذف هیچ چیز
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
// انتخاب کلید آزاد و سالم
// =====================
function getNextAvailableKey() {
  const now = Date.now();
  const totalKeys = API_KEYS.length;

  for (let i = 0; i < totalKeys; i++) {
    const idx = (roundRobinIndex + i) % totalKeys;
    const state = keyState[idx];

    state.requestsInMinute = state.requestsInMinute.filter(t => now - t < 60 * 1000);
    state.requestsInDay = state.requestsInDay.filter(t => now - t < 24 * 60 * 60 * 1000);

    if (!state.inUse &&
        now > state.cooldownUntil &&
        state.requestsInMinute.length < 10 &&
        state.requestsInDay.length < 100
    ) {
      state.inUse = true;
      state.requestsInMinute.push(now);
      state.requestsInDay.push(now);

      roundRobinIndex = (idx + 1) % totalKeys;
      return idx;
    }
  }
  return null;
}


// =====================
// پردازش صف
// =====================
async function processQueue() {
  if (requestQueue.length === 0) return;

  for (let i = 0; i < requestQueue.length; i++) {
    const queueItem = requestQueue[i];
    const keyIdx = getNextAvailableKey();
    if (keyIdx === null) continue;

    requestQueue.splice(i, 1);
    i--;

    handleRequest(queueItem.req, queueItem.res, queueItem.next, keyIdx)
      .finally(() => {
        keyState[keyIdx].inUse = false;
        processQueue();
      });
  }
}


// =====================
// تابع اصلی درخواست
// =====================
// تابع کمکی برای پایان روز در Pacific Time
function getEndOfDayPacificTimestamp() {
  const now = new Date();

  // گرفتن تاریخ به Pacific Time
  const options = { timeZone: 'America/Los_Angeles', hour12: false };
  const pacificYear = now.toLocaleString('en-US', { ...options, year: 'numeric' });
  const pacificMonth = now.toLocaleString('en-US', { ...options, month: '2-digit' });
  const pacificDate = now.toLocaleString('en-US', { ...options, day: '2-digit' });

  // 12 شب PT فردا
  const pacificEnd = new Date(`${pacificYear}-${pacificMonth}-${pacificDate}T00:00:00-07:00`);
  pacificEnd.setDate(pacificEnd.getDate() + 1);

  return pacificEnd.getTime();
}

async function handleRequest(req, res, next, keyIdx) {
  const { text, multiSpeaker, voiceName } = req.body;
  const key = API_KEYS[keyIdx];

  console.log(`[${new Date().toISOString()}] 🔹 دریافت درخواست TTS: "${text}" | کلید انتخاب شده: ${keyIdx}`);

  try {
    let speechConfig = {};
    if (multiSpeaker && Array.isArray(multiSpeaker) && multiSpeaker.length > 0) {
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

    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ parts: [{ text }] }],
      config: { responseModalities: [Modality.AUDIO], speechConfig }
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    const audioPart = parts.find(part => part.inlineData?.mimeType?.startsWith('audio/'));

    if (audioPart?.inlineData?.data) {
      successTimes.push(Date.now());
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      successTimes = successTimes.filter(t => t > cutoff);
      const successNumber = successTimes.length;

      console.log(`[${new Date().toISOString()}] ✅ صوت تولید شد | کلید: ${keyIdx} | موفقیت‌های 24 ساعته: ${successNumber}`);

      return res.json({ base64: audioPart.inlineData.data, mimeType: audioPart.inlineData.mimeType, successNumber });
    } else {
      console.log(`[${new Date().toISOString()}] ⚠️ صوت تولید نشد | کلید: ${keyIdx} | parts موجود: ${parts.length}`);
      return res.status(200).json({ message: 'صوتی تولید نشد.', parts });
    }

  } catch (err) {

    // 429 → غیرفعال تا پایان روز Pacific Time
    if (err.response?.status === 429 || err.message.includes('429')) {
      const endOfDayPT = getEndOfDayPacificTimestamp();
      keyState[keyIdx].cooldownUntil = endOfDayPT;

      console.log(
        `[${new Date().toISOString()}] ⏳ کلید ${keyIdx} تا پایان امروز PT (${new Date(endOfDayPT).toLocaleString()}) غیرفعال شد (429)`
      );

      requestQueue.push({ req, res, next });
      processQueue();
      return;
    }

    // 403 → غیرفعال‌سازی دائمی کلید
    if (err.response?.status === 403 || err.message.includes('403')) {
      keyState[keyIdx].cooldownUntil = Infinity;

      console.log(
        `[${new Date().toISOString()}] ⛔ کلید ${keyIdx} برای همیشه غیر فعال شد (403)`
      );

      requestQueue.push({ req, res, next });
      processQueue();
      return;
    }

    console.error(`[${new Date().toISOString()}] 💥 خطای TTS با کلید ${keyIdx}:`, err.message);
    return res.status(500).json({ error: 'خطای سرویس TTS.' });
  }
}



// مسیر POST
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
  res.status(500).json({ error: 'خطای سرور.' });
});

export default router;
