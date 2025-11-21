import express from "express";
import { GoogleGenAI, Modality } from "@google/genai";

const router = express.Router();

// =====================
// 🔑 همه کلیدها
// =====================
const API_KEYS = [
 "AIzaSyCdqSov5Q8XL1Ut0GZT5_4LxjW0ykzL3gI",
"AIzaSyAgei7FHog7a_4zClil1El9ni86AaMEjnQ",
"AIzaSyDvRaZrtkWD9hoZYS__Q_4u6y_hViQSl8A",
"AIzaSyDwr4Onv7C2QCJDnjiVeE3rlopsGzgILpc",
"AIzaSyDkZydJjkHbAdWaEi73dJ7RrTpmEOWcpDs",
"AIzaSyDz19y9oTPKCUgxYJiTkwsJySda7YURu-g",
"AIzaSyC7OdyRo9T7NkMzsN7NPKTrFow5zYXkxU4",
"AIzaSyBBX6JRfe9jYlUETCwpaMfk5CtxLzUFmbA",
"AIzaSyBOkuNHhhwC-4YRzYuvAzzV8j9X01ycIoA",
"AIzaSyCEL1shpPWslg59kf4aj4ijuJw7BVhi5lc",
"AIzaSyDpUQqXWM9-jxuFNnqQZk9S_OGT71PCXao",
"AIzaSyDpfvrTHpFcXDmyeT05BkafCRe1znBxzd4",
"AIzaSyAb6gJVGPX-BXO8fzoC-DfgBsy2M2dsd-Q",
"AIzaSyCwTpN5FHx8K9ItxPTO64rVGz_zL45vbRA",
"AIzaSyC4YW-4BDpnzU0_muJdxChI5bp4lQeadrA",
"AIzaSyCJRbxArN6Ow6GqTaUjVHWLOacQ5OSzh30",
"AIzaSyCCbLEmvmF1oXSHrIG3t_fh8rUX-4aeuxk",
"AIzaSyDClFwoZU442LL7jxZBTEqk5FT46AJCd4E",
"AIzaSyDYgslwrB5tpT0WfofxCyT-VBs3H_X5RpE",
"AIzaSyDqYNvOOII1888JrT_gdwW9i1Evm7a5BfU",
"AIzaSyDo_AsWiI-vOC8hdH45YD3NEM4hQv4RpOI",
"AIzaSyCDaD6WFhqiCQM3Md35FLi_XFibj2YDSM4",
"AIzaSyAH6Om23T2mvgjf5fPrL05KaocP2wpi-_w",
"AIzaSyCLShNGyoTPtDcZOpzGk6pAQsEA1OBdXEw",
"AIzaSyAWNAr5iA7xk90uT_mqF849iKg2RD2gqC4",
"AIzaSyAAVZYJtNm_J8FL_qpBp33hBJLiGoIdGqw",
"AIzaSyAW3Nt4MEjdjLr051Qe7ypz3REnuH_0rsU",
"AIzaSyBRDbiqc5Byc4P3lpRA0fIkvvbTiFa6XIk",
"AIzaSyAu8NIu84qmDhSaCDBgnmYdyLkbIP32ckU",
"AIzaSyChOP7n8J6PLV4hj85TVtMV7mqH8mxHXpc",
"AIzaSyC6eQobZlGdiZahLCbTNmL_V6O0rd264Fk",
"AIzaSyAiuXnLA0BEm2SQsaJcOik16ES2FzoYT6E",
"AIzaSyAqnEYSLKiL_uVxB29XLZs2J4s5H3EATbk",
"AIzaSyDDVZlmkO4PQ9n6n4B-S9UzrQ34_aNY6VE",
"AIzaSyA4H4Ui7hIdK4UyxEImzUskFqxRIev9HgE",
"AIzaSyBVfruiFluLgUk9z-TH51JuEJq892oCcLg",
"AIzaSyBQSbNW7NVrVKwwXxMFX_1d0h1_24Xl0iU",
"AIzaSyBiyC-QCzol2FQ28WNgcwqpvkkkFhaZNzA",
"AIzaSyAhku1eFTem8-8PyB9h3medoLESi6zxYcQ",
"AIzaSyAGR17mKwgsdcrKhWKEO8R4zoFmUQDQy3I",
"AIzaSyCmvm5EzD3s4p3j8CUJL_wJ6L4dET7rlNk",
"AIzaSyB0uPXR1K1-rRjcmA-44wWd7sq7jio2INc",
"AIzaSyCSRgqduhmZ_hZYhMaPgag3dQmenWybB1Q",
"AIzaSyCzrlsFAejR_Fy5GrDZrQKf8O_d39_7Luo",
"AIzaSyDz_eT2of8KrTAdfD9g0XLl_Ujy9oi-Zss",
"AIzaSyD9rBenxfNPM23-a2ZLSkGGdwAv0QJ1NmI",
"AIzaSyBitBJOCf7ziv-yODUBBDDw4wxLHaUYFbU",
"AIzaSyDRII1Fm-WTMKguxWuaJraGh7OcV1YWc9s",
"AIzaSyBAdrb0RKO4eNg3WF9_9SCQrOsohAAuNnQ",
"AIzaSyDIraDSEwYC3TyPHTfYlLPrDgMGlBL6p4I",
"AIzaSyA5TxbbaIIlhc4bhc88NwfDqfBigRk51J8",
"AIzaSyDZTaC16BnRquzPS8kOakE5TiX6LVlTa2c",
"AIzaSyDAmZ-_KzczbaAuBo0qrP7el5AdfkBQ1C0",
"AIzaSyDwjEsq_EHe0ZwXwY8mRfu-Kla_KRdImTo",
"AIzaSyC87CPApBGwLFykob6DB4MZ8_pgpceEWA8",
"AIzaSyBE9GaVt01PpYKl7qv9muYsVPXTZtTHLII",
"AIzaSyCA8JntaxkC6b9OLUirs5nvwRvmQvUK7XA",
"AIzaSyCA8JntaxkC6b9OLUirs5nvwRvmQvUK7XA",
"AIzaSyAtGSLtaXNY_JsAbSN_X8OohPAOD0fQwBs",
"AIzaSyCrEypmsoPuPuLrfXIFIhtJaRwW4lk8xTI",
"AIzaSyB-wZ1V7OY7zVc1bptHFvPp6pDEBAYFPAw",
"AIzaSyAJ2KlgWBg8nbemuk1aS-oQcmwan-WzKBI",
"AIzaSyCIaTpbwm9a8d9mOb5OKyk7GUF1Qv7XkL0",
"AIzaSyA9wI3kiCHroVQPlGuoWJaLDjgJ1P83l5U",
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
