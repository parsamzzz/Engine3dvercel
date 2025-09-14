import express from 'express';
import { GoogleGenAI, Modality } from '@google/genai';

const router = express.Router();

// 🔐 کلیدهای API گوگل
const API_KEYS = [


'AIzaSyB20bDSlzPbJVkVJf1_ogIbline3gB32LQ',
'AIzaSyA73WazXgApiGxxNIUkNLS6HH58FwnytlY',
'AIzaSyBn1Fm_OtU0cWxo4MkpnrDyBJn9HXlwABQ',
'AIzaSyDGBqiqsW9U1mivsAwh5vMU0ZARP8E-uvM',
'AIzaSyCa_2ERS8aAM5pKFa1xOhwsyJ_IpXxmEdU',
'AIzaSyB-bI0yLJG7U5jtBRpYqMsSZdvwkWpHcSE',
'AIzaSyCvPUJ7zLFWJIzVw9UD3voAY9FJXTXAcD4'




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

    const { text, multiSpeaker, voiceName } = req.body;
    // text: رشته متنی برای تبدیل به صدا
    // multiSpeaker: آرایه یا آبجکت برای چند گوینده (اختیاری)
    // voiceName: نام صدای انتخاب شده برای حالت تک‌گوینده (اختیاری)

    if (!text || typeof text !== 'string' || text.trim() === '') {
      return res.status(400).json({ error: 'text معتبر نیست.' });
    }

    const totalKeys = API_KEYS.length;

    for (let i = 0; i < totalKeys; i++) {
      const currentKeyIndex = (apiKeyIndex + i) % totalKeys;
      const key = API_KEYS[currentKeyIndex];

      try {
        const ai = new GoogleGenAI({ apiKey: key });

        let speechConfig = {};

        if (multiSpeaker && Array.isArray(multiSpeaker) && multiSpeaker.length > 0) {
          // حالت چندگوینده
          speechConfig = {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: multiSpeaker.map(({ speaker, voiceName }) => ({
                speaker,
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: voiceName || 'Kore',
                  },
                },
              })),
            },
          };
        } else {
          // حالت تک‌گوینده: استفاده از voiceName ارسالی یا پیش‌فرض 'Kore'
          speechConfig = {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voiceName || 'Kore',
              },
            },
          };
        }

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-preview-tts',
          contents: [{ parts: [{ text }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig,
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
