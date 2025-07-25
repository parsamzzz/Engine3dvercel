import express from 'express';
import multer from 'multer';
import mime from 'mime-types';
import { GoogleGenAI, Modality } from '@google/genai';

const router = express.Router();
const upload = multer();

// 🔐 کلیدهای ثابت و امنیتی
const API_KEYS = [
 'AIzaSyD7wbXAYoSYD0WGg8-6IZOhKyfSym00g7g',
  'AIzaSyCGcnePSQRL6PUC0zrE3z3NBQEdAWuWIVE',
  'AIzaSyAYnfzx1_3UiyE-jyfLpO4i2zrcM0USUoA',
  'AIzaSyAzweAy_UzoquW2EMJ7n6mzSe-EUQZ7GCk',
  'AIzaSyCy54Aij_7FQullxvbGlHb_JspAdkQCvGs',
  'AIzaSyAXGxErlDP7gEZ5nWCxDl3V0Tu5Poo6AzQ',
  'AIzaSyDWxlokRrSIMBlup0FA8JOCDCpYsJma7VY',
  'AIzaSyCfX1d9Xr0M7BiDyzwIxy5f3oVJqO__n9Y',
  'AIzaSyARk8SUMKga6uXMt6v-FWtGdlo6arfgtUM',
  'AIzaSyCTvLkv3OLTNrs2oM3aLojfcH-OqxGpoLU',
  'AIzaSyDMSd0-yTpoYUEJqa2K6rpMhS9I1p0nLcQ',
  'AIzaSyDqXmdk8a3euOrvH-FTsSmUA0BP6wfPPIk',
  'AIzaSyBD5V0Y0BYKFUIFvbnmi46IFuh5y-ibSdA',
];

const PRIVATE_KEY = 'threedify_7Vg5NqXk29Lz3MwYcPfBTr84sD';

let apiKeyIndex = 0;

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
    const totalKeys = API_KEYS.length;

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
        // برو سراغ کلید بعدی
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
