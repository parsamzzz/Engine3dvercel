import express from 'express';
import multer from 'multer';
import mime from 'mime-types';
import dotenv from 'dotenv';
import { GoogleGenAI, Modality } from '@google/genai';

dotenv.config();

const router = express.Router();
const upload = multer();

const API_KEYS = process.env.GEMINI_API_KEYS?.split(',').map(k => k.trim()) || [];
const PRIVATE_KEY = process.env.PRIVATE_API_KEY;

let apiKeyIndex = 0; // برای چرخش کلیدها

router.post('/', upload.single('image'), async (req, res, next) => {
  try {
    const clientKey = req.headers['x-api-key'];
    if (!clientKey || clientKey !== PRIVATE_KEY) {
      console.warn('🛑 دسترسی غیرمجاز.');
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const prompt = req.body.prompt;
    const file = req.file;
    const imageBuffer = file?.buffer;
    const originalName = file?.originalname;

    if (!prompt || !imageBuffer || !originalName) {
      return res.status(400).json({ error: 'prompt یا تصویر ارسال نشده.' });
    }

    const mimeType = mime.lookup(originalName) || file.mimetype;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
      return res.status(415).json({ error: 'فرمت تصویر پشتیبانی نمی‌شود.' });
    }

    const base64Image = imageBuffer.toString('base64');

    // تعداد کلیدها
    const totalKeys = API_KEYS.length;
    if (totalKeys === 0) {
      return res.status(500).json({ error: 'کلید API موجود نیست.' });
    }

    // شروع از ایندکس فعلی، تا کلیدها رو یک بار چک کنیم
    for (let i = 0; i < totalKeys; i++) {
      const currentKeyIndex = (apiKeyIndex + i) % totalKeys;
      const key = API_KEYS[currentKeyIndex];

      try {
        const ai = new GoogleGenAI({ apiKey: key });

        const response = await ai.models.generateContent({
          model: 'gemini-2.0-flash-preview-image-generation',
          contents: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: base64Image,
              },
            },
          ],
          config: {
            responseModalities: [Modality.TEXT, Modality.IMAGE],
          },
        });

        const parts = response.candidates?.[0]?.content?.parts || [];
        const imagePart = parts.find(part =>
          part.inlineData?.mimeType?.startsWith('image/')
        );

        if (imagePart && imagePart.inlineData?.data) {
          const base64 = imagePart.inlineData.data;
          console.log(`✅ تصویر تولید شد با کلید: ${key.substring(0, 10)}...`);

          // به‌روزرسانی apiKeyIndex به کلید بعدی برای درخواست بعدی
          apiKeyIndex = (currentKeyIndex + 1) % totalKeys;

          return res.json({ base64 });
        } else {
          console.warn('⚠️ تصویری در پاسخ Gemini پیدا نشد.');
          return res.status(200).json({
            message: 'درخواست با موفقیت پردازش شد، اما تصویری تولید نشد.',
            parts,
          });
        }
      } catch (err) {
        console.error(`❌ Key ${key.substring(0, 15)}... با خطا مواجه شد:`, err.message);
        if (err.response?.data?.error?.message) {
          console.error('جزئیات خطای API:', err.response.data.error.message);
        }
        // خطا رو بخون ولی تلاش کن با کلید بعدی ادامه بدی
      }
    }

    res.status(500).json({ error: 'هیچ‌کدام از کلیدهای Gemini موفق نبودند یا تصویری تولید نشد.' });
  } catch (err) {
    next(err);
  }
});

// Middleware مدیریت خطا
router.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'خطای سرور رخ داده است.' });
});

export default router;
