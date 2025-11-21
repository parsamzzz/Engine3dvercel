import express from "express";
import { GoogleGenAI, Modality } from "@google/genai";

const router = express.Router();

// =====================
// 🔑 همه کلیدها
// =====================
const API_KEYS = [
  "AIzaSyDGLCzb_cDVbhowANVZ8ySkdTseJlJeJ64",
  "AIzaSyD6Q2B2L5ovpsye8sGHGkvUSIWoJMX7zZE",
  "AIzaSyAspaEaYEGPTun96FGL5pfbBPUD7FhhCBA",
  "AIzaSyBemWdBNZoSYiMUtNR0n7pt0oM6ndAg4Fc",
  "AIzaSyAOd4x9BjJtKNUCrLU-pGMoyemeoTR64aI",
];

// =====================
// 🛡 کلید خصوصی کلاینت
// =====================
const PRIVATE_KEY = "threedify_7Vg5NqXk29Lz3MwYcPfBTr84sD";

// =====================
// 📌 وضعیت کلیدها
// =====================
const ONE_MINUTE = 60 * 1000;
const ONE_DAY = 24 * 60 * 60 * 1000;

const keyState = API_KEYS.map(() => ({
  cooldownUntil: 0,
  inUse: false,

  perMinuteCount: 0,
  perDayCount: 0,

  lastMinuteReset: Date.now(),
  lastDayReset: Date.now(),
}));

let apiKeyIndex = 0;

// =====================
// 📌 دنبال کلید سالم
// =====================
function getNextAvailableKey() {
  const now = Date.now();

  for (let i = 0; i < API_KEYS.length; i++) {
    const idx = (apiKeyIndex + i) % API_KEYS.length;
    const state = keyState[idx];

    // ریست شمارنده دقیقه‌ای
    if (now - state.lastMinuteReset >= ONE_MINUTE) {
      state.perMinuteCount = 0;
      state.lastMinuteReset = now;
    }

    // ریست شمارنده روزانه
    if (now - state.lastDayReset >= ONE_DAY) {
      state.perDayCount = 0;
      state.lastDayReset = now;
    }

    // محدودیت‌ها
    if (state.perMinuteCount >= 3) continue;
    if (state.perDayCount >= 15) continue;

    // cooldown
    if (now < state.cooldownUntil) continue;

    if (!state.inUse) {
      state.inUse = true;
      state.perMinuteCount++;
      state.perDayCount++;

      apiKeyIndex = (idx + 1) % API_KEYS.length;

      console.log(
        `🔑 کلید ${idx} انتخاب شد | دقیقه: ${state.perMinuteCount}/3 | روز: ${state.perDayCount}/15`
      );

      return { key: API_KEYS[idx], idx };
    }
  }

  return null;
}

// =====================
// 📌 صف درخواست‌ها
// =====================
const requestQueue = [];
let processingQueue = false;

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
// 📌 هندل اصلی درخواست
// =====================
async function handleRequest(req, res, next) {
  const { text, multiSpeaker, voiceName } = req.body;

  let tries = 0;

  while (tries < API_KEYS.length) {
    const keyData = getNextAvailableKey();

    if (!keyData) {
      await new Promise((r) => setTimeout(r, 200));
      continue;
    }

    const { key, idx } = keyData;

    try {
      let speechConfig = {};

      if (Array.isArray(multiSpeaker) && multiSpeaker.length > 0) {
        speechConfig = {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: multiSpeaker.map(({ speaker, voiceName }) => ({
              speaker,
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voiceName || "Kore" },
              },
            })),
          },
        };
      } else {
        speechConfig = {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName || "Kore" },
          },
        };
      }

      const ai = new GoogleGenAI({ apiKey: key });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: { responseModalities: [Modality.AUDIO], speechConfig },
      });

      const parts = response.candidates?.[0]?.content?.parts || [];
      const audioPart = parts.find((p) =>
        p.inlineData?.mimeType?.startsWith("audio/")
      );

      keyState[idx].inUse = false;

      if (!audioPart) {
        return res.json({ message: "صوتی تولید نشد", parts });
      }

      return res.json({
        base64: audioPart.inlineData.data,
        mimeType: audioPart.inlineData.mimeType,
      });
    } catch (err) {
      keyState[idx].inUse = false;

      const status = err.response?.status || 0;

      if (status === 429) {
        keyState[idx].cooldownUntil = Date.now() + ONE_MINUTE;
        tries++;
        continue;
      }

      if (status === 400 || status === 403) {
        keyState[idx].cooldownUntil = Date.now() + ONE_DAY;
        tries++;
        continue;
      }

      return next(err);
    }
  }

  return res.status(503).json({ error: "هیچ کلید سالمی پیدا نشد." });
}

// =====================
// 📌 مسیر POST
// =====================
router.post("/", (req, res, next) => {
  const clientKey = req.headers["x-api-key"];

  if (!clientKey || clientKey !== PRIVATE_KEY) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const { text } = req.body;
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "text معتبر نیست" });
  }

  requestQueue.push({ req, res, next });
  processQueue();
});

// مدیریت خطا
router.use((err, req, res) => {
  res.status(500).json({ error: "خطای سرور" });
});

export default router;
