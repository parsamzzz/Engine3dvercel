import express from 'express';
import { GoogleGenAI, Modality } from '@google/genai';

const router = express.Router();

// =====================
// 🔑 همه کلیدها
// =====================
const API_KEYS = [
  "AIzaSyCMmOaJFfHY2PnvNe2jAJ8gLb8ToFQxUMc",
  "AIzaSyC2Z4aD2ZSlpHem3BzA5u7GX8nM-Py5abw",
  "AIzaSyAkjVmUTeXK0Jnvg4sm6xOZZu6l2z9cEEw",
  "AIzaSyBZ_2Zu7xS4_4o2nOWmgTgrYWb6uwl_jDI",
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
      console.log(`🔑 کلید انتخاب شد: ${keyState[idx] ? idx : 'نامشخص'} - ${API_KEYS[idx].substring(0, 10)}...`);
      return { key: API_KEYS[idx], idx };
    }
  }
  console.warn('⚠️ هیچ کلید آزاد در دسترس نیست، در صف منتظر مانده‌ایم.');
  return null;
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
async function handleRequest(req, res, next) {
  const { text, multiSpeaker, voiceName } = req.body;
  const totalKeys = API_KEYS.length;
  let triedKeys = 0;

  while (triedKeys < totalKeys) {
    const keyData = getNextAvailableKey();
    if (!keyData) {
      console.log('⏳ صبر برای کلید آزاد...');
      await new Promise(r => setTimeout(r, 100)); // کمی صبر کن و دوباره امتحان کن
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
        console.log(`✅ موفقیت: صوت تولید شد با کلید شماره ${idx}`);
        return res.json({ base64: audioPart.inlineData.data, mimeType: audioPart.inlineData.mimeType });
      } else {
        console.warn(`⚠️ صوتی تولید نشد با کلید شماره ${idx}`);
        return res.status(200).json({ message: 'صوتی تولید نشد.', parts });
      }

 } catch (err) {
  keyState[idx].inUse = false;
  console.error(`❌ خطا با کلید شماره ${idx}:`, err.message);

  const status = err.response?.status || 0;

  // هندل 429 - محدودیت نرخ
  if (status === 429 || err.message.includes('429')) {
    keyState[idx].cooldownUntil = Date.now() + 60 * 60 * 1000; // 1 ساعت
    console.log(`⏸️ کلید شماره ${idx} در حالت cooldown قرار گرفت (429).`);
    triedKeys++;
    continue;
  }

  if (status === 403 || err.message.includes('403')) {
    keyState[idx].cooldownUntil = Date.now() + 24 * 60 * 60 * 1000; 
    console.warn(`🚫 کلید شماره ${idx} غیرفعال شد (403). کلید بعدی امتحان می‌شود.`);
    triedKeys++;
    continue;
  }

 
  return next(err);
}

  }

  console.error('❌ هیچ‌کدام از کلیدها موفق نشد.');
  res.status(503).json({ error: 'هیچ‌کدام از کلیدها موفق نشد.' });
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

// مدیریت خطا
router.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err);
  res.status(500).json({ error: 'خطای سرور.' });
});

export default router;
