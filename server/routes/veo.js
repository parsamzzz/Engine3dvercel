import express from 'express';
import axios from 'axios';
import multer from 'multer';
import fs from 'fs';
import cors from 'cors';

const router = express.Router();
const upload = multer({ dest: 'tmp/' });

const GEMINI_API_KEY = "AIzaSyDlA9tgjJtVQX7FnPsnQH39ZThH5fNk5fg";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

// ❌ ALLOWED_ORIGINS حذف شد
// ❌ Origin filtering حذف شد

// 🔓 CORS کاملاً آزاد
router.use(cors({ origin: true, credentials: true }));
router.options('*', cors({ origin: true, credentials: true }));

// حافظه موقت برای وضعیت عملیات
const operations = {};

const extractOperationId = (fullName) => fullName.split('/').pop();

const extractFileId = (url) => {
  const match = url.match(/\/files\/([^:]+):download/);
  return match ? match[1] : null;
};

// ==== مسیر تولید ویدیو ====
router.post('/generate', upload.single('image'), async (req, res) => {
  try {
    const { prompt } = req.body;
    const imageFile = req.file;

    if (!prompt) return res.status(400).json({ success: false, error: "prompt required" });

    let instance = { prompt };
    if (imageFile) {
      const imageData = fs.readFileSync(imageFile.path);
      instance.image = {
        imageBytes: imageData.toString('base64'),
        mimeType: imageFile.mimetype || "image/png"
      };
      fs.unlinkSync(imageFile.path);
    }

    const response = await axios.post(
      `${BASE_URL}/models/veo-3.0-fast-generate-001:predictLongRunning`,
      { instances: [instance] },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY
        }
      }
    );

    const fullOperationName = response.data.name;
    const operationId = extractOperationId(fullOperationName);
    operations[operationId] = { status: 'pending' };

    res.json({ success: true, operationId });
  } catch (err) {
    console.error(err?.response?.data || err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==== مسیر بررسی وضعیت ====
router.get('/status/:operationId', async (req, res) => {
  try {
    const { operationId } = req.params;
    if (!operationId) return res.status(400).json({ success: false, error: "operationId required" });

    const fullOperationPath = `models/veo-3.0-fast-generate-001/operations/${operationId}`;
    const statusRes = await axios.get(`${BASE_URL}/${fullOperationPath}`, {
      headers: { 'x-goog-api-key': GEMINI_API_KEY }
    });

    const done = statusRes.data.done;
    let fileId = null;

    if (done) {
      const uri = statusRes.data.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
      fileId = extractFileId(uri);
      operations[operationId].status = 'done';
      operations[operationId].fileId = fileId;
    } else {
      operations[operationId].status = 'pending';
    }

    res.json({
      success: true,
      status: operations[operationId].status,
      downloadUrl: done ? `/veo/download/${operationId}` : null
    });
  } catch (err) {
    console.error(err?.response?.data || err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==== مسیر دانلود و پخش ویدیو ====
router.get('/download/:operationId', async (req, res) => {
  try {
    const { operationId } = req.params;
    const { download } = req.query;
    const op = operations[operationId];

    if (!op || !op.fileId) {
      return res.status(404).json({ success: false, error: "Video not ready" });
    }

    const googleUrl = `${BASE_URL}/files/${op.fileId}:download?alt=media`;
    const videoRes = await axios.get(googleUrl, {
      headers: { 'x-goog-api-key': GEMINI_API_KEY },
      responseType: 'stream'
    });

    res.setHeader('Content-Type', 'video/mp4');
    if (download === '1') {
      res.setHeader('Content-Disposition', `attachment; filename="txt2vid-${operationId}.mp4"`);
    }

    videoRes.data.pipe(res);
  } catch (err) {
    console.error(err?.response?.data || err.message);
    res.status(500).json({ success: false, error: "Download failed" });
  }
});

export default router;
