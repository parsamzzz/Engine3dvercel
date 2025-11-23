import express from 'express';
import { GoogleGenAI, Modality } from '@google/genai';

const router = express.Router();

const API_KEYS = [
'AIzaSyA9DaWf4bnQ7gjU28oH9XOm0szQ532MgsU',
'AIzaSyCUc2_0PBtqqxDZf_CujlIJHxu3O6nUR-Y',
'AIzaSyD8NEk7bgstXS3tKjAyM_U2dcBtwo7bxhk',
'AIzaSyCH-tcysJHwjOmI4_cKKwQ1fW9QN1KhHuA',
'AIzaSyDODO3QjpetM64FzIvwLa-9YvxqqsX9jzE',
'AIzaSyBaTixkFWXf1-ymoIutUFuHe73hq4UWg1k',
'AIzaSyC4w6_xnvARx8O-_bpX3HIywJcsJi7WHN0',
'AIzaSyCaP1cUV4zKsHmvsaUjvMtlJCEw702OVDg',
'AIzaSyBTvgd9F6aIM3v5-MdR7KQo-92piYQD5xk',
'AIzaSyCjxYa9DwVbl11_LGIUT3jJjrUG98NwIOI',
'AIzaSyDur6BVp93kwB15XUJO7SE2r0XRwQcXecU'

];

const PRIVATE_KEY = 'threedify_7Vg5NqXk29Lz3MwYcPfBTr84sD';


const keyState = API_KEYS.map(() => ({
  inUse: false,
  cooldownUntil: 0,
  requestsInMinute: [],
  requestsInDay: []
}));

let roundRobinIndex = 0;
const requestQueue = [];

// آرایه برای نگهداری زمان موفقیت‌ها
let successTimes = [];

// ریست خودکار هر 24 ساعت
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
      // ثبت موفقیت
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

    // -------------------------
    // 🔥 اضافه شدن Retry Logic
    // -------------------------

    if (err.response?.status === 429 || err.message.includes('429')) {
      keyState[keyIdx].cooldownUntil = Date.now() + 60 * 1000;
      console.log(`[${new Date().toISOString()}] ⏳ کلید ${keyIdx} در حالت cooldown 1 دقیقه‌ای (429)`);

      // 🌟 درخواست دوباره وارد صف شود
      requestQueue.push({ req, res, next });
      processQueue();
      return;
    }

    if (err.response?.status === 403 || err.message.includes('403')) {
      keyState[keyIdx].cooldownUntil = Date.now() + 24 * 60 * 60 * 1000;
      console.log(`[${new Date().toISOString()}] ⏳ کلید ${keyIdx} در حالت cooldown 24 ساعته (403)`);

      // 🌟 درخواست دوباره وارد صف شود
      requestQueue.push({ req, res, next });
      processQueue();
      return;
    }

    // -------------------------
    //   پایان بخش اصلاح شده
    // -------------------------

    console.error(`[${new Date().toISOString()}] 💥 خطای TTS با کلید ${keyIdx}:`, err.message);
    return res.status(500).json({ error: 'خطای سرویس TTS.' });
  }
}


// لاگ ریست موفقیت‌ها
setInterval(() => {
  successTimes = [];
  console.log(`[${new Date().toISOString()}] 🔄 شمارش موفقیت‌ها ریست شد.`);
}, 24 * 60 * 60 * 1000);


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

router.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err);
  res.status(500).json({ error: 'خطای سرور.' });
});

export default router;
