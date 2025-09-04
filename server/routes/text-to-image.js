import express from "express";
import { GoogleGenAI, Modality } from "@google/genai";

const router = express.Router();

const API_KEYS = [
  'AIzaSyD7wbXAYoSYD0WGg8-6IZOhKyfSym00g7g',
  'AIzaSyAmDnnMUYcv6QMt-fhF0YHdRzD4x2qDwqg',
  'AIzaSyCGcnePSQRL6PUC0zrE3z3NBQEdAWuWIVE',
  'AIzaSyAYnfzx1_3UiyE-jyfLpO4i2zrcM0USUoA',
  'AIzaSyDhqJ8gwKQixfPtCZeEzfropdYh9-_yqb0',
  'AIzaSyDpqyXS3RAsPufJAKT3Zmne8SL1EgOIQKc',
  'AIzaSyDqXmdk8a3euOrvH-FTsSmUA0BP6wfPPIk',
  'AIzaSyDMSd0-yTpoYUEJqa2K6rpMhS9I1p0nLcQ',
  'AIzaSyAQ9qgYwtrutklb3BTpKiW6tAZ2fhPfSWI',
  'AIzaSyCfX1d9Xr0M7BiDyzwIxy5f3oVJqO__n9Y',
  'AIzaSyDAqLei5_h4y5Vg1qVSKvdbbLiHQrGfjX4',
  'AIzaSyADOgOBfQT1U-bRQAxXscq4sPqJJlEz4_0',
  'AIzaSyAZk5FE4XUx14SEH9n8wy6rh0PbVOM_e0o',
  'AIzaSyBQ_yRx5w6bmhnYpeKqFGnWBwdtWoGFTgc',
  'AIzaSyBD5V0Y0BYKFUIFvbnmi46IFuh5y-ibSdA',
  'AIzaSyARk8SUMKga6uXMt6v-FWtGdlo6arfgtUM',
  'AIzaSyAXGxErlDP7gEZ5nWCxDl3V0Tu5Poo6AzQ',
  'AIzaSyAzweAy_UzoquW2EMJ7n6mzSe-EUQZ7GCk',
  'AIzaSyDWxlokRrSIMBlup0FA8JOCDCpYsJma7VY'
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
