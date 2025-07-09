import express from 'express';
import { GoogleGenAI, Modality } from '@google/genai';

const router = express.Router();

// 🔐 کلیدهای API گوگل
const API_KEYS = [
  'AIzaSyD7wbXAYoSYD0WGg8-6IZOhKyfSym00g7g',
  'AIzaSyAmDnnMUYcv6QMt-fhF0YHdRzD4x2qDwqg',
  'AIzaSyCGcnePSQRL6PUC0zrE3z3NBQEdAWuWIVE',
  'AIzaSyAYnfzx1_3UiyE-jyfLpO4i2zrcM0USUoA',
];

// 🛡 کلید خصوصی کلاینت
const PRIVATE_KEY = 'threedify_7Vg5NqXk29Lz3MwYcPfBTr84sD';
let apiKeyIndex = 0;

router.post('/', async (req, res, next) => {
  try {
    const clientKey = req.headers['x-api-key'];
    if (!clientKey || clientKey !== PRIVATE_KEY) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { text } = req.body;
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return res.status(400).json({ error: 'text معتبر نیست.' });
    }

    const totalKeys = API_KEYS.length;

    for (let i = 0; i < totalKeys; i++) {
      const currentKeyIndex = (apiKeyIndex + i) % totalKeys;
      const key = API_KEYS[currentKeyIndex];

      try {
        const ai = new GoogleGenAI({ apiKey: key });

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-preview-tts',
          contents: [{ parts: [{ text }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: 'Kore' // فعلاً فقط انگلیسی
                }
              }
            }
          },
        });

        const parts = response.candidates?.[0]?.content?.parts || [];
        const audioPart = parts.find(part => part.inlineData?.mimeType?.startsWith('audio/'));

        if (audioPart?.inlineData?.data) {
          const base64 = audioPart.inlineData.data;
          const mimeType = audioPart.inlineData.mimeType;

          apiKeyIndex = (currentKeyIndex + 1) % totalKeys;

          console.log(`✅ صوت تولید شد با کلید: ${key.substring(0, 10)}...`);
          return res.json({ base64, mimeType });
        } else {
          console.warn('⚠️ صوتی در پاسخ Gemini پیدا نشد.');
          return res.status(200).json({ message: 'صوتی تولید نشد.', parts });
        }
      } catch (err) {
        console.error(`❌ خطا با کلید ${key.substring(0, 15)}:`, err.message);
      }
    }

    res.status(500).json({ error: 'هیچ‌کدام از کلیدها موفق نشد.' });
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
