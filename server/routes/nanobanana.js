import express from "express";
import axios from "axios";
import multer from "multer";
import FormData from "form-data";

const router = express.Router();

// ================= ثابت‌ها (فقط در سرور باقی بمانند) =================
const API_KEY = "e497ee9a169a6bac8dd9bd6d9db0775e";
const KIE_CREATE_URL = "https://api.kie.ai/api/v1/jobs/createTask";
const KIE_QUERY_URL  = "https://api.kie.ai/api/v1/jobs/recordInfo";
const KIE_UPLOAD_URL = "https://kieai.redpandaai.co/api/file-stream-upload";

// 🗂️ کش داخلی برای نگهداری لینک‌های اصلی KIE
const fileCache = new Map(); // key=taskId یا id داخلی → url واقعی

// ⚙️ multer: اجازه چند فایل
const upload = multer({ storage: multer.memoryStorage() });

/* ===================================================
   0) 📤 آپلود چند عکس → بازگرداندن مسیر داخلی
=================================================== */
router.post("/upload", upload.array("files", 10), async (req, res) => {
  try {
    if (!req.files?.length) return res.status(400).json({ error: "❌ هیچ فایلی ارسال نشده است." });

    const files = [];

    for (const file of req.files) {
      const formData = new FormData();
      formData.append("file", file.buffer, file.originalname);
      formData.append("uploadPath", "images/user-uploads");

      const upRes = await axios.post(KIE_UPLOAD_URL, formData, {
        headers: { Authorization: `Bearer ${API_KEY}`, ...formData.getHeaders() }
      });

      if (!upRes.data?.success) return res.status(500).json({ error: "❌ آپلود یکی از فایل‌ها شکست خورد." });

      const url = upRes.data.data.downloadUrl;
      const localId = `u_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      fileCache.set(localId, url);
      files.push(`/api/nanobanana/files/${localId}`);
    }

    res.json({ success: true, count: files.length, files });
  } catch (err) {
    console.error("❌ Upload error:", err.message);
    res.status(500).json({ error: "خطای آپلود تصویر" });
  }
});

/* ===================================================
   1) 🟢 Generate Image → فقط taskId
=================================================== */
router.post("/nano-banana", async (req, res) => {
  const { prompt, output_format = "png", image_size = "auto" } = req.body;
  if (!prompt) return res.status(400).json({ error: "❌ فیلد prompt الزامی است." });

  try {
    const kieRes = await axios.post(
      KIE_CREATE_URL,
      { model: "google/nano-banana", input: { prompt, output_format, image_size } },
      { headers: { Authorization: `Bearer ${API_KEY}` } }
    );

    res.json({ success: true, taskId: kieRes.data?.taskId || null });
  } catch (err) {
    console.error("❌ Generate error:", err.message);
    res.status(500).json({ error: "خطای پردازش تصویر" });
  }
});

/* ===================================================
   2) ✏️ Edit Image → فقط taskId
=================================================== */
router.post("/nano-banana-edit", async (req, res) => {
  const { prompt, image_urls = [], output_format = "png", image_size = "auto" } = req.body;
  if (!prompt || !image_urls.length)
    return res.status(400).json({ error: "❌ فیلدهای prompt و image_urls الزامی هستند." });

  try {
    const kieRes = await axios.post(
      KIE_CREATE_URL,
      { model: "google/nano-banana-edit", input: { prompt, image_urls, output_format, image_size } },
      { headers: { Authorization: `Bearer ${API_KEY}` } }
    );

    res.json({ success: true, taskId: kieRes.data?.taskId || null });
  } catch (err) {
    console.error("❌ Edit error:", err.message);
    res.status(500).json({ error: "خطای ویرایش تصویر" });
  }
});

/* ===================================================
   3) 🔎 Upscale Image → فقط taskId
=================================================== */
router.post("/nano-banana-upscale", async (req, res) => {
  const { image, scale = 2, face_enhance = false } = req.body;
  if (!image) return res.status(400).json({ error: "❌ فیلد image الزامی است." });

  try {
    const kieRes = await axios.post(
      KIE_CREATE_URL,
      { model: "nano-banana-upscale", input: { image, scale, face_enhance } },
      { headers: { Authorization: `Bearer ${API_KEY}` } }
    );

    res.json({ success: true, taskId: kieRes.data?.taskId || null });
  } catch (err) {
    console.error("❌ Upscale error:", err.message);
    res.status(500).json({ error: "خطای افزایش کیفیت تصویر" });
  }
});

/* ===================================================
   4) 🔎 Query Task → ذخیره لینک خروجی
=================================================== */
router.get("/query", async (req, res) => {
  const { taskId } = req.query;
  if (!taskId) return res.status(400).json({ error: "❌ پارامتر taskId الزامی است." });

  try {
    const kieRes = await axios.get(`${KIE_QUERY_URL}?taskId=${taskId}`, {
      headers: { Authorization: `Bearer ${API_KEY}` }
    });

    const state = kieRes.data?.data?.state || null;
    let resultPath = null;

    if (state === "success") {
      try {
        const parsed = JSON.parse(kieRes.data.data.resultJson || "{}");
        const url = parsed.resultUrls?.[0];
        if (url) {
          fileCache.set(taskId, url);
          resultPath = `/api/nanobanana/files/${taskId}`;
        }
      } catch {/* ignore */}
    }

    res.json({ success: true, state, result: resultPath });
  } catch (err) {
    console.error("❌ Query error:", err.message);
    res.status(500).json({ error: "خطای دریافت وضعیت پردازش" });
  }
});

/* ===================================================
   5) 📥 مسیر داخلی دریافت عکس → Proxy
=================================================== */
router.get("/files/:id", async (req, res) => {
  const fileUrl = fileCache.get(req.params.id);
  if (!fileUrl) return res.status(404).json({ error: "فایل یافت نشد." });

  try {
    const imgRes = await axios.get(fileUrl, { responseType: "arraybuffer" });
    res.setHeader("Content-Type", "image/png");
    res.send(imgRes.data);
  } catch {
    res.status(500).json({ error: "خطای دریافت فایل" });
  }
});

/* ===================================================
   404
=================================================== */
router.use((req, res) => {
  res.status(404).json({ error: "❌ مسیر یافت نشد." });
});

export default router;
