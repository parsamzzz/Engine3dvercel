import express from 'express';
import multer from 'multer';
import mime from 'mime-types';
import { GoogleGenAI, Modality } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config(); // بارگذاری متغیرهای محیطی

const router = express.Router();
const upload = multer();

// =====================
// 🔑 کلید از .env
// =====================
const API_KEY = process.env.GOOGLE_GENAI_KEY;

// =====================
// 🛡 کلید خصوصی کلاینت
// =====================
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// =====================
// وضعیت کلید و صف
// =====================
let processingQueue = false;
const requestQueue = [];

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

  console.info(`🔹 پردازش درخواست جدید. prompt: "${prompt.substring(0, 50)}..."`);
  console.info(`🗝️ استفاده از کلید: ${API_KEY.substring(0, 10)}...`);

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: [
        { text: prompt },
        { inlineData: { mimeType, data: base64Image } }
      ],
      config: { responseModalities: [Modality.TEXT, Modality.IMAGE] }
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find(p => p.inlineData?.mimeType?.startsWith('image/'));

    if (imagePart?.inlineData?.data) {
      console.log(`✅ عکس به عکس تولید شد.`);
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
