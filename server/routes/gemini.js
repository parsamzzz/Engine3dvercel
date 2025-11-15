import express from 'express';
import multer from 'multer';
import mime from 'mime-types';
import { GoogleGenAI, Modality } from '@google/genai';

const router = express.Router();
const upload = multer();

// =====================
// 🔑 یک کلید API
// =====================
const API_KEY = 'AIzaSyCVdYG2qcU7VJVbMNxUipRiC5HcBl-41ew';

// 🛡 کلید خصوصی کلاینت
const PRIVATE_KEY = 'threedify_7Vg5NqXk29Lz3MwYcPfBTr84sD';

// صف و مدیریت همزمانی
const requestQueue = [];
const MAX_CONCURRENT = 3;
let activeRequests = 0;

// =====================
// مدیریت صف با سقف ۳ درخواست
// =====================
function runNext() {
  if (activeRequests >= MAX_CONCURRENT) return;

  const job = requestQueue.shift();
  if (!job) return;

  activeRequests++;
  const { req, res, next } = job;

  handleRequest(req, res, next)
    .catch(err => next(err))
    .finally(() => {
      activeRequests--;
      runNext();
    });
}

// =====================
// پردازش درخواست
// =====================
async function handleRequest(req, res, next) {
  const { prompt } = req.body;
  const file = req.file;

  const base64Image = file.buffer.toString('base64');
  const mimeType = mime.lookup(file.originalname) || file.mimetype;

  console.info(`🔹 پردازش درخواست جدید. prompt: "${prompt.substring(0, 50)}..."`);

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [
        { text: prompt },
        { inlineData: { mimeType, data: base64Image } }
      ],
      config: { responseModalities: [Modality.TEXT, Modality.IMAGE] }
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find(p => p.inlineData?.mimeType?.startsWith('image/'));

    if (imagePart?.inlineData?.data) {
      console.log('✅ عکس به عکس تولید شد.');
      return res.json({
        base64: imagePart.inlineData.data,
        mimeType: imagePart.inlineData.mimeType
      });
    } else {
      console.warn('⚠️ تصویری در پاسخ Gemini پیدا نشد.');
      return res
        .status(200)
        .json({ message: 'درخواست پردازش شد، اما تصویری تولید نشد.', parts });
    }
  } catch (err) {
    console.error('❌ خطا از Gemini:', err.message);

    const status = err.response?.status || 0;

    if (status === 429) {
      console.warn('⚠️ 429 از Gemini دریافت شد (ریتم بالا).');
      return res
        .status(429)
        .json({ error: 'سرور شلوغ است، لطفاً کمی بعد دوباره تلاش کنید.' });
    }

    if (status === 400) {
      return res.status(400).json({ error: 'درخواست نامعتبر به سرویس ارسال شده است.' });
    }

    if (status === 403) {
      return res.status(403).json({ error: 'دسترسی به سرویس مسدود شده است.' });
    }

    return next(err);
  }
}

// =====================
// مسیر POST
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
  runNext();
});

// Middleware مدیریت خطا
router.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'خطای سرور رخ داده است.' });
});

export default router;
