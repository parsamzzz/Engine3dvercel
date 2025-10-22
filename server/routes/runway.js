import express from "express";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";

const router = express.Router();

/* 🔑 API Config */
const API_KEY = process.env.KIE_API_KEY || "dbd18fd3191266b86bbf18adb81d67d4";
const FILE_UPLOAD_URL = "https://kieai.redpandaai.co/api/file-stream-upload";

const ALEPH_GENERATE_URL = "https://api.kie.ai/api/v1/aleph/generate";
const ALEPH_STATUS_URL   = "https://api.kie.ai/api/v1/aleph/record-info";

const RUNWAY_GENERATE_URL = "https://api.kie.ai/api/v1/runway/generate";
const RUNWAY_EXTEND_URL   = "https://api.kie.ai/api/v1/runway/extend";
const RUNWAY_STATUS_URL   = "https://api.kie.ai/api/v1/runway/record-detail";

/* ⚙️ Multer setup */
const upload = multer({ storage: multer.memoryStorage() });

/* 🧩 Utilities */
const ensureApiKey = () => {
  if (!API_KEY) {
    const err = new Error("Server misconfig: KIE_API_KEY is missing.");
    err.status = 500;
    throw err;
  }
};

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
    throw new Error(
      `❌ حجم ${type} نباید بیش از ${type === "video" ? "500MB" : "20MB"} باشد.`
    );
  }

  const formData = new FormData();
  formData.append("file", file.buffer, file.originalname);
  formData.append(
    "uploadPath",
    type === "video" ? "videos/user-uploads" : "images/user-uploads"
  );

  const resp = await axios.post(FILE_UPLOAD_URL, formData, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      ...formData.getHeaders(),
    },
  });

  const data = resp.data;
  if (!data?.success || !data?.data?.downloadUrl) {
    throw new Error(`❌ آپلود ${type} به KIE.AI ناموفق بود.`);
  }

  return data.data.downloadUrl;
};

/* 🔹 Health check endpoint */
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
    try {
      ensureApiKey();

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

      // 📥 optional URL fields from body
      const imageUrlBody = typeof req.body.imageUrl === "string" ? req.body.imageUrl.trim() : null;
      const referenceImageBody = typeof req.body.referenceImage === "string" ? req.body.referenceImage.trim() : null;
      const videoUrlBody = typeof req.body.videoUrl === "string" ? req.body.videoUrl.trim() : null;

      // 📤 Upload files if present
      let videoUrlUpload = req.files?.video?.[0]
        ? await uploadAnyFile(req.files.video[0], "video")
        : null;
      let imageUrlUpload = req.files?.imageUrl?.[0]
        ? await uploadAnyFile(req.files.imageUrl[0], "image")
        : null;
      let referenceImageUpload = req.files?.referenceImage?.[0]
        ? await uploadAnyFile(req.files.referenceImage[0], "image")
        : null;

      let genUrl;
      const serviceType = String(service).toLowerCase().trim();
      if (serviceType === "aleph") genUrl = ALEPH_GENERATE_URL;
      else if (serviceType === "runway") genUrl = RUNWAY_GENERATE_URL;
      else if (serviceType === "runway_extend" || serviceType === "extend") genUrl = RUNWAY_EXTEND_URL;
      else {
        return res.status(400).json({ error: "❌ مقدار service باید aleph / runway / runway_extend باشد." });
      }

      let body = { prompt };

      /* 🎥 Aleph setup */
      if (serviceType === "aleph") {
        // videoUrl از body یا آپلود
        const alephVideoUrl = videoUrlBody || videoUrlUpload;
        if (!alephVideoUrl) {
          return res.status(422).json({ error: "❌ پارامتر videoUrl برای Aleph الزامی است." });
        }

        // اگر فایل upload شده‌ای وجود دارد، سقف 10MB را روی همان فایل چک کردیم.
        if (req.files?.video?.[0] && req.files.video[0].size > 10 * 1024 * 1024) {
          return res.status(422).json({ error: "❌ حجم ویدیو برای Aleph نباید از 10MB بیشتر باشد." });
        }

        body = { prompt, videoUrl: alephVideoUrl };

        // referenceImage از body یا آپلود
        const refImg = referenceImageBody || referenceImageUpload || null;
        if (refImg) body.referenceImage = refImg;

        if (typeof callBackUrl === "string" && callBackUrl.trim()) body.callBackUrl = callBackUrl.trim();
        if (typeof waterMark === "string") body.waterMark = waterMark;
        if (typeof aspectRatio === "string" && aspectRatio.trim()) body.aspectRatio = aspectRatio.trim();
        if (typeof seed !== "undefined" && seed !== null && `${seed}`.trim() !== "") {
          body.seed = Number(seed);
        }
        if (typeof uploadCn !== "undefined") {
          body.uploadCn = uploadCn === "true" || uploadCn === true;
        }
      }

      /* 🎬 Runway generate */
      else if (serviceType === "runway") {
        // Runway از videoUrl پشتیبانی نمی‌کند
        if (videoUrlBody || videoUrlUpload) {
          return res.status(422).json({ error: "❌ Runway از videoUrl پشتیبانی نمی‌کند. از imageUrl یا فقط prompt استفاده کن." });
        }

        if (!callBackUrl || !String(callBackUrl).trim()) {
          return res.status(422).json({ error: "❌ callBackUrl برای Runway الزامی است." });
        }

        // imageUrl از body یا آپلود
        const imageUrl = imageUrlBody || imageUrlUpload || null;

        body = { prompt, callBackUrl: String(callBackUrl).trim() };

        if (imageUrl) {
          // وقتی تصویر هست، aspectRatio نامعتبر است و ارسال نمی‌شود
          body.imageUrl = imageUrl;
        } else {
          // Text-only: aspectRatio الزامی
          if (!aspectRatio || !String(aspectRatio).trim()) {
            return res.status(422).json({ error: "❌ در حالت متن‌محور Runway، پارامتر aspectRatio الزامی است." });
          }
          body.aspectRatio = String(aspectRatio).trim();
        }

        // duration و quality با قیود
        const dur = Number(duration);
        if (![5, 10].includes(dur)) {
          return res.status(422).json({ error: "❌ duration فقط 5 یا 10 ثانیه است." });
        }
        if (!["720p", "1080p"].includes(String(quality))) {
          return res.status(422).json({ error: "❌ quality فقط 720p یا 1080p است." });
        }
        if (dur === 10 && String(quality) === "1080p") {
          return res.status(422).json({ error: "❌ با ویدیو 10 ثانیه‌ای، 1080p مجاز نیست." });
        }

        body.duration = dur;
        body.quality = String(quality);
        if (typeof waterMark === "string") body.waterMark = waterMark;
      }

      /* ⏩ Runway Extend */
      else if (serviceType === "runway_extend" || serviceType === "extend") {
        if (!taskId || !String(taskId).trim()) {
          return res.status(422).json({ error: "❌ پارامتر taskId برای Runway Extend الزامی است." });
        }
        if (!prompt || !String(prompt).trim()) {
          return res.status(422).json({ error: "❌ prompt برای ادامه ویدیو (extend) الزامی است." });
        }
        if (!["720p", "1080p"].includes(String(quality))) {
          return res.status(422).json({ error: "❌ quality فقط 720p یا 1080p است." });
        }
        if (!callBackUrl || !String(callBackUrl).trim()) {
          return res.status(422).json({ error: "❌ callBackUrl برای Runway Extend الزامی است." });
        }

        body = {
          taskId: String(taskId).trim(),
          prompt: String(prompt).trim(),
          quality: String(quality),
          callBackUrl: String(callBackUrl).trim(),
        };
        if (typeof waterMark === "string") body.waterMark = waterMark;
        // duration در extend تعریف نشده، پس ارسال نمی‌شود
      }

      // 🚀 Send generation request
      const genResp = await axios.post(genUrl, body, {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
      });

      const returnedTaskId = genResp?.data?.data?.taskId;
      if (!returnedTaskId) {
        const msg = genResp?.data?.msg || "TaskId not present";
        return res.status(502).json({ success: false, error: `❌ Task ID از پاسخ دریافت نشد. ${msg}` });
      }

      let extraMsg = "";
      if (serviceType === "aleph") extraMsg = "⚠️ خروجی Aleph حداکثر ۵ ثانیه است.";

      res.status(200).json({
        success: true,
        task: { taskId: returnedTaskId },
        msg: `✅ تسک ${service.toUpperCase()} با موفقیت ایجاد شد. ${extraMsg}`,
        upstream: genResp.data,
      });
    } catch (err) {
      const status = err.status || err.response?.status || 500;
      console.error("❌ Error creating task:", err.response?.data || err.message);
      res.status(status).json({
        success: false,
        error: err.response?.data || err.message,
      });
    }
  }
);

/* 📊 وضعیت تسک (Status) */
router.get("/status/:service/:taskId", async (req, res) => {
  try {
    ensureApiKey();

    const { service, taskId } = req.params;
    if (!taskId) return res.status(400).json({ error: "❌ taskId الزامی است." });

    const serviceType = String(service).toLowerCase().trim();
    let statusUrl;
    if (serviceType === "aleph") {
      statusUrl = `${ALEPH_STATUS_URL}?taskId=${encodeURIComponent(taskId)}`;
    } else if (serviceType === "runway" || serviceType === "runway_extend" || serviceType === "extend") {
      statusUrl = `${RUNWAY_STATUS_URL}?taskId=${encodeURIComponent(taskId)}`;
    } else {
      return res.status(400).json({ error: "❌ service باید aleph یا runway باشد." });
    }

    const { data } = await axios.get(statusUrl, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });

    // تلاش برای خواندن state استاندارد
    const state =
      data?.data?.state ??
      data?.data?.data?.state ??
      null;

    if (state === "success") {
      console.log(`🎉 Task ${taskId} (${service.toUpperCase()}) موفق شد.`);
    } else if (state === "fail") {
      console.warn(`⚠️ Task ${taskId} (${service.toUpperCase()}) شکست خورد.`);
    }

    // کل upstream را برمی‌گردانیم تا چیزی گم نشود
    res.status(200).json({ success: true, service: serviceType, taskId, upstream: data });
  } catch (err) {
    const status = err.status || err.response?.status || 500;
    console.error("❌ Status error:", err.response?.data || err.message);
    res.status(status).json({
      success: false,
      error: err.response?.data || err.message,
    });
  }
});

export default router;
