import express from "express";
import { GoogleGenAI, Modality } from "@google/genai";

const router = express.Router();

const API_KEYS = [
  'AIzaSyCVSP1ybV1M-X-Q9GLk2ILbtsvyHtbunyM',
'AIzaSyDosaNhOnxVx2B4AwxjfI_O3gjJL6SqVPI',
'AIzaSyDhqJ8gwKQixfPtCZeEzfropdYh9-_yqb0',

'AIzaSyDMSd0-yTpoYUEJqa2K6rpMhS9I1p0nLcQ',
'AIzaSyCfX1d9Xr0M7BiDyzwIxy5f3oVJqO__n9Y',
'AIzaSyBrYNNtwbvgky0rdEDyVzGGCTKXgH5Bsp8'
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

    for (let i = 0; i < totalKeys; i++) {
      const currentKeyIndex = (apiKeyIndex + i) % totalKeys;
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

          apiKeyIndex = (currentKeyIndex + 1) % totalKeys;

          return res.json({ base64, mimeType });
        } else {
          return res.status(200).json({
            message: "درخواست پردازش شد، اما تصویری تولید نشد.",
            parts,
          });
        }
      } catch (err) {
        console.error(
          `خطا در کلید ${key.substring(0, 15)}... :`,
          err.message
        );
      }
    }

    return res.status(500).json({
      error: "همه کلیدها با خطا مواجه شدند یا تصویری تولید نشد.",
    });
  } catch (err) {
    next(err);
  }
});

router.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "خطای سرور." });
});

export default router;
