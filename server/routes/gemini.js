import express from 'express';
import multer from 'multer';
import mime from 'mime-types';
import { GoogleGenAI, Modality } from '@google/genai';

const router = express.Router();
const upload = multer();

// =====================
// 🔑 همه کلیدها
// =====================
const API_KEYS = [
 "AIzaSyCVdYG2qcU7VJVbMNxUipRiC5HcBl-41ew"

];


// =====================
// 🛡 کلید خصوصی کلاینت
// =====================
const PRIVATE_KEY = 'threedify_7Vg5NqXk29Lz3MwYcPfBTr84sD';

// وضعیت کلیدها و صف
const keyState = API_KEYS.map(() => ({ cooldownUntil: 0, inUse: false }));
let apiKeyIndex = 0;
const requestQueue = [];
let processingQueue = false;

// =====================
// انتخاب کلید سالم
// =====================
function getNextAvailableKey() {
  const totalKeys = API_KEYS.length;
  for (let i = 0; i < totalKeys; i++) {
    const idx = (apiKeyIndex + i) % totalKeys;
    const state = keyState[idx];
    if (!state.inUse && Date.now() > state.cooldownUntil) {
      apiKeyIndex = (idx + 1) % totalKeys;
      state.inUse = true;
      return { key: API_KEYS[idx], idx };
    }
  }
  return null;
}

// =====================
// پردازش صف
// =====================
async function processQueue() {
  if (processingQueue) return;
  processingQueue = true;

  while (requestQueue.length > 0) {
    const { req, res, next } = requestQueue.shift();
    try {
      await handleRequest(req, res, next);
    } catch (err) {
      next(err);
    }
  }

  processingQueue = false;
}

// =====================
// پردازش درخواست با لاگ کامل
// =====================
async function handleRequest(req, res, next) {
  const { prompt } = req.body;
  const file = req.file;
  const base64Image = file.buffer.toString('base64');
  const mimeType = mime.lookup(file.originalname) || file.mimetype;
  const totalKeys = API_KEYS.length;
  let triedKeys = 0;

  console.info(`🔹 پردازش درخواست جدید. prompt: "${prompt.substring(0, 50)}..."`);

  while (triedKeys < totalKeys) {
    const keyData = getNextAvailableKey();
    if (!keyData) {
      console.warn('⏳ هیچ کلید فعالی در دسترس نیست، کمی صبر می‌کنیم...');
      await new Promise(r => setTimeout(r, 100));
      continue;
    }

    const { key, idx } = keyData;
    console.info(`🗝️ استفاده از کلید: ${key.substring(0, 10)}...`);

    try {
      const ai = new GoogleGenAI({ apiKey: key });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-09-2025',
        contents: [
          { text: prompt },
          { inlineData: { mimeType, data: base64Image } }
        ],
        config: { responseModalities: [Modality.TEXT, Modality.IMAGE] }
      });

      const parts = response.candidates?.[0]?.content?.parts || [];
      const imagePart = parts.find(p => p.inlineData?.mimeType?.startsWith('image/'));
      keyState[idx].inUse = false;

      if (imagePart?.inlineData?.data) {
        console.log(`✅ عکس به عکس تولید شد با کلید: ${key.substring(0, 10)}...`);
        return res.json({ base64: imagePart.inlineData.data, mimeType: imagePart.inlineData.mimeType });
      } else {
        console.warn('⚠️ تصویری در پاسخ Gemini پیدا نشد.');
        return res.status(200).json({ message: 'درخواست پردازش شد، اما تصویری تولید نشد.', parts });
      }
    } catch (err) {
      keyState[idx].inUse = false;
      console.error(`❌ خطا در کلید ${key.substring(0, 15)}...:`, err.message);

      if (err.response?.data?.error?.message) {
        console.error('جزئیات خطای API:', err.response.data.error.message);
      }

      const status = err.response?.status || 0;

      if (status === 429 || err.message.includes('429')) {
        keyState[idx].cooldownUntil = Date.now() + 60 * 60 * 1000; 
        console.warn(`⏳ کلید ${key.substring(0, 10)}... در حالت cooldown قرار گرفت (429).`);
        triedKeys++;
        continue;
      }

      if (status === 403 || err.message.includes('403')) {
        keyState[idx].cooldownUntil = Date.now() + 24 * 60 * 60 * 1000;
        console.warn(`🚫 کلید ${key.substring(0, 10)}... غیرفعال شد (403). کلید بعدی امتحان می‌شود.`);
        triedKeys++;
        continue;
      }

      if (status === 400 || err.message.includes('400')) {
        console.warn(`⚠️ خطای 400 برای کلید ${key.substring(0, 10)}... کلید بعدی امتحان می‌شود.`);
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
// مسیر POST با لاگ
// =====================
router.post('/', upload.single('image'), (req, res, next) => {
  const clientKey = req.headers['x-api-key'];
  if (!clientKey || clientKey !== PRIVATE_KEY) {
    console.warn('🛑 دسترسی غیرمجاز.');
    return res.status(403).json({ error: '⛔ دسترسی غیرمجاز.' });
  }

  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    console.warn('⚠️ prompt معتبر نیست.');
    return res.status(400).json({ error: '⛔ prompt معتبر نیست.' });
  }

  if (!req.file) {
    console.warn('⚠️ تصویر آپلود نشده است.');
    return res.status(400).json({ error: '⛔ تصویر آپلود نشده است.' });
  }

  console.info('➡️ درخواست به صف اضافه شد.');
  requestQueue.push({ req, res, next });
  processQueue();
});

// Middleware مدیریت خطا
router.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'خطای سرور رخ داده است.' });
});

export default router;
