import express from 'express';
import multer from 'multer';
import mime from 'mime-types';
import { GoogleGenAI, Modality } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const upload = multer();

// =====================
// 🔑 کلیدها از .env
// =====================
const API_KEY = process.env.GOOGLE_GENAI_KEY;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// =====================
// محدودیت‌های Gemini 2.5 Flash Image 🍌
// =====================
const RPM_LIMIT = 500;       // Requests per minute
const RPD_LIMIT = 2000;      // Requests per day

let requestsThisMinute = 0;
let requestsToday = 0;

// ریست شمارنده دقیقه‌ای هر دقیقه
setInterval(() => {
  requestsThisMinute = 0;
}, 60 * 1000);

// ریست شمارنده روزانه هر نیمه شب Pacific Time
function resetDailyCounter() {
  const now = new Date();
  const nextReset = new Date(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    8, 0, 0, 0 // midnight PT = UTC 08:00
  );
  if (now > nextReset) nextReset.setUTCDate(nextReset.getUTCDate() + 1);
  setTimeout(() => {
    requestsToday = 0;
    resetDailyCounter();
  }, nextReset - now);
}
resetDailyCounter();

// =====================
// پردازش درخواست با لاگ کامل
// =====================
async function handleRequest(req, res, next) {
  const { prompt, aspectRatio } = req.body;
  const file = req.file;
  const base64Image = file.buffer.toString('base64');
  const mimeType = mime.lookup(file.originalname) || file.mimetype;

  console.info(`🔹 پردازش درخواست جدید. prompt: "${prompt.substring(0, 50)}..."`);
  console.info(`🗝️ استفاده از کلید: ${API_KEY.substring(0, 10)}...`);

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });

    const config = { responseModalities: [Modality.IMAGE, Modality.TEXT] };
    if (aspectRatio) {
      config.imageConfig = { aspectRatio };
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [
        { text: prompt },
        { inlineData: { mimeType, data: base64Image } }
      ],
      config
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find(p => p.inlineData?.mimeType?.startsWith('image/'));

    if (imagePart?.inlineData?.data) {
      console.log(`✅ تصویر تولید شد.`);
      return res.json({ base64: imagePart.inlineData.data, mimeType: imagePart.inlineData.mimeType });
    } else {
      console.warn('⚠️ تصویری در پاسخ Gemini پیدا نشد.');
      return res.status(200).json({ message: 'درخواست پردازش شد، اما تصویری تولید نشد.', parts });
    }
  } catch (err) {
    console.error('❌ خطا در پردازش:', err.message);
    return next(err);
  }
}

// =====================
// مسیر POST با محدودیت RPM و RPD
// =====================
router.post('/', upload.single('image'), async (req, res, next) => {
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

  // کنترل RPM
  if (requestsThisMinute >= RPM_LIMIT) {
    console.warn('⚠️ سقف درخواست‌های دقیقه‌ای Gemini 2.5 Flash Image پر شد.');
    return res.status(429).json({ error: '⛔ تعداد درخواست‌های دقیقه‌ای بیش از حد مجاز است، لطفاً کمی صبر کنید.' });
  }

  // کنترل RPD
  if (requestsToday >= RPD_LIMIT) {
    console.warn('⚠️ سقف درخواست‌های روزانه Gemini 2.5 Flash Image پر شد.');
    return res.status(429).json({ error: '⛔ تعداد درخواست‌های روزانه بیش از حد مجاز است.' });
  }

  requestsThisMinute++;
  requestsToday++;

  await handleRequest(req, res, next);
});

// Middleware مدیریت خطا
router.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'خطای سرور رخ داده است.' });
});

export default router;
