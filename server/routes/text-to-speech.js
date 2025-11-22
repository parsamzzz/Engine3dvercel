import express from "express";
import { GoogleGenAI, Modality } from "@google/genai";

const router = express.Router();

// =====================
// 🔑 همه کلیدها (تعداد کلیدها می‌تواند بیشتر باشد)
// =====================
const API_KEYS = [
"AIzaSyAhud0Y08odo3QkR6tn0QTPNVCtlgWhQnk",
"AIzaSyB7jAI-1FHYATMTQIH3YkD7kIuIm7o2-lo",
"AIzaSyA416fx5gbHbbHsHYEK6RAqtyvTCSvdNjw",
"AIzaSyA6dLEJ1YxJLG2gRMoD9egKagMiV0Biu3o",
"AIzaSyB9r5Uhw5Jzr2XcHMnSSSza7dUBliE91rE",
"AIzaSyBhxhDka6LCfQe_JQPZkVfDehTG0tUFkI8",
"AIzaSyDsr-qCEvaeBciXS-jGuLGWRkrCPLoyswU",
];

// =====================
// 🛡 کلید خصوصی کلاینت
// =====================
const PRIVATE_KEY = "threedify_7Vg5NqXk29Lz3MwYcPfBTr84sD";

// =====================
// 📌 محدودیت‌ها و وضعیت کلیدها
// =====================
const ONE_MINUTE = 60 * 1000;
const ONE_DAY = 24 * 60 * 60 * 1000;

const keyState = API_KEYS.map(() => ({
  cooldownUntil: 0,
  perMinuteCount: 0,
  perDayCount: 0,
  lastMinuteReset: Date.now(),
  lastDayReset: Date.now(),
  inUse: false,
}));

// =====================
// 🔹 شمارنده موفقیت 24 ساعته
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
// 📌 انتخاب کلید موجود و آزاد
// =====================
function getNextAvailableKey() {
  const now = Date.now();

  for (let i = 0; i < API_KEYS.length; i++) {
    const idx = (apiKeyIndex + i) % API_KEYS.length;
    const state = keyState[idx];

    // ریست محدودیت دقیقه و روز
    if (now - state.lastMinuteReset >= ONE_MINUTE) {
      state.perMinuteCount = 0;
      state.lastMinuteReset = now;
    }
    if (now - state.lastDayReset >= ONE_DAY) {
      state.perDayCount = 0;
      state.lastDayReset = now;
    }

    if (state.perMinuteCount >= 10 || state.perDayCount >= 100) continue;
    if (now < state.cooldownUntil) continue;
    if (state.inUse) continue;

    state.inUse = true;
    state.perMinuteCount++;
    state.perDayCount++;

    apiKeyIndex = (idx + 1) % API_KEYS.length;
    return { key: API_KEYS[idx], idx };
  }

  return null; // هیچ کلید آزاد نیست
}

// =====================
// 📌 هندل درخواست‌ها
// =====================
async function handleRequest(req, res, next) {
  const { text, multiSpeaker, voiceName } = req.body;

  let tries = 0;

  while (tries < API_KEYS.length) {
    const keyData = getNextAvailableKey();

    if (!keyData) {
      // اگر هیچ کلید آزاد نیست کمی صبر کن
      await new Promise((r) => setTimeout(r, 200));
      continue;
    }

    const { key, idx } = keyData;

    try {
      console.log(`🚀 ارسال به Gemini با کلید ${idx} | متن: "${text}"`);

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
        tries++;
        continue;
      }

      resetDailyCounterIfNeeded();
      successfulAudioCount++;

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
        console.log(`⏱ کلید ${idx} محدودیت دقیقه رسید، 1 دقیقه cool down شد`);
        keyState[idx].cooldownUntil = Date.now() + ONE_MINUTE;
      } else if (status === 403) {
        console.log(`🚫 کلید ${idx} محدودیت روز رسید، تا فردا غیر فعال شد`);
        keyState[idx].cooldownUntil = Date.now() + ONE_DAY;
      } else {
        console.log(`❌ خطا با کلید ${idx} | متن: "${text.slice(0, 200)}" | خطا: ${err.message}`);
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

  handleRequest(req, res, next);
});

// مدیریت خطا
router.use((err, req, res) => {
  console.log("💥 خطای سرور:", err.message);
  res.status(500).json({ error: "خطای سرور" });
});

export default router;
