import express from "express";
import { GoogleGenAI, Modality } from "@google/genai";
import dotenv from "dotenv";

dotenv.config(); // بارگذاری متغیرهای محیطی

const router = express.Router();

// =====================
// 🔑 کلید از .env
// =====================
const API_KEY = process.env.GOOGLE_GENAI_KEY;

// =====================
// 🛡 کلید خصوصی کلاینت
// =====================
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// =====================
// وضعیت صف
// =====================
let processingQueue = false;
const requestQueue = [];

// =====================
// پردازش صف با لاگ
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
// پردازش درخواست با لاگ کامل
// =====================
async function handleRequest(req, res, next) {
  const { prompt } = req.body;
  console.info(`✉️ دریافت درخواست با prompt: "${prompt.substring(0,50)}..."`);

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: prompt,
      config: { responseModalities: [Modality.TEXT, Modality.IMAGE] }
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find(p => p.inlineData?.mimeType?.startsWith("image/"));

    if (imagePart?.inlineData?.data) {
      console.info(`✅ متن یه عکس با موفقیت تولید شد.`);
      return res.json({ base64: imagePart.inlineData.data, mimeType: imagePart.inlineData.mimeType });
    } else {
      console.warn("⚠️ درخواست پردازش شد اما تصویری تولید نشد.");
      return res.status(200).json({ message: "درخواست پردازش شد، اما تصویری تولید نشد.", parts });
    }
  } catch (err) {
    console.error("❌ خطا در پردازش:", err.message);
    return next(err);
  }
}

// =====================
// مسیر POST با صف
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
