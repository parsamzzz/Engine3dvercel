// routes/veo.js
import express from "express";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";

const router = express.Router();

// Multer در حالت حافظه
const storage = multer.memoryStorage();
const upload = multer({ storage });

// نمونه‌سازی کلاینت Gemini
const ai = new GoogleGenAI({});

// مدل‌ها و قابلیت‌ها
const videoModels = {
  "veo-2.0": { resolutions: ["720p"], durations: [5, 6, 8], audio: false, supportsReference: false, supportsInterpolation: false, supportsExtension: false },
  "veo-3.0": { resolutions: ["720p", "1080p"], durations: [4, 6, 8], audio: true, supportsReference: false, supportsInterpolation: false, supportsExtension: false },
  "veo-3.0-fast": { resolutions: ["720p", "1080p"], durations: [4, 6, 8], audio: true, supportsReference: false, supportsInterpolation: false, supportsExtension: false },
  "veo-3.1": { resolutions: ["720p", "1080p"], durations: [4, 6, 8], audio: true, supportsReference: true, supportsInterpolation: true, supportsExtension: true },
  "veo-3.1-fast": { resolutions: ["720p", "1080p"], durations: [4, 6, 8], audio: true, supportsReference: true, supportsInterpolation: true, supportsExtension: true },
};

// تعریف فیلدهای آپلود
const cpUpload = upload.fields([
  { name: "image", maxCount: 3 },
  { name: "video", maxCount: 1 }
]);

// Endpoint تولید ویدیو
router.post("/generate-video", cpUpload, async (req, res) => {
  try {
    const {
      model,
      prompt,
      resolution,
      duration,
      aspectRatio,
      negativePrompt,
      useReferenceImages,
      useInterpolation,
      useExtension
    } = req.body;

    if (!videoModels[model]) return res.status(400).json({ error: "مدل انتخابی معتبر نیست." });
    const modelConfig = videoModels[model];

    // آماده‌سازی تصویر اولیه
    let image;
    if (req.files["image"]?.length) {
      image = { imageBytes: req.files["image"][0].buffer, mimeType: req.files["image"][0].mimetype };
    }

    // Reference Images
    let referenceImages = [];
    if (useReferenceImages === "true" && modelConfig.supportsReference && req.files["image"]?.length) {
      referenceImages = req.files["image"].slice(0, 3).map(file => ({
        image: { imageBytes: file.buffer, mimeType: file.mimetype },
        reference_type: "asset",
      }));
    }

    // Interpolation (First & Last Frame)
    let lastFrame;
    if (useInterpolation === "true" && modelConfig.supportsInterpolation && req.files["image"]?.length === 2) {
      lastFrame = { imageBytes: req.files["image"][1].buffer, mimeType: req.files["image"][1].mimetype };
      image = { imageBytes: req.files["image"][0].buffer, mimeType: req.files["image"][0].mimetype };
    }

    // Video Extension
    let inputVideo;
    if (useExtension === "true" && modelConfig.supportsExtension && req.files["video"]?.length) {
      inputVideo = req.files["video"][0].buffer;
    }

    // تنظیمات مدل
    let config = {
      resolution: resolution || modelConfig.resolutions[0],
      durationSeconds: duration ? Number(duration) : modelConfig.durations[0],
      aspectRatio: aspectRatio || "16:9",
      negativePrompt: negativePrompt || undefined,
      reference_images: referenceImages.length ? referenceImages : undefined,
      ...(lastFrame ? { lastFrame } : {}),
    };

    // فراخوانی API
    let operation = await ai.models.generateVideos({
      model,
      prompt,
      config,
      ...(image ? { image } : {}),
      ...(inputVideo ? { video: inputVideo } : {}),
    });

    // Poll با بهینه‌سازی (10 ثانیه) و timeout
    const maxRetries = 60; // حداکثر 10 دقیقه انتظار
    let retries = 0;
    while (!operation.done) {
      if (retries >= maxRetries) throw new Error("Video generation timeout");
      await new Promise(r => setTimeout(r, 10000));
      operation = await ai.operations.getVideosOperation({ operation });
      retries++;
    }

    // بررسی وجود ویدیو
    if (!operation.response?.generatedVideos?.length) {
      return res.status(500).json({ error: "ویدیو تولید نشد یا بلاک شده است." });
    }

    // دانلود ویدیو
    const videoBuffer = await ai.files.download({
      file: operation.response.generatedVideos[0].video,
    });

    // ارسال مستقیم ویدیو
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Disposition", `attachment; filename="generated_video.mp4"`);
    res.send(videoBuffer);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "خطا در تولید ویدیو." });
  }
});

export default router;
