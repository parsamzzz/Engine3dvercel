import express from "express";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";

const router = express.Router();

/* 🔑 API Config */
const API_KEY = process.env.KIE_API_KEY || "dbd18fd3191266b86bbf18adb81d67d4";
const FILE_UPLOAD_URL = "https://kieai.redpandaai.co/api/file-stream-upload";

const ALEPH_GENERATE_URL = "https://api.kie.ai/api/v1/aleph/generate";
const ALEPH_STATUS_URL = "https://api.kie.ai/api/v1/aleph/record-info";

const RUNWAY_GENERATE_URL = "https://api.kie.ai/api/v1/runway/generate";
const RUNWAY_EXTEND_URL = "https://api.kie.ai/api/v1/runway/extend";
const RUNWAY_STATUS_URL = "https://api.kie.ai/api/v1/runway/record-detail";

/* ⚙️ Multer setup */
const upload = multer({ storage: multer.memoryStorage() });

/* 🔹 Helper: Upload any file (video or image) */
const uploadAnyFile = async (file, type = "video") => {
  if (!file) return null;

  const allowedExtensions = {
    video: [".mp4", ".mov", ".avi"],
    image: [".png", ".jpg", ".jpeg", ".webp"],
  };

  const ext = "." + (file.originalname.split(".").pop() || "").toLowerCase();
  if (!allowedExtensions[type].includes(ext)) {
    throw new Error(`❌ فرمت ${type} نامعتبر است.`);
  }

  const maxSize = type === "video" ? 500 * 1024 * 1024 : 20 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error(`❌ حجم ${type} نباید بیش از ${type === "video" ? "500MB" : "20MB"} باشد.`);
  }

  const formData = new FormData();
  formData.append("file", file.buffer, file.originalname);
  formData.append("uploadPath", type === "video" ? "videos/user-uploads" : "images/user-uploads");

  const resp = await axios.post(FILE_UPLOAD_URL, formData, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      ...formData.getHeaders(),
    },
  });

  const data = resp.data;
  if (!data.success || !data.data?.downloadUrl) {
    throw new Error(`❌ آپلود ${type} به KIE.AI ناموفق بود.`);
  }

  return data.data.downloadUrl;
};

/* 🔹 Status check endpoint */
router.get("/", (req, res) => {
  res.send("✅ KIE.AI Video API (ALEPH + RUNWAY + EXTEND) is active.");
});

/* 🔹 Process endpoint */
router.post(
  "/process",
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "imageUrl", maxCount: 1 },
    { name: "referenceImage", maxCount: 1 },
  ]),
  async (req, res) => {
    const {
      prompt,
      service,
      callBackUrl,
      waterMark,
      aspectRatio,
      duration,
      quality,
      seed,
      taskId,
      uploadCn,
    } = req.body;

    if (!prompt || !service) {
      return res.status(400).json({ error: "❌ فیلدهای prompt و service الزامی هستند." });
    }

    try {
      let videoUrl = req.files?.video?.[0] ? await uploadAnyFile(req.files.video[0], "video") : null;
      let imageUrlUpload = req.files?.imageUrl?.[0] ? await uploadAnyFile(req.files.imageUrl[0], "image") : null;
      let referenceImageUpload = req.files?.referenceImage?.[0] ? await uploadAnyFile(req.files.referenceImage[0], "image") : null;

      let genUrl;
      const serviceType = service.toLowerCase();
      if (serviceType === "aleph") genUrl = ALEPH_GENERATE_URL;
      else if (serviceType === "runway") genUrl = RUNWAY_GENERATE_URL;
      else if (serviceType === "runway_extend" || serviceType === "extend") genUrl = RUNWAY_EXTEND_URL;
      else return res.status(400).json({ error: "❌ مقدار service باید aleph / runway / runway_extend باشد." });

      let body = { prompt };
      if (serviceType === "aleph") {
        if (!videoUrl) throw new Error("❌ پارامتر videoUrl برای Aleph الزامی است.");
        body = { prompt, videoUrl };
        if (referenceImageUpload) body.referenceImage = referenceImageUpload;
        if (callBackUrl) body.callBackUrl = callBackUrl;
        if (waterMark) body.waterMark = waterMark;
        if (aspectRatio) body.aspectRatio = aspectRatio;
        if (seed) body.seed = seed;
        if (uploadCn !== undefined) body.uploadCn = uploadCn === "true" || uploadCn === true;
      } else if (serviceType === "runway") {
        if (videoUrl) body.videoUrl = videoUrl;
        if (imageUrlUpload) body.imageUrl = imageUrlUpload;
        if (!videoUrl && !imageUrlUpload && !aspectRatio) {
          return res.status(400).json({
            error: "❌ در حالت Text-to-Video (Runway بدون ویدیو و تصویر)، پارامتر aspectRatio الزامی است.",
          });
        }
        if (callBackUrl) body.callBackUrl = callBackUrl;
        if (waterMark) body.waterMark = waterMark;
        if (aspectRatio) body.aspectRatio = aspectRatio;
        if (duration) body.duration = Number(duration);
        if (quality) body.quality = quality;
      } else if (serviceType === "runway_extend") {
        if (!taskId) throw new Error("❌ پارامتر taskId برای Runway Extend الزامی است.");
        body.taskId = taskId;
        if (callBackUrl) body.callBackUrl = callBackUrl;
        if (waterMark) body.waterMark = waterMark;
        if (duration) body.duration = Number(duration);
        if (quality) body.quality = quality;
      }

      const genResp = await axios.post(genUrl, body, {
        headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
      });

      const returnedTaskId = genResp.data?.data?.taskId;
      if (!returnedTaskId) throw new Error("❌ Task ID از پاسخ دریافت نشد.");

      // 🔔 لاگ Task ساخته شده
      if (genResp.data.code === 200) {
        console.log(`🎉 Task موفق: ${service.toUpperCase()}, taskId: ${returnedTaskId}`);
      } else {
        console.warn(`⚠️ Task شکست خورده: ${service.toUpperCase()}, پاسخ سرور:`, genResp.data);
      }

      res.status(200).json({
        success: true,
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
  }
);

/* 📊 وضعیت تسک (Status) */
router.get("/status/:service/:taskId", async (req, res) => {
  const { service, taskId } = req.params;
  if (!taskId) return res.status(400).json({ error: "❌ taskId الزامی است." });

  let statusUrl;
  const serviceType = service.toLowerCase();
  if (serviceType === "aleph") statusUrl = `${ALEPH_STATUS_URL}?taskId=${taskId}`;
  else if (serviceType === "runway" || serviceType === "runway_extend") statusUrl = `${RUNWAY_STATUS_URL}?taskId=${taskId}`;
  else return res.status(400).json({ error: "❌ service باید aleph یا runway باشد." });

  try {
    const statusResp = await axios.get(statusUrl, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });

    // ✅ پاک کردن generateParam و paramJson
    const cleanData = { ...statusResp.data };
    
    // برای سرویس runway: حذف generateParam
    if (serviceType === "runway" && cleanData.data?.data?.generateParam) {
      delete cleanData.data.data.generateParam;
    }
    
    // برای سرویس aleph: حذف paramJson
    if (serviceType === "aleph" && cleanData.data?.paramJson) {
      delete cleanData.data.paramJson;
    }

    // 🔔 لاگ موفقیت وضعیت Task
    if (cleanData.data?.state === "success") {
      console.log(`🎉 Task ${taskId} (${service.toUpperCase()}) با موفقیت کامل شد.`);
    }

    res.status(200).json({ success: true, service, taskId, data: cleanData });
  } catch (err) {
    console.error("❌ Status error:", err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      success: false,
      error: err.response?.data || err.message,
    });
  }
});


export default router;
