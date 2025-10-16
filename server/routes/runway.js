import express from "express";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";

const router = express.Router();

/* 🔑 API Config */
const API_KEY = "dbd18fd3191266b86bbf18adb81d67d4";
const FILE_UPLOAD_URL = "https://kieai.redpandaai.co/api/file-stream-upload";

const ALEPH_GENERATE_URL = "https://api.kie.ai/api/v1/aleph/generate";
const ALEPH_STATUS_URL = "https://api.kie.ai/api/v1/aleph/record-info";

const RUNWAY_GENERATE_URL = "https://api.kie.ai/api/v1/runway/generate";
const RUNWAY_EXTEND_URL = "https://api.kie.ai/api/v1/runway/extend";
const RUNWAY_STATUS_URL = "https://api.kie.ai/api/v1/runway/record-detail";

/* ⚙️ Multer setup */
const upload = multer({ storage: multer.memoryStorage() });

/* 🔹 Status check endpoint */
router.get("/", (req, res) => {
  res.send("✅ KIE.AI Video API (ALEPH + RUNWAY + EXTEND) is active.");
});

/* 🔹 Process endpoint */
router.post("/process", upload.single("video"), async (req, res) => {
  const {
    prompt,
    service,
    callBackUrl,
    waterMark,
    aspectRatio,
    duration,
    quality,
    seed,
    imageUrl,
    referenceImage,
    taskId, // برای Runway Extend
  } = req.body;

  if (!prompt || !service) {
    return res.status(400).json({
      error: "❌ فیلدهای prompt و service الزامی هستند.",
    });
  }

  try {
    /* 🟢 مرحله ۱: آپلود فایل در صورت وجود */
    let videoUrl = null;

    if (req.file) {
      const allowedExt = [".mp4", ".mov", ".avi"];
      const ext = "." + (req.file.originalname.split(".").pop() || "").toLowerCase();

      if (!allowedExt.includes(ext)) {
        return res.status(400).json({
          error: "❌ فرمت ویدیو باید MP4 / MOV / AVI باشد.",
        });
      }

      if (req.file.size > 500 * 1024 * 1024) {
        return res.status(400).json({
          error: "❌ حجم ویدیو نباید بیش از 500MB باشد.",
        });
      }

      const formData = new FormData();
      formData.append("file", req.file.buffer, req.file.originalname);
      formData.append("uploadPath", "videos/user-uploads");

      const uploadResp = await axios.post(FILE_UPLOAD_URL, formData, {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          ...formData.getHeaders(),
        },
      });

      const uploadData = uploadResp.data;
      if (!uploadData.success || !uploadData.data?.downloadUrl) {
        return res.status(500).json({
          error: "❌ آپلود فایل به KIE.AI ناموفق بود.",
          rawResponse: uploadData,
        });
      }

      videoUrl = uploadData.data.downloadUrl;
    }

    /* 🔵 مرحله ۲: انتخاب URL مناسب بر اساس نوع سرویس */
    let genUrl;
    const serviceType = service.toLowerCase();

    if (serviceType === "aleph") genUrl = ALEPH_GENERATE_URL;
    else if (serviceType === "runway") genUrl = RUNWAY_GENERATE_URL;
    else if (serviceType === "runway_extend" || serviceType === "extend") genUrl = RUNWAY_EXTEND_URL;
    else
      return res.status(400).json({
        error: "❌ مقدار service باید یکی از مقادیر aleph / runway / runway_extend باشد.",
      });

    /* 🟣 مرحله ۳: آماده‌سازی بدنه درخواست */
    const body = { prompt };

    if (serviceType === "aleph") {
      if (videoUrl) body.videoUrl = videoUrl;
      if (referenceImage) body.referenceImage = referenceImage;
      if (callBackUrl) body.callBackUrl = callBackUrl;
      if (waterMark) body.waterMark = waterMark;
      if (aspectRatio) body.aspectRatio = aspectRatio;
      if (seed) body.seed = seed;
    } else if (serviceType === "runway") {
      if (videoUrl) body.videoUrl = videoUrl;
      if (imageUrl) body.imageUrl = imageUrl;

      if (!videoUrl && !imageUrl && !aspectRatio) {
        return res.status(400).json({
          error:
            "❌ در حالت Text-to-Video (Runway بدون ویدیو و تصویر)، پارامتر aspectRatio الزامی است.",
        });
      }

      if (callBackUrl) body.callBackUrl = callBackUrl;
      if (waterMark) body.waterMark = waterMark;
      if (aspectRatio) body.aspectRatio = aspectRatio;
      if (duration) body.duration = duration;
      if (quality) body.quality = quality;
    } else if (serviceType === "runway_extend") {
      if (!taskId) {
        return res.status(400).json({
          error: "❌ پارامتر taskId برای Runway Extend الزامی است.",
        });
      }
      body.taskId = taskId;

      if (callBackUrl) body.callBackUrl = callBackUrl;
      if (waterMark) body.waterMark = waterMark;
      if (duration) body.duration = duration;
      if (quality) body.quality = quality;
    }

    /* 🟢 مرحله ۴: ارسال درخواست تولید */
    const genResp = await axios.post(genUrl, body, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    const returnedTaskId = genResp.data?.data?.taskId;

    if (!returnedTaskId) {
      return res.status(500).json({
        success: false,
        upload: { downloadUrl: videoUrl },
        error: "❌ Task ID از پاسخ دریافت نشد.",
        rawResponse: genResp.data,
      });
    }

    /* ✅ مرحله ۵: پاسخ موفق */
    res.status(200).json({
      success: true,
      upload: { downloadUrl: videoUrl },
      task: { taskId: returnedTaskId },
      msg: `✅ تسک ${service.toUpperCase()} با موفقیت ایجاد شد.`,
      rawResponse: genResp.data,
    });
  } catch (err) {
    console.error("❌ Error creating task:", err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      success: false,
      error: err.response?.data || err.message,
    });
  }
});

/* 📊 وضعیت تسک (Status) */
router.get("/status/:service/:taskId", async (req, res) => {
  const { service, taskId } = req.params;
  if (!taskId)
    return res.status(400).json({ error: "❌ taskId الزامی است." });

  let statusUrl;
  const serviceType = service.toLowerCase();

  if (serviceType === "aleph") statusUrl = `${ALEPH_STATUS_URL}?taskId=${taskId}`;
  else if (serviceType === "runway" || serviceType === "runway_extend")
    statusUrl = `${RUNWAY_STATUS_URL}?taskId=${taskId}`;
  else
    return res.status(400).json({
      error: "❌ service باید aleph یا runway باشد.",
    });

  try {
    const statusResp = await axios.get(statusUrl, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });

    res.status(200).json({
      success: true,
      service,
      taskId,
      data: statusResp.data,
    });
  } catch (err) {
    console.error("❌ Status error:", err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      success: false,
      error: err.response?.data || err.message,
    });
  }
});

export default router;
