import express from "express";
import { GoogleGenAI, Modality } from "@google/genai";

const router = express.Router();

// =====================
// 🔑 همه کلیدها
// =====================
const API_KEYS = [
"AIzaSyBezHhMVODg9hkM02G8LXpscHGIJiLgHP0",
"AIzaSyCu5KP7sIpHN9A_eLyLtstzf9QVINYJ8yk",
"AIzaSyBjdKkKKnlmqR0kfMHcVDH7EwbTdvIeigY",
"AIzaSyBf_hnGW5H-E1BiDDn9lRmGUHjKVZddl20",
"AIzaSyDDpxCOLaiFQsY56azB8v-A7NxyG8eqIvo",
"AIzaSyDUXFfidP9vFNITha_8NDQOeC57r0MVmLg",
"AIzaSyB1Rj-6FDSfwJ7qdKOEjNkstmb0sSR_wbU",
"AIzaSyAkDVINliJQxW2HLtGSfG3yRBYufHSsWkw",
"AIzaSyC9NeOK5hZCK3q4nH9NivmSgn9coNppsMw",
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
// 📌 انتخاب کلید
// =====================
function getNextAvailableKey() {
  const now = Date.now();

  for (let i = 0; i < API_KEYS.length; i++) {
    const idx = (apiKeyIndex + i) % API_KEYS.length;
    const state = keyState[idx];

    if (now - state.lastMinuteReset >= ONE_MINUTE) {
      state.perMinuteCount = 0;
      state.lastMinuteReset = now;
    }

    if (now - state.lastDayReset >= ONE_DAY) {
      state.perDayCount = 0;
      state.lastDayReset = now;
    }

    if (state.perMinuteCount >= 3) continue;
    if (state.perDayCount >= 15) continue;

    if (now < state.cooldownUntil) continue;

    if (!state.inUse) {
      state.inUse = true;
      state.perMinuteCount++;
      state.perDayCount++;

      apiKeyIndex = (idx + 1) % API_KEYS.length;

      console.log(
        `🔑 کلید ${idx} انتخاب شد | min=${state.perMinuteCount}/3 | day=${state.perDayCount}/15`
      );

      return { key: API_KEYS[idx], idx };
    }
  }

  console.log("❌ هیچ کلید آزاد وجود ندارد!");
  return null;
}

// =====================
// 📌 صف
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
// 📌 هندل اصلی
// =====================
// =====================
// شمارنده صوت موفق 24 ساعته
// =====================
let successfulAudioCount = 0;
let lastResetTime = Date.now();

function resetDailyCounterIfNeeded() {
  const now = Date.now();
  if (now - lastResetTime >= ONE_DAY) {
    successfulAudioCount = 0;
    lastResetTime = now;
  }
}

// =====================
// هندل اصلی
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
      // لاگ متن کامل فقط هنگام ارسال واقعی
      console.log(`🚀 ارسال به Gemini با کلید ${idx} | متن کامل: "${text}"`);

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
        console.log(`⚠️ ناموفق | کلید ${idx} | متن: "${text.slice(0, 200)}"`);
        continue; // سراغ کلید بعدی برو
      }

      // 🔹 ریست شمارنده اگر بیش از 24 ساعت گذشته
      resetDailyCounterIfNeeded();
      successfulAudioCount++;

      // 🔹 لاگ موفقیت با شماره صوت
      console.log(
        `✅ موفق #${successfulAudioCount} | کلید ${idx} | طول صوت: ${audioPart.inlineData.data.length} | متن: "${text.slice(
          0,
          200
        )}"`
      );

      return res.json({
        base64: audioPart.inlineData.data,
        mimeType: audioPart.inlineData.mimeType,
      });
    } catch (err) {
      keyState[idx].inUse = false;

      const status = err.response?.status || 0;

      if (status === 429) {
        keyState[idx].cooldownUntil = Date.now() + ONE_MINUTE;
      } else if (status === 403) {
        keyState[idx].cooldownUntil = Date.now() + ONE_DAY;
      }

      tries++;
      continue;
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

  if (!req.body.text || typeof req.body.text !== "string") {
    return res.status(400).json({ error: "text معتبر نیست" });
  }

  requestQueue.push({ req, res, next });
  processQueue();
});

// مدیریت خطا
router.use((err, req, res) => {
  console.log("💥 خطای سرور:", err.message);
  res.status(500).json({ error: "خطای سرور" });
});

export default router;
