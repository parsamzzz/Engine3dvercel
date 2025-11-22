import express from "express";
import { GoogleGenAI, Modality } from "@google/genai";

const router = express.Router();

// =====================
// 🔑 همه کلیدها
// =====================
const API_KEYS = [
"AIzaSyDZcivxyeu_ifFSCBu4r02sqt-gbVw-AdQ",
"AIzaSyDGCk_sjdipWugy4Qy6jgibwRLa1NcIhXY",
"AIzaSyBjYI8jXBlI7MqV0bygEm46--jFggc9t4w",
"AIzaSyAvp1qniK0Kt9_2YrwZ6C2R8UGwI519OsQ",

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

    if (state.perMinuteCount >= 10) continue;
    if (state.perDayCount >= 100) continue;

    if (now < state.cooldownUntil) continue;

    if (!state.inUse) {
      state.inUse = true;
      state.perMinuteCount++;
      state.perDayCount++;

      apiKeyIndex = (idx + 1) % API_KEYS.length;

      console.log(
        `🔑 کلید ${idx} انتخاب شد | min=${state.perMinuteCount}/10 | day=${state.perDayCount}/100`
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
async function handleRequest(req, res, next) {
  const { text, multiSpeaker, voiceName } = req.body;

  let tries = 0;

  while (tries < API_KEYS.length) {
    const keyData = getNextAvailableKey();

    if (!keyData) {
      // اگر هیچ کلید آزاد نبود، کمی صبر کن و دوباره امتحان کن
      await new Promise((r) => setTimeout(r, 200));
      continue;
    }

    const { key, idx } = keyData;
    const state = keyState[idx];

    try {
      console.log(`🚀 ارسال به Gemini با کلید ${idx} | متن کامل: "${text}"`);

      // ------------------------
      // تنظیمات صدا
      // ------------------------
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

      // ------------------------
      // ارسال درخواست به Google Gemini
      // ------------------------
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

      if (!audioPart) {
        console.log(`⚠️ ناموفق | کلید ${idx} | متن: "${text.slice(0, 200)}"`);
        tries++;
        continue;
      }

      // ------------------------
      // شمارنده موفقیت
      // ------------------------
      resetDailyCounterIfNeeded();
      successfulAudioCount++;

      console.log(
        `✅ موفق #${successfulAudioCount} | کلید ${idx} | طول صوت: ${audioPart.inlineData.data.length}`
      );

      return res.json({
        base64: audioPart.inlineData.data,
        mimeType: audioPart.inlineData.mimeType,
      });

    } catch (err) {
      const status = err.response?.status || 0;

      console.log(`❌ خطا روی کلید ${idx} | Status: ${status}`);

      // فقط خطاهای 429 و 403 باعث می‌شوند سراغ کلید بعدی برویم
      if (status === 429) {
        state.cooldownUntil = Date.now() + ONE_MINUTE;
        console.log(`⏳ کلید ${idx} → cooldown 1 دقیقه`);
      } else if (status === 403) {
        state.cooldownUntil = Date.now() + ONE_DAY;
        console.log(`⛔ کلید ${idx} → cooldown 1 روز`);
      } else {
        // خطاهای دیگر → پاسخ 500
        return res.status(500).json({
          error: "خطای غیرقابل بازیابی از سمت گوگل",
          status,
          message: err.message
        });
      }

      tries++;
      continue;
    }
  }

  // هیچ کلید سالمی پیدا نشد
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
