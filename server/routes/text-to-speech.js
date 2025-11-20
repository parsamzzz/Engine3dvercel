import express from 'express';
import { GoogleGenAI, Modality } from '@google/genai';

const router = express.Router();

// =====================
// 🔑 کلید اصلی
// =====================
const API_KEY = process.env.API_KEY || "AIzaSyBKHPvD4LzQMb2YzLkBrcI9JNI1mWfYAuM";


// =====================
// 🛡 کلید خصوصی کلاینت
// =====================
const PRIVATE_KEY = 'threedify_7Vg5NqXk29Lz3MwYcPfBTr84sD';

// =====================
// ⏳ صف + کنترل همزمانی
// =====================
const requestQueue = [];
let activeCount = 0;
const MAX_CONCURRENT = 1;

// =====================
// ⏱ Rate Limit (1 req/sec)
// =====================
let requestTimestamps = [];

function cleanOldRequests() {
  const now = Date.now();
  requestTimestamps = requestTimestamps.filter(ts => now - ts < 1000);
}

function canProceedRateLimit() {
  cleanOldRequests();
  return requestTimestamps.length < 1; // فقط 1 درخواست در هر 1 ثانیه
}

function recordRequest() {
  requestTimestamps.push(Date.now());
}

// =====================
// 🎛 پردازش صف
// =====================
async function processQueue() {
  if (activeCount >= MAX_CONCURRENT) return;
  if (requestQueue.length === 0) return;

  const { req, res, next } = requestQueue.shift();
  activeCount++;

  try {
    await handleRequest(req, res, next);
  } catch (err) {
    next(err);
  } finally {
    activeCount--;
    processQueue();
  }
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
      contents: [{ parts: [{ text }] }],
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

  // --- Rate Limit Check ---
  if (!canProceedRateLimit()) {
    return res.status(429).json({ error: 'Too Many Requests - لطفا 1 ثانیه بعد تلاش کنید.' });
  }

  recordRequest();

  // --- Queue + Concurrency ---
  requestQueue.push({ req, res, next });
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
