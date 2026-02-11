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
app.post("/", upload.single("video"), async (req, res) => {
  try {
    // بررسی وجود فایل
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded." });
    }

    // دریافت signed URL از فرم داده
    const signedUrl = req.body.signedUrl;
    if (!signedUrl) {
      return res.status(400).json({ success: false, message: "Signed URL missing." });
    }

    // ایجاد FormData برای ارسال به Luma
    const form = new FormData();

    // تبدیل buffer به stream
    const stream = Readable.from(req.file.buffer);

    // append فایل با اسم ثابت G.mp4
    form.append("file", stream, {
      filename: "G.mp4",
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

    // پاسخ موفق به کاربر
    return res.status(200).json({
      success: true,
      message: "Video proxied to Luma successfully",
      lumaResponse: lumaResponse.data
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// شروع سرور
app.listen(PORT, () => {
  console.log(`Proxy server running at http://localhost:${PORT}`);
});
