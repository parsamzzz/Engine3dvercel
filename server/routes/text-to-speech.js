import express from 'express';
import { GoogleGenAI, Modality } from '@google/genai';
import dotenv from 'dotenv';

// بارگذاری متغیرهای محیطی از فایل .env
dotenv.config();

const router = express.Router();

// =====================
// 🔑 کلید API از متغیر محیطی
// =====================
const API_KEY = process.env.GOOGLE_API_KEY;

// =====================
// 🛡 کلید خصوصی کلاینت
// =====================
const PRIVATE_KEY = process.env.CLIENT_PRIVATE_KEY;

// =====================
// ⏳ صف + کنترل همزمانی
// =====================
const requestQueue = [];
let activeCount = 0;
const MAX_CONCURRENT = 1;  // فقط یک درخواست همزمان ارسال می‌شود

// =====================
// ⏱ Rate Limit (یک درخواست در هر ثانیه)
// =====================

function processQueue() {
  if (requestQueue.length === 0) return;

  const { req, res, next } = requestQueue.shift();
  activeCount++;

  // ارسال درخواست بعدی پس از 1 ثانیه
  setTimeout(async () => {
    try {
      await handleRequest(req, res, next);
    } catch (err) {
      next(err);
    } finally {
      activeCount--;
      processQueue(); // پردازش درخواست‌های بعدی
    }
  }, 1000); // تأخیر 1 ثانیه برای درخواست بعدی
}

// =====================
// 🔊 هَندل اصلی تولید صوت
// =====================
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
        voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' } }
      };
    }

    const ai = new GoogleGenAI({ apiKey: API_KEY });

    console.log("🚀 ارسال درخواست به Gemini...");

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ parts: [{ text }] }],  // متن درخواست
      config: { responseModalities: [Modality.AUDIO], speechConfig }
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    const audioPart = parts.find(part => part.inlineData?.mimeType?.startsWith('audio/'));

    if (!audioPart) {
      console.warn("⚠️ صوتی تولید نشد!");
      return res.status(500).json({ error: "صوت تولید نشد." });
    }

    console.log("✅ صوت تولید شد.");
    return res.json({
      base64: audioPart.inlineData.data,
      mimeType: audioPart.inlineData.mimeType
    });

  } catch (err) {
    console.error("❌ خطا در TTS:", err.message);
    return res.status(500).json({ error: "خطا در تولید صوت." });
  }
}

// =====================
// 📌 مسیر POST
// =====================
router.post('/', (req, res, next) => {
  const clientKey = req.headers['x-api-key'];

  if (!clientKey || clientKey !== PRIVATE_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const { text } = req.body;

  if (!text || typeof text !== 'string' || text.trim() === '') {
    return res.status(400).json({ error: 'text معتبر نیست.' });
  }

  // اضافه کردن درخواست به صف
  requestQueue.push({ req, res, next });

  // شروع پردازش صف
  processQueue();
});

// =====================
// 📌 هندل خطا
// =====================
router.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err);
  res.status(500).json({ error: 'خطای سرور.' });
});

export default router;
