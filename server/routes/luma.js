import express from 'express';
import multer from 'multer';
import axios from 'axios';

const router = express.Router();

/* 🔑 API Key و URL سرویس‌ها */
const API_KEY = '3761794009ab2c5268a8b31fece973df';

const FILE_UPLOAD_URL   = 'https://kieai.redpandaai.co/api/file-stream-upload';
const LUMA_GENERATE_URL = 'https://api.kie.ai/api/v1/modify/generate';
const LUMA_STATUS_URL   = 'https://api.kie.ai/api/v1/modify/record-info';

/* 📦 دریافت فایل در حافظه (بدون ذخیره روی دیسک) */
const upload = multer({ storage: multer.memoryStorage() });

/* 🟢 تست سلامت */
router.get('/', (req, res) => {
  res.send('✅ video-modify API route (Luma only) is working.');
});

/* 📤 ایجاد تسک */
router.post('/process', upload.single('video'), async (req, res) => {
  const { prompt, callBackUrl, watermark } = req.body;

  if (!req.file || !prompt) {
    return res.status(400).json({
      error: '❌ ویدیو و پرامپت الزامی هستند.'
    });
  }

  // بررسی فرمت و حجم
  const allowedExt = ['.mp4', '.mov', '.avi'];
  const ext = '.' + (req.file.originalname.split('.').pop() || '').toLowerCase();
  if (!allowedExt.includes(ext))
    return res.status(400).json({ error: '❌ فرمت باید MP4 / MOV / AVI باشد.' });

  if (req.file.size > 500 * 1024 * 1024)
    return res.status(400).json({ error: '❌ حجم ویدیو نباید بیش از 500MB باشد.' });

  try {
    /* 🟡 مرحله ۱: آپلود فایل به KIE.AI برای دریافت لینک عمومی */
    const formData = new FormData();
    formData.append('file', new Blob([req.file.buffer]), req.file.originalname);
    formData.append('uploadPath', 'videos/user-uploads');

    const uploadResp = await fetch(FILE_UPLOAD_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}` },
      body: formData
    });

    const uploadData = await uploadResp.json();
    console.log('📤 Upload API response:', uploadData);

    if (!uploadData.success) {
      return res.status(500).json({
        error: '❌ آپلود به KIE.AI شکست خورد.',
        rawResponse: uploadData
      });
    }

    const videoUrl = uploadData.data.downloadUrl;

    /* 🟢 مرحله ۲: ارسال لینک به LUMA */
    const body = { prompt, videoUrl };
    if (callBackUrl) body.callBackUrl = callBackUrl;
    if (watermark)  body.watermark    = watermark;

    const genResp = await axios.post(LUMA_GENERATE_URL, body, {
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' }
    });

    console.log('📤 Generate API response:', genResp.data);

    const taskId = genResp.data?.data?.taskId;
    if (!taskId) {
      return res.status(500).json({
        upload: { url: videoUrl, downloadUrl: uploadData.data.downloadUrl },
        task: null,
        error: '❌ Task ID دریافت نشد، پاسخ API را بررسی کنید.',
        rawResponse: genResp.data
      });
    }

    res.status(200).json({
      upload: { url: videoUrl, downloadUrl: uploadData.data.downloadUrl },
      task: { taskId },
      msg: '✅ تسک Luma Modify ایجاد شد'
    });
  } catch (err) {
    console.error('❌ Error creating task:', err.response?.data || err.message);
    res.status(err.response?.status || 500)
       .json({ error: err.response?.data || err.message });
  }
});

/* 📊 وضعیت تسک */
router.get('/status/:taskId', async (req, res) => {
  const { taskId } = req.params;

  try {
    const statusResp = await axios.get(`${LUMA_STATUS_URL}?taskId=${taskId}`, {
      headers: { Authorization: `Bearer ${API_KEY}` }
    });

    res.status(200).json(statusResp.data);
  } catch (err) {
    console.error('❌ Status error:', err.response?.data || err.message);
    res.status(err.response?.status || 500)
       .json({ error: err.response?.data || err.message });
  }
});

export default router;
