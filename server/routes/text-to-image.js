import express from "express";
import { GoogleGenAI, Modality } from "@google/genai";

const router = express.Router();

// 🔑 یک کلید API
const API_KEY = "AIzaSyCVdYG2qcU7VJVbMNxUipRiC5HcBl-41ew";

// 🛡 کلید خصوصی کلاینت
const PRIVATE_KEY = "threedify_7Vg5NqXk29Lz3MwYcPfBTr84sD";

// صف و مدیریت همزمانی
const requestQueue = [];
const MAX_CONCURRENT = 3;
let activeRequests = 0;

// =====================
// مدیریت صف با سقف ۳ درخواست
// =====================
function runNext() {
  if (activeRequests >= MAX_CONCURRENT) return;

  const job = requestQueue.shift();
  if (!job) return;

  activeRequests++;
  const { req, res, next } = job;

  handleRequest(req, res, next)
    .catch(err => next(err))
    .finally(() => {
      activeRequests--;
      runNext();
    });
}

// =====================
// پردازش درخواست
// =====================
async function handleRequest(req, res, next) {
  const { prompt } = req.body;
  console.info(`✉️ دریافت درخواست با prompt: "${prompt.substring(0, 50)}..."`);

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [{ text: prompt }],
      config: { responseModalities: [Modality.TEXT, Modality.IMAGE] }
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find(p => p.inlineData?.mimeType?.startsWith("image/"));

    if (imagePart?.inlineData?.data) {
      console.info("✅ متن به عکس با موفقیت تولید شد.");
      return res.json({
        base64: imagePart.inlineData.data,
        mimeType: imagePart.inlineData.mimeType
      });
    } else {
      console.warn("⚠️ درخواست پردازش شد، اما تصویری تولید نشد.");
      return res
        .status(200)
        .json({ message: "درخواست پردازش شد، اما تصویری تولید نشد.", parts });
    }
  } catch (err) {
    console.error("❌ خطا در ارتباط با Gemini:", err.message);
    const status = err.response?.status || 0;

    if (status === 429 || err.message.includes("429")) {
      console.warn("⚠️ 429 از سرویس دریافت شد (ریتم بالا).");
      return res
        .status(429)
        .json({ error: "سرویس شلوغ است، لطفاً کمی بعد دوباره تلاش کنید." });
    }

    if (status === 400 || err.message.includes("400")) {
      console.warn("⚠️ خطای 400 از سرویس.");
      return res.status(400).json({ error: "درخواست نامعتبر به سرویس ارسال شده است." });
    }

    if (status === 403 || err.message.includes("403")) {
      console.warn("🚫 دسترسی به سرویس مسدود شده است (403).");
      return res.status(403).json({ error: "دسترسی به سرویس مسدود شده است." });
    }

    return next(err);
  }
}

// =====================
// 📌 مسیر POST با صف و محدودیت همزمانی
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
  runNext();
});

// =====================
// مدیریت خطا
// =====================
router.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "خطای سرور." });
});

export default router;
