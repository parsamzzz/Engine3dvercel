import express from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import fetch from 'node-fetch';

const router = express.Router();

/* 🔑 API Key و URL سرویس‌ها */
const API_KEY = process.env.KIE_API_KEY || 'dbd18fd3191266b86bbf18adb81d67d4';
const FILE_UPLOAD_URL = 'https://kieai.redpandaai.co/api/file-stream-upload';
const LUMA_MODIFY_GENERATE_URL = 'https://api.kie.ai/api/v1/modify/generate';
const LUMA_MODIFY_STATUS_URL = 'https://api.kie.ai/api/v1/modify/record-info';
const LUMA_REFRAME_GENERATE_URL = 'https://api.kie.ai/api/v1/jobs/createTask';
const LUMA_REFRAME_STATUS_URL = 'https://api.kie.ai/api/v1/jobs/recordInfo';

/* 📦 آپلود در حافظه */
const upload = multer({ storage: multer.memoryStorage() });

/* 🔹 آپلود فایل عمومی */
const uploadFile = async (file, folder = 'videos/user-uploads') => {
  if (!file) throw new Error('❌ فایل الزامی است.');

  const ext = '.' + (file.originalname.split('.').pop() || '').toLowerCase();
  const allowed = ['.mp4', '.mov', '.avi', '.jpeg', '.jpg', '.png', '.webp'];
  if (!allowed.includes(ext)) throw new Error(`❌ فرمت ${ext} مجاز نیست.`);

  if (['.mp4', '.mov', '.avi'].includes(ext) && file.size > 500 * 1024 * 1024)
    throw new Error('❌ حجم ویدیو نباید بیش از 500MB باشد.');
  if (['.jpeg', '.jpg', '.png', '.webp'].includes(ext) && file.size > 10 * 1024 * 1024)
    throw new Error('❌ حجم تصویر نباید بیش از 10MB باشد.');

  const formData = new FormData();
  formData.append('file', file.buffer, file.originalname);
  formData.append('uploadPath', folder);

  const uploadResp = await fetch(FILE_UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      ...formData.getHeaders()
    },
    body: formData
  });

  if (!uploadResp.ok) throw new Error(`❌ آپلود فایل شکست خورد. Status: ${uploadResp.status}`);

  const uploadData = await uploadResp.json();
  if (uploadData.code !== 200 || !uploadData.data?.downloadUrl)
    throw new Error('❌ پاسخ نامعتبر از سرور آپلود فایل.');

  return uploadData.data.downloadUrl;
};

/* 🟢 تست سلامت */
router.get('/', (req, res) => {
  res.send('✅ Luma API routes working.');
});

/* ================== */
/* ===== MODIFY ===== */
/* ================== */
router.post('/modify', upload.single('video'), async (req, res) => {
  const { prompt, callBackUrl, watermark } = req.body;
  const file = req.file;

  if (!file) return res.status(400).json({ error: '❌ فایل ویدیو الزامی است.' });
  if (!prompt) return res.status(400).json({ error: '❌ prompt الزامی است.' });

  try {
    const videoUrl = await uploadFile(file);

    const body = { prompt, videoUrl };
    if (callBackUrl) body.callBackUrl = callBackUrl;
    if (watermark) body.watermark = watermark;

    const genResp = await axios.post(LUMA_MODIFY_GENERATE_URL, body, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
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
  if (!taskId) return res.status(400).json({ error: '❌ taskId الزامی است.' });

  try {
    const statusResp = await axios.get(`${LUMA_MODIFY_STATUS_URL}?taskId=${taskId}`, {
      headers: { Authorization: `Bearer ${API_KEY}` }
    });

    // حذف paramJson و originUrls بدون تغییر بقیه
    const data = { ...statusResp.data.data };
    delete data.paramJson;
    if (data.response) delete data.response.originUrls;

    res.status(200).json({ ...statusResp.data, data });
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

  try {
    const videoUrl = await uploadFile(req.file);

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
  if (!taskId) return res.status(400).json({ error: '❌ taskId الزامی است.' });

  try {
    const statusResp = await axios.get(`${LUMA_REFRAME_STATUS_URL}?taskId=${taskId}`, {
      headers: { Authorization: `Bearer ${API_KEY}` }
    });

    // حذف paramJson و originUrls بدون تغییر بقیه
    const data = { ...statusResp.data.data };
    delete data.paramJson;
    if (data.response) delete data.response.originUrls;

    res.status(200).json({ ...statusResp.data, data });
  } catch (err) {
    console.error('❌ Reframe status error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

export default router;
