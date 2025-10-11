import express from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import fetch from 'node-fetch';

const router = express.Router();

/* 🔑 API Key و URL سرویس‌ها */
const API_KEY = '3bde9bb7f13f99eb4bd62496476338bc';
const FILE_UPLOAD_URL = 'https://kieai.redpandaai.co/api/file-stream-upload';
const LUMA_MODIFY_GENERATE_URL = 'https://api.kie.ai/api/v1/modify/generate';
const LUMA_MODIFY_STATUS_URL = 'https://api.kie.ai/api/v1/modify/record-info';
const LUMA_REFRAME_GENERATE_URL = 'https://api.kie.ai/api/v1/jobs/createTask';
const LUMA_REFRAME_STATUS_URL = 'https://api.kie.ai/api/v1/jobs/recordInfo';

/* 📦 آپلود در حافظه */
const upload = multer({ storage: multer.memoryStorage() });

/* 🟢 تست سلامت */
router.get('/', (req, res) => {
  res.send('✅ Luma API routes working.');
});

/* ================== */
/* ===== MODIFY ===== */
/* ================== */
router.post('/modify', upload.single('video'), async (req, res) => {
  const { prompt, callBackUrl, watermark } = req.body;

  if (!req.file) return res.status(400).json({ error: '❌ فایل ویدیو الزامی است.' });

  const ext = '.' + (req.file.originalname.split('.').pop() || '').toLowerCase();
  if (!['.mp4', '.mov', '.avi'].includes(ext))
    return res.status(400).json({ error: '❌ فرمت باید MP4 / MOV / AVI باشد.' });

  if (req.file.size > 500 * 1024 * 1024)
    return res.status(400).json({ error: '❌ حجم ویدیو نباید بیش از 500MB باشد.' });

  try {
    // آپلود فایل
    const formData = new FormData();
    formData.append('file', new Blob([req.file.buffer]), req.file.originalname);
    formData.append('uploadPath', 'videos/user-uploads');

    const uploadResp = await fetch(FILE_UPLOAD_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}` },
      body: formData
    });
    const uploadData = await uploadResp.json();
    if (!uploadData.success) throw new Error('❌ آپلود فایل شکست خورد.');

    const videoUrl = uploadData.data.downloadUrl;

    // ایجاد تسک Modify
    const body = { prompt, videoUrl };
    if (callBackUrl) body.callBackUrl = callBackUrl;
    if (watermark) body.watermark = watermark;

    const genResp = await axios.post(LUMA_MODIFY_GENERATE_URL, body, {
      headers: { Authorization: `Bearer ${API_KEY}` }
    });

    const taskId = genResp.data?.data?.taskId;
    if (!taskId) throw new Error('❌ Task ID دریافت نشد.');

    res.status(200).json({ upload: { url: videoUrl }, task: { taskId }, msg: '✅ Modify task created.' });

  } catch (err) {
    console.error('❌ Modify error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

router.get('/modify/status/:taskId', async (req, res) => {
  const { taskId } = req.params;
  try {
    const statusResp = await axios.get(`${LUMA_MODIFY_STATUS_URL}?taskId=${taskId}`, {
      headers: { Authorization: `Bearer ${API_KEY}` }
    });
    res.status(200).json(statusResp.data);
  } catch (err) {
    console.error('❌ Modify status error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

/* ================== */
/* ===== REFRAME ==== */
/* ================== */
router.post('/reframe', upload.single('video'), async (req, res) => {
  const {
    model,
    aspect_ratio,
    duration,
    grid_position_x,
    grid_position_y,
    x_start,
    y_start,
    x_end,
    y_end,
    keepMainObject,
    callBackUrl,
    prompt
  } = req.body;

  if (!req.file) return res.status(400).json({ error: '❌ فایل ویدیو الزامی است.' });

  const ext = '.' + (req.file.originalname.split('.').pop() || '').toLowerCase();
  if (!['.mp4', '.mov', '.avi'].includes(ext))
    return res.status(400).json({ error: '❌ فرمت باید MP4 / MOV / AVI باشد.' });

  if (req.file.size > 500 * 1024 * 1024)
    return res.status(400).json({ error: '❌ حجم ویدیو نباید بیش از 500MB باشد.' });

  try {
    // آپلود فایل
    const formData = new FormData();
    formData.append('file', new Blob([req.file.buffer]), req.file.originalname);
    formData.append('uploadPath', 'videos/user-uploads');

    const uploadResp = await fetch(FILE_UPLOAD_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}` },
      body: formData
    });
    const uploadData = await uploadResp.json();
    if (!uploadData.success) throw new Error('❌ آپلود فایل شکست خورد.');

    const videoUrl = uploadData.data.downloadUrl;

    // ایجاد تسک Reframe
    const body = {
      model: model || 'luma-dream-machine/ray-2-flash-reframe',
      callBackUrl,
      input: {
        video_url: videoUrl,
        aspect_ratio: aspect_ratio || '9:16',
        duration: duration || '5',
        grid_position_x: Number(grid_position_x) || 50,
        grid_position_y: Number(grid_position_y) || 50,
        x_start: Number(x_start) || 0,
        y_start: Number(y_start) || 0,
        x_end: Number(x_end) || 1920,
        y_end: Number(y_end) || 1080,
        keepMainObject: keepMainObject === 'true' || keepMainObject === true,
        prompt: prompt || ''
      }
    };

    const genResp = await axios.post(LUMA_REFRAME_GENERATE_URL, body, {
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' }
    });

    const taskId = genResp.data?.data?.taskId;
    if (!taskId) throw new Error('❌ Task ID دریافت نشد.');

    res.status(200).json({ upload: { url: videoUrl }, task: { taskId }, msg: '✅ Reframe task created.' });

  } catch (err) {
    console.error('❌ Reframe error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

router.get('/reframe/status/:taskId', async (req, res) => {
  const { taskId } = req.params;
  try {
    const statusResp = await axios.get(`${LUMA_REFRAME_STATUS_URL}?taskId=${taskId}`, {
      headers: { Authorization: `Bearer ${API_KEY}` }
    });
    res.status(200).json(statusResp.data);
  } catch (err) {
    console.error('❌ Reframe status error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

export default router;
