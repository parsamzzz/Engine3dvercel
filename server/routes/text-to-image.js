import express from "express";
import { GoogleGenAI, Modality } from "@google/genai";

const router = express.Router();

const API_KEYS = [
  'AIzaSyDhqJ8gwKQixfPtCZeEzfropdYh9-_yqb0',
  'AIzaSyDpqyXS3RAsPufJAKT3Zmne8SL1EgOIQKc',
  'AIzaSyDMSd0-yTpoYUEJqa2K6rpMhS9I1p0nLcQ',
  'AIzaSyAQ9qgYwtrutklb3BTpKiW6tAZ2fhPfSWI',
  'AIzaSyCfX1d9Xr0M7BiDyzwIxy5f3oVJqO__n9Y',
  'AIzaSyDAqLei5_h4y5Vg1qVSKvdbbLiHQrGfjX4',
  'AIzaSyADOgOBfQT1U-bRQAxXscq4sPqJJlEz4_0',
  'AIzaSyAZk5FE4XUx14SEH9n8wy6rh0PbVOM_e0o',
  'AIzaSyBQ_yRx5w6bmhnYpeKqFGnWBwdtWoGFTgc',
  'AIzaSyBD5V0Y0BYKFUIFvbnmi46IFuh5y-ibSdA',

  'AIzaSyAXGxErlDP7gEZ5nWCxDl3V0Tu5Poo6AzQ',


  'AIzaSyA-MtzXcddrH6ShV_y6hZ7fncpxy0d5JO4',
  'AIzaSyARi1ijMaLk5bQkJg08UCd0G7DcIJCtiIA'
];

const PRIVATE_KEY = "threedify_7Vg5NqXk29Lz3MwYcPfBTr84sD";

let apiKeyIndex = 0;

router.post("/", async (req, res, next) => {
  try {
    const clientKey = req.headers["x-api-key"];
    if (!clientKey || clientKey !== PRIVATE_KEY) {
      return res.status(403).json({ error: "⛔ دسترسی غیرمجاز." });
    }

    const prompt = req.body.prompt;
    if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
      return res.status(400).json({ error: "⛔ prompt معتبر نیست." });
    }

    const totalKeys = API_KEYS.length;
    let isSuccessful = false; // نشان‌دهنده موفقیت یا شکست درخواست

    while (!isSuccessful) {
      const currentKeyIndex = apiKeyIndex % totalKeys;
      const key = API_KEYS[currentKeyIndex];

      try {
        const ai = new GoogleGenAI({ apiKey: key });

        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash-preview-image-generation",
          contents: prompt,
          config: {
            responseModalities: [Modality.TEXT, Modality.IMAGE],
          },
        });

        const parts = response.candidates?.[0]?.content?.parts || [];
        const imagePart = parts.find(
          (part) => part.inlineData?.mimeType?.startsWith("image/")
        );

        if (imagePart?.inlineData?.data) {
          const base64 = imagePart.inlineData.data;
          const mimeType = imagePart.inlineData.mimeType;

          // لاگ موفقیت در تولید تصویر
          console.log(`✅ تصویر با موفقیت تولید شد با کلید: ${key.substring(0, 15)}...`);

          // به کلید بعدی برای درخواست‌های بعدی برویم
          apiKeyIndex = (currentKeyIndex + 1) % totalKeys;

          return res.json({ base64, mimeType });
        } else {
          // لاگ عدم موفقیت در تولید تصویر
          console.warn("⚠️ تصویری تولید نشد.");
        }
      } catch (err) {
        // لاگ خطا در استفاده از کلید
        console.error(
          `❌ خطا در کلید ${key.substring(0, 15)}... :`,
          err.message
        );
      }

      // اگر با کلید فعلی موفق نبود، به کلید بعدی می‌رود
      apiKeyIndex = (currentKeyIndex + 1) % totalKeys;
    }

    return res.status(500).json({
      error: "همه کلیدها با خطا مواجه شدند یا تصویری تولید نشد.",
    });
  } catch (err) {
    next(err);
  }
});

// مدیریت خطا
router.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "خطای سرور." });
});

export default router;
