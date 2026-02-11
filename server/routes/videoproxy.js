// routes/videoproxy.js

import express from "express";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";

const router = express.Router();

// ================================
// 📁 Temp Upload Folder
// ================================
const UPLOAD_DIR = "uploads";

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
}

// ================================
// 📌 Multer → Disk Storage (نه RAM ❌)
// ================================
const upload = multer({
  dest: UPLOAD_DIR,
  limits: {
    fileSize: 1024 * 1024 * 1024 * 5 // 5GB
  }
});

// ================================
// 🚀 Video Upload Proxy
// ================================
router.post("/", upload.single("file"), async (req, res) => {

  const tempFilePath = req.file?.path;

  try {

    // ================================
    // Validation
    // ================================
    if (!req.file) {
      console.error("[VIDEO-PROXY] No file uploaded");

      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });
    }

    const { signedUrl } = req.body;

    if (!signedUrl) {
      console.error("[VIDEO-PROXY] Signed URL missing");

      return res.status(400).json({
        success: false,
        message: "Signed URL missing"
      });
    }

    // ================================
    // Logs
    // ================================
    console.log("=================================");
    console.log("[VIDEO-PROXY]");
    console.log("File:", req.file.originalname);
    console.log("Size:", req.file.size);
    console.log("Temp:", tempFilePath);
    console.log("Type:", req.file.mimetype);
    console.log("URL:", signedUrl);
    console.log("=================================");

    // ================================
    // Stream from Disk
    // ================================
    const fileStream = fs.createReadStream(tempFilePath);

    const form = new FormData();

    form.append("file", fileStream, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
      knownLength: req.file.size
    });

    // ================================
    // Send to Luma
    // ================================
    const response = await axios.post(signedUrl, form, {
      headers: {
        ...form.getHeaders(),
        "Content-Length": form.getLengthSync()
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 1000 * 60 * 60 // 1 ساعت
    });

    console.log("[VIDEO-PROXY] Upload Success");

    // ================================
    // Delete temp file
    // ================================
    fs.unlink(tempFilePath, err => {
      if (err) console.error("Temp delete error:", err);
    });

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

    // ================================
    // Cleanup on Error
    // ================================
    if (tempFilePath) {
      fs.unlink(tempFilePath, () => {});
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
