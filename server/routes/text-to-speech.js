import express from 'express';
import { GoogleGenAI, Modality } from '@google/genai';

const router = express.Router();

const API_KEYS = [
   "AIzaSyAhud0Y08odo3QkR6tn0QTPNVCtlgWhQnk",
"AIzaSyB7jAI-1FHYATMTQIH3YkD7kIuIm7o2-lo",
"AIzaSyA416fx5gbHbbHsHYEK6RAqtyvTCSvdNjw",
"AIzaSyA6dLEJ1YxJLG2gRMoD9egKagMiV0Biu3o",
"AIzaSyB9r5Uhw5Jzr2XcHMnSSSza7dUBliE91rE",
"AIzaSyBhxhDka6LCfQe_JQPZkVfDehTG0tUFkI8",
"AIzaSyDsr-qCEvaeBciXS-jGuLGWRkrCPLoyswU",


];
// =====================
// 🛡 کلید خصوصی کلاینت
// =====================
const PRIVATE_KEY = 'threedify_7Vg5NqXk29Lz3MwYcPfBTr84sD';

// وضعیت کلیدها
const keyState = API_KEYS.map(() => ({ cooldownUntil: 0, inUse: false }));
let apiKeyIndex = 0;

// صف درخواست‌ها
const requestQueue = [];
let processingQueue = false;

// =====================
// 📌 انتخاب کلید سالم
// =====================
function getNextAvailableKey() {
  const totalKeys = API_KEYS.length;
  for (let i = 0; i < totalKeys; i++) {
    const idx = (apiKeyIndex + i) % totalKeys;
    const state = keyState[idx];
    if (!state.inUse && Date.now() > state.cooldownUntil) {
      apiKeyIndex = (idx + 1) % totalKeys;
      state.inUse = true;
      console.log(`🔑 کلید انتخاب شد: ${idx} - ${API_KEYS[idx].substring(0, 10)}...`);
      return { key: API_KEYS[idx], idx };
    }
  }
  return null;
}

// =====================
// 📌 بررسی اینکه همه کلیدها در cooldown هستند یا نه
// =====================
function allKeysInCooldown() {
  const now = Date.now();
  return keyState.every(k => now < k.cooldownUntil);
}

// =====================
// 📌 پردازش صف
// =====================
async function processQueue() {
  if (processingQueue) return;
  processingQueue = true;

  while (requestQueue.length > 0) {
    const { req, res, next } = requestQueue.shift();
    console.log(`📥 پردازش درخواست جدید - IP: ${req.ip}, body:`, req.body);
    try {
      await handleRequest(req, res, next);
    } catch (err) {
      next(err);
    }
  }

  processingQueue = false;
}

// =====================
// 📌 تابع اصلی درخواست
// =====================
// 🔢 شمارنده صوت موفق
let successfulAudioCount = 0;
// 📅 تاریخ آخرین ریست شمارنده
let lastResetDate = new Date().toDateString(); // فقط تاریخ بدون ساعت

async function handleRequest(req, res, next) {
  const { text, multiSpeaker, voiceName } = req.body;
  const totalKeys = API_KEYS.length;
  let triedKeys = 0;

  // 🔁 تا وقتی یکی جواب بده
  while (true) {
    let keyData = getNextAvailableKey();

    // اگر هیچ کلیدی آزاد نبود، یعنی همشون cooldown شدن → دوباره از اول بچرخ بدون توقف
    if (!keyData) {
      console.warn('⚠️ همه کلیدها در cooldown هستند، دوباره از اول امتحان می‌کنیم...');
      apiKeyIndex = 0;
      for (let i = 0; i < totalKeys; i++) keyState[i].inUse = false; // مطمئن شو همه آزاد هستن برای چک
      continue;
    }

    const { key, idx } = keyData;

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
      console.log(`🚀 ارسال درخواست به Gemini با کلید شماره ${idx}`);
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text }] }],
        config: { responseModalities: [Modality.AUDIO], speechConfig }
      });

      const parts = response.candidates?.[0]?.content?.parts || [];
      const audioPart = parts.find(part => part.inlineData?.mimeType?.startsWith('audio/'));
      keyState[idx].inUse = false;

      if (audioPart?.inlineData?.data) {
        // 🔄 ریست روزانه شمارنده
        const today = new Date().toDateString();
        if (today !== lastResetDate) {
          successfulAudioCount = 0;
          lastResetDate = today;
          console.log('🔄 شمارنده صوت موفق ریست شد (روز جدید)');
        }

        // ✅ افزایش شمارنده و چاپ لاگ با شمارنده روزانه
        successfulAudioCount++;
        console.log(`✅ موفقیت: صوت تولید شد با کلید شماره ${idx} | شمارنده روزانه: ${successfulAudioCount}`);
        return res.json({ base64: audioPart.inlineData.data, mimeType: audioPart.inlineData.mimeType });
      } else {
        console.warn(`⚠️ صوتی تولید نشد با کلید شماره ${idx}`);
        return res.status(200).json({ message: 'صوتی تولید نشد.', parts });
      }

    } catch (err) {
      keyState[idx].inUse = false;
      console.error(`❌ خطا با کلید شماره ${idx}:`, err.message);

      const status = err.response?.status || 0;
      if (status === 429 || err.message.includes('429')) {
        keyState[idx].cooldownUntil = Date.now() + 60 * 60 * 1000;
        console.log(`⏸️ کلید شماره ${idx} در حالت cooldown قرار گرفت (429).`);
      } else if (status === 403 || err.message.includes('403')) {
        keyState[idx].cooldownUntil = Date.now() + 24 * 60 * 60 * 1000;
        console.warn(`🚫 کلید شماره ${idx} غیرفعال شد (403).`);
      }

      triedKeys++;
      if (triedKeys >= totalKeys) {
        console.log('🔁 همه کلیدها امتحان شدند، شروع دوباره از اول بدون توقف...');
        triedKeys = 0;
        apiKeyIndex = 0;
      }
      continue;
    }
  }
}


// =====================
// 📌 مسیر POST
// =====================
router.post('/', (req, res, next) => {
  const clientKey = req.headers['x-api-key'];
  console.log(`📩 درخواست POST دریافت شد - IP: ${req.ip}, x-api-key: ${clientKey ? '✔️ موجود' : '❌ ندارد'}`);

  if (!clientKey || clientKey !== PRIVATE_KEY) {
    console.warn('⚠️ کلید خصوصی معتبر نیست.');
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const { text } = req.body;
  if (!text || typeof text !== 'string' || text.trim() === '') {
    console.warn('⚠️ متن نامعتبر است.');
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
