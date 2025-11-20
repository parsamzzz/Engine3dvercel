import express from 'express';
import { GoogleGenAI, Modality } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

// فقط یک کلید از env
const API_KEY = process.env.GEMINI_TTS_KEY;

// کلید خصوصی
const PRIVATE_KEY = process.env.CLIENT_PRIVATE_KEY;

// صف درخواست‌ها
const requestQueue = [];
let processing = false;

// =======================
// پردازش صف هر 2 ثانیه
// =======================
setInterval(async () => {
  if (processing) return;
  if (requestQueue.length === 0) return;

  const { req, res, next } = requestQueue.shift();
  processing = true;

  try {
    await handleRequest(req, res, next);
  } catch (err) {
    next(err);
  }

  processing = false;
}, 2000); // هر دو ثانیه دقیقاً یک درخواست

// =======================
// تابع اصلی درخواست
// =======================
async function handleRequest(req, res, next) {
  const { text, multiSpeaker, voiceName } = req.body;

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
      speechConfig = {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' }
        }
      };
    }

    const ai = new GoogleGenAI({ apiKey: API_KEY });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ parts: [{ text }] }],
      config: { responseModalities: [Modality.AUDIO], speechConfig }
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    const audioPart = parts.find(p => p.inlineData?.mimeType?.startsWith('audio/'));

    if (!audioPart) {
      return res.status(500).json({ error: 'Audio generation failed' });
    }

    return res.json({
      base64: audioPart.inlineData.data,
      mimeType: audioPart.inlineData.mimeType
    });

  } catch (err) {
    console.error('❌ Gemini Error:', err);
    return res.status(500).json({ error: 'Gemini request failed' });
  }
}

// =======================
// مسیر POST
// =======================
router.post('/', (req, res, next) => {
  const clientKey = req.headers['x-api-key'];

  if (!clientKey || clientKey !== PRIVATE_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const { text } = req.body;

  if (!text || typeof text !== 'string' || text.trim() === '') {
    return res.status(400).json({ error: 'text معتبر نیست.' });
  }

  requestQueue.push({ req, res, next });
});

// =======================
// هندل خطا
// =======================
router.use((err, req, res, next) => {
  console.error('💥 Internal error:', err);
  res.status(500).json({ error: 'Server error' });
});

export default router;
