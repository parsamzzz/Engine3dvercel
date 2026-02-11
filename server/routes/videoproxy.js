// routes/videoproxy.js

import express from "express";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import { Readable } from "stream";

const router = express.Router(); // ✅ به جای app

// Multer memory storage → ذخیره در RAM
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 1024 * 5 // حداکثر 5GB (در صورت نیاز تغییر بده)
  }
});

// ================================
// 📌 Endpoint پراکسی آپلود
// ================================
router.post("/", upload.single("file"), async (req, res) => {
  try {
    // بررسی فایل
    if (!req.file) {
      console.error("[VIDEO-PROXY] No file uploaded");
      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });
    }

    // بررسی signedUrl
    const { signedUrl } = req.body;

    if (!signedUrl) {
      console.error("[VIDEO-PROXY] Signed URL missing");
      return res.status(400).json({
        success: false,
        message: "Signed URL missing"
      });
    }

    console.log("=================================");
    console.log("[VIDEO-PROXY] File:", req.file.originalname);
    console.log("[VIDEO-PROXY] Size:", req.file.size);
    console.log("[VIDEO-PROXY] Type:", req.file.mimetype);
    console.log("[VIDEO-PROXY] URL:", signedUrl);
    console.log("=================================");

    // ساخت FormData
    const form = new FormData();

    const stream = Readable.from(req.file.buffer);

    form.append("file", stream, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
      knownLength: req.file.size
    });

    // ارسال به Luma
    const response = await axios.post(signedUrl, form, {
      headers: {
        ...form.getHeaders()
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 1000 * 60 * 30 // 30 دقیقه برای فایل سنگین
    });

    console.log("[VIDEO-PROXY] Upload Success");

    return res.status(200).json({
      success: true,
      message: "Video uploaded successfully",
      data: response.data || null
    });

  } catch (error) {

    console.error("[VIDEO-PROXY] Upload Failed");

    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    } else {
      console.error("Error:", error.message);
    }

    return res.status(500).json({
      success: false,
      message: "Proxy upload failed",
      error: error.message
    });
  }
});


// ================================
// ✅ Export Router
// ================================
export default router;
