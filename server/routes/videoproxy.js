// routes/videoproxy.js

import express from "express";
import multer from "multer";
import axios from "axios";
import { Readable } from "stream";

const router = express.Router();

// ================================
// ⚙️ Multer Config (RAM Storage)
// ================================
const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 1024 * 1024 * 1024 * 5 // 5GB
  }
});


// ================================
// 📌 Proxy Upload Endpoint
// ================================
router.post("/", upload.single("file"), async (req, res) => {
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
        message: "Signed URL is required"
      });
    }


    // ================================
    // Logs
    // ================================
    console.log("========== VIDEO PROXY ==========");
    console.log("File:", req.file.originalname);
    console.log("Size:", req.file.size);
    console.log("Type:", req.file.mimetype);
    console.log("SignedUrl:", signedUrl);
    console.log("================================");


    // ================================
    // Buffer → Stream
    // ================================
    const videoStream = Readable.from(req.file.buffer);


    // ================================
    // Upload To Luma (PUT + Stream)
    // ================================
    const response = await axios.put(
      signedUrl,
      videoStream,
      {
        headers: {
          "Content-Type": req.file.mimetype,
          "Content-Length": req.file.size
        },

        maxBodyLength: Infinity,
        maxContentLength: Infinity,

        timeout: 1000 * 60 * 30 // 30 min
      }
    );


    console.log("[VIDEO-PROXY] Upload Success:", response.status);


    // ================================
    // Response
    // ================================
    return res.status(200).json({
      success: true,
      message: "Uploaded to Luma successfully",
      status: response.status
    });

  }
  catch (error) {

    console.error("[VIDEO-PROXY] Upload Failed");

    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    }
    else {
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
// Export Router
// ================================
export default router;
