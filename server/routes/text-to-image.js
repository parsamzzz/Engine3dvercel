import express from 'express';
import { GoogleGenAI, Modality } from '@google/genai';

const router = express.Router();

// 🔐 کلیدهای Google Gemini
const API_KEYS = [
  'AIzaSyD7wbXAYoSYD0WGg8-6IZOhKyfSym00g7g',
  'AIzaSyAmDnnMUYcv6QMt-fhF0YHdRzD4x2qDwqg',
  'AIzaSyCGcnePSQRL6PUC0zrE3z3NBQEdAWuWIVE',
  'AIzaSyAYnfzx1_3UiyE-jyfLpO4i2zrcM0USUoA',
];

// 🛡 کلید خصوصی سمت کلاینت
const PRIVATE_KEY = 'threedify_7Vg5NqXk29Lz3MwYcPfBTr84sD';

let apiKeyIndex = 0;

router.post('/', async (req, res, next) => {
  try {
    const clientKey = req.headers['x-api-key'];
    if (!clientKey || clientKey !== PRIVATE_KEY) {
      console.warn('🛑 دسترسی غیرمجاز.');
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const prompt = req.body.prompt;
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return res.status(400).json({ error: 'prompt معتبر نیست.' });
    }

    const totalKeys = API_KEYS.length;

    for (let i = 0; i < totalKeys; i++) {
      const currentKeyIndex = (apiKeyIndex + i) % totalKeys;
      const key = API_KEYS[currentKeyIndex];

      try {
        const ai = new GoogleGenAI({ apiKey: key });

        const response = await ai.models.generateContent({
          model: 'gemini-2.0-flash-preview-image-generation',
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          config: {
            responseModalities: [Modality.IMAGE],
          },
        });

        const parts = response.candidates?.[0]?.content?.parts || [];
        const imagePart = parts.find(
          (part) => part.inlineData?.mimeType?.startsWith('image/')
        );

        if (imagePart?.inlineData?.data) {
          const base64 = imagePart.inlineData.data;
          const mimeType = imagePart.inlineData.mimeType;

          console.log(`✅ تصویر تولید شد با کلید: ${key.substring(0, 10)}...`);

          apiKeyIndex = (currentKeyIndex + 1) % totalKeys;

          return res.json({ base64, mimeType });
        } else {
          console.warn('⚠️ تصویری در پاسخ Gemini پیدا نشد.');
          return res.status(200).json({
            message: 'درخواست پردازش شد، اما تصویری تولید نشد.',
            parts,
          });
        }
      } catch (err) {
        console.error(
          `❌ کلید ${key.substring(0, 15)}... با خطا مواجه شد:`,
          err.message
        );
      }
    }

    return res.status(500).json({
      error: 'همه کلیدها با خطا مواجه شدند یا تصویری تولید نشد.',
    });
  } catch (err) {
    next(err);
  }
});

// مدیریت خطا
router.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'خطای سرور.' });
});

export default router;
