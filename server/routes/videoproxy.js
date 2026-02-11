// VIDEO-PROXY.JS
import express from "express";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import { Readable } from "stream";

const app = express();
const PORT = 3000;

// Multer memory storage → فایل در RAM ذخیره می‌شود
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Endpoint پراکسی
app.post("/", upload.single("file"), async (req, res) => {
  try {
    // بررسی وجود فایل
    if (!req.file) {
      console.log("[ERROR] No file uploaded.");
      return res.status(400).json({ success: false, message: "No file uploaded." });
    }

    // دریافت signed URL از فرم داده
    const signedUrl = req.body.signedUrl;
    if (!signedUrl) {
      console.log("[ERROR] Signed URL missing.");
      return res.status(400).json({ success: false, message: "Signed URL missing." });
    }

    console.log(`[INFO] Received file: ${req.file.originalname}, size: ${req.file.size} bytes`);
    console.log(`[INFO] Signed URL: ${signedUrl}`);

    // ایجاد FormData برای ارسال به Luma
    const form = new FormData();
    const stream = Readable.from(req.file.buffer);

    // append فایل با همان اسم اصلی
    form.append("file", stream, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });

    // ارسال فایل به Luma
    const lumaResponse = await axios.post(signedUrl, form, {
      headers: {
        ...form.getHeaders()
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    console.log("[INFO] File proxied successfully.");
    return res.status(200).json({
      success: true,
      message: "Video proxied to Luma successfully",
      lumaResponse: lumaResponse.data
    });
  } catch (err) {
    console.error("[ERROR] Proxy upload failed:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// شروع سرور
app.listen(PORT, () => {
  console.log(`[INFO] Proxy server running at http://localhost:${PORT}`);
});
