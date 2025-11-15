import express from "express";
import { GoogleGenAI, Modality } from "@google/genai";

const router = express.Router();

// =====================
// 🔑 همه کلیدها
// =====================
const API_KEYS = [
"AIzaSyCVdYG2qcU7VJVbMNxUipRiC5HcBl-41ew"
];

// =====================
// 🛡 کلید خصوصی کلاینت
// =====================
const PRIVATE_KEY = "threedify_7Vg5NqXk29Lz3MwYcPfBTr84sD";

// وضعیت کلیدها و صف
const keyState = API_KEYS.map(() => ({ cooldownUntil: 0, inUse: false }));
let apiKeyIndex = 0;
const requestQueue = [];
let processingQueue = false;

// =====================
// 📌 انتخاب کلید سالم با لاگ
// =====================
function getNextAvailableKey() {
  const totalKeys = API_KEYS.length;
  for (let i = 0; i < totalKeys; i++) {
    const idx = (apiKeyIndex + i) % totalKeys;
    const state = keyState[idx];
    if (!state.inUse && Date.now() > state.cooldownUntil) {
      apiKeyIndex = (idx + 1) % totalKeys;
      state.inUse = true;
      console.info(`🗝️ کلید انتخاب شد: ${keyState[idx].key?.substring(0,10) || 'hidden'} (index: ${idx})`);
      return { key: API_KEYS[idx], idx };
    }
  }
  console.warn("⏳ هیچ کلید فعالی در دسترس نیست.");
  return null;
}

// =====================
// 📌 پردازش صف با لاگ
// =====================
async function processQueue() {
  if (processingQueue) return;
  processingQueue = true;

  console.info(`➡️ شروع پردازش صف، طول صف: ${requestQueue.length}`);

  while (requestQueue.length > 0) {
    const { req, res, next } = requestQueue.shift();
    try {
      await handleRequest(req, res, next);
    } catch (err) {
      next(err);
    }
  }

  processingQueue = false;
  console.info("✅ پردازش صف به اتمام رسید.");
}

// =====================
// 📌 پردازش درخواست با لاگ کامل
// =====================
async function handleRequest(req, res, next) {
  const { prompt } = req.body;
  console.info(`✉️ دریافت درخواست با prompt: "${prompt.substring(0,50)}..."`);

  const totalKeys = API_KEYS.length;
  let triedKeys = 0;

  while (triedKeys < totalKeys) {
    const keyData = getNextAvailableKey();
    if (!keyData) {
      console.info("⏳ منتظر آزاد شدن کلید...");
      await new Promise(r => setTimeout(r, 100));
      continue;
    }

    const { key, idx } = keyData;
    console.info(`🔑 استفاده از کلید index ${idx}`);

    try {
      const ai = new GoogleGenAI({ apiKey: key });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-09-2025",
        contents: prompt,
        config: { responseModalities: [Modality.TEXT, Modality.IMAGE] }
      });

      const parts = response.candidates?.[0]?.content?.parts || [];
      const imagePart = parts.find(p => p.inlineData?.mimeType?.startsWith("image/"));

      keyState[idx].inUse = false;

      if (imagePart?.inlineData?.data) {
        console.info(`✅ متن یه عکس  با موفقیت تولید شد با کلید index ${idx}`);
        return res.json({ base64: imagePart.inlineData.data, mimeType: imagePart.inlineData.mimeType });
      } else {
        console.warn(`⚠️ درخواست پردازش شد اما تصویری تولید نشد. index ${idx}`);
        return res.status(200).json({ message: "درخواست پردازش شد، اما تصویری تولید نشد.", parts });
      }
    } catch (err) {
      keyState[idx].inUse = false;
      console.error(`❌ خطا در کلید index ${idx}:`, err.message);

      const status = err.response?.status || 0;

      if (status === 429 || err.message.includes("429")) {
        keyState[idx].cooldownUntil = Date.now() + 60 * 60 * 1000; 
        console.warn(`⏳ کلید index ${idx} در cooldown به مدت 1 ساعت قرار گرفت (429).`);
        triedKeys++;
        continue;
      }

      if (status === 403 || err.message.includes("403")) {
        keyState[idx].cooldownUntil = Date.now() + 24 * 60 * 60 * 1000;
        console.warn(`🚫 کلید index ${idx} غیرفعال شد (403). کلید بعدی امتحان می‌شود.`);
        triedKeys++;
        continue;
      }

      // هندل کردن خطای 400
      if (status === 400 || err.message.includes("400")) {
        console.warn(`⚠️ خطای 400 در کلید index ${idx}... کلید بعدی امتحان می‌شود.`);
        triedKeys++;
        continue;
      }

      // سایر خطاها => خروج از حلقه و next(err)
      return next(err);
    }
  }

  console.error("❌ هیچ‌کدام از کلیدها موفق نشد.");
  res.status(503).json({ error: "هیچ‌کدام از کلیدها موفق نشد." });
}


// =====================
// 📌 مسیر POST با صف
// =====================
router.post("/", (req, res, next) => {
  const clientKey = req.headers["x-api-key"];
  if (!clientKey || clientKey !== PRIVATE_KEY) {
    console.warn("⛔ دسترسی غیرمجاز");
    return res.status(403).json({ error: "⛔ دسترسی غیرمجاز." });
  }

  const { prompt } = req.body;
  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
    console.warn("⛔ prompt معتبر نیست");
    return res.status(400).json({ error: "⛔ prompt معتبر نیست." });
  }

  console.info(`📝 درخواست به صف اضافه شد. طول صف: ${requestQueue.length + 1}`);
  requestQueue.push({ req, res, next });
  processQueue();
});

// =====================
// مدیریت خطا
// =====================
router.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "خطای سرور." });
});

export default router;
