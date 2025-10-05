// routes/nanobanana.js
import express from "express";
import axios from "axios";
import multer from "multer";
import FormData from "form-data";

const router = express.Router();

// ثابت‌ها
const API_KEY = "e497ee9a169a6bac8dd9bd6d9db0775e";
const KIE_CREATE_URL = "https://api.kie.ai/api/v1/jobs/createTask";
const KIE_QUERY_URL  = "https://api.kie.ai/api/v1/jobs/recordInfo";
const KIE_UPLOAD_URL = "https://kieai.redpandaai.co/api/file-stream-upload";

// ⚙️ multer: اجازه چند فایل
const upload = multer({ storage: multer.memoryStorage() });

/* ===================================================
   0) 📤 آپلود چند عکس و گرفتن لینک‌ها
=================================================== */
router.post("/upload", upload.array("files", 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "❌ هیچ فایلی ارسال نشده است." });
    }

    const urls = [];

    // برای هر فایل یک درخواست آپلود
    for (const file of req.files) {
      const formData = new FormData();
      formData.append("file", file.buffer, file.originalname);
      formData.append("uploadPath", "images/user-uploads");

      const uploadResp = await axios.post(KIE_UPLOAD_URL, formData, {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          ...formData.getHeaders()
        }
      });

      const data = uploadResp.data;
      if (!data.success) {
        return res.status(500).json({
          error: "❌ آپلود یکی از فایل‌ها شکست خورد.",
          raw: data
        });
      }

      urls.push(data.data.downloadUrl);
    }

    res.json({
      success: true,
      count: urls.length,
      urls
    });
  } catch (err) {
    console.error("Upload error:", err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: err.response?.data || err.message
    });
  }
});

/* ===================================================
   1) 🟢 Generate Image
=================================================== */
router.post("/nano-banana", async (req, res) => {
  const { prompt, output_format = "png", image_size = "auto" } = req.body;
  if (!prompt) return res.status(400).json({ error: "❌ فیلد prompt الزامی است." });

  try {
    const response = await axios.post(
      KIE_CREATE_URL,
      { model: "google/nano-banana", input: { prompt, output_format, image_size } },
      { headers: { Authorization: `Bearer ${API_KEY}` } }
    );
    res.status(response.status).json(response.data);
  } catch (err) {
    console.error("Nano-Banana error:", err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: err.response?.data || err.message
    });
  }
});

/* ===================================================
   2) ✏️ Edit Image
=================================================== */
router.post("/nano-banana-edit", async (req, res) => {
  const { prompt, image_urls = [], output_format = "png", image_size = "auto" } = req.body;
  if (!prompt || image_urls.length === 0)
    return res.status(400).json({
      error: "❌ فیلدهای prompt و image_urls الزامی هستند."
    });

  try {
    const response = await axios.post(
      KIE_CREATE_URL,
      { model: "google/nano-banana-edit", input: { prompt, image_urls, output_format, image_size } },
      { headers: { Authorization: `Bearer ${API_KEY}` } }
    );
    res.status(response.status).json(response.data);
  } catch (err) {
    console.error("Nano-Banana-Edit error:", err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: err.response?.data || err.message
    });
  }
});

/* ===================================================
   3) 🔎 Upscale Image
=================================================== */
router.post("/nano-banana-upscale", async (req, res) => {
  const { image, scale = 2, face_enhance = false } = req.body;
  if (!image) return res.status(400).json({ error: "❌ فیلد image الزامی است." });

  try {
    const response = await axios.post(
      KIE_CREATE_URL,
      { model: "nano-banana-upscale", input: { image, scale, face_enhance } },
      { headers: { Authorization: `Bearer ${API_KEY}` } }
    );
    res.status(response.status).json(response.data);
  } catch (err) {
    console.error("Nano-Banana-Upscale error:", err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: err.response?.data || err.message
    });
  }
});

/* ===================================================
   4) 🔎 Query Task
=================================================== */
router.get("/query", async (req, res) => {
  const { taskId } = req.query;
  if (!taskId) return res.status(400).json({ error: "❌ پارامتر taskId الزامی است." });

  try {
    const response = await axios.get(`${KIE_QUERY_URL}?taskId=${taskId}`, {
      headers: { Authorization: `Bearer ${API_KEY}` }
    });
    res.status(response.status).json(response.data);
  } catch (err) {
    console.error("Query error:", err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: err.response?.data || err.message
    });
  }
});

/* ===================================================
   404
=================================================== */
router.use((req, res) => {
  res.status(404).json({ error: "❌ مسیر یافت نشد." });
});

export default router;
