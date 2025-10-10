import express from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import { Blob } from 'node:buffer';

const router = express.Router();

/* 🔑 API Key و URL سرویس‌ها */
const API_KEY = 'ca6811163e441a6291c30575531cff59';
const FILE_UPLOAD_URL     = 'https://kieai.redpandaai.co/api/file-stream-upload';
const ALEPH_GENERATE_URL  = 'https://api.kie.ai/api/v1/aleph/generate';
const ALEPH_STATUS_URL    = 'https://api.kie.ai/api/v1/aleph/record-info';
const RUNWAY_GENERATE_URL = 'https://api.kie.ai/api/v1/runway/generate';
const RUNWAY_STATUS_URL   = 'https://api.kie.ai/api/v1/runway/record-detail';

/* 📦 دریافت فایل در حافظه */
const upload = multer({ storage: multer.memoryStorage() });

/* 🟢 تست سلامت */
router.get('/', (req, res) => {
  res.send('✅ Video Modify API (ALEPH & RUNWAY) route is active.');
});

/* 📤 ایجاد تسک (Generate) */
router.post('/process', upload.single('video'), async (req, res) => {
  const {
    prompt,
    service,
    callBackUrl,
    watermark,
    aspectRatio,
    duration,
    resolution,
    camera_fixed,
    seed,
    enable_safety_checker,
    end_image_url,
    expandPrompt,
    quality,
    parentTaskId
  } = req.body;

  if (!req.file || !prompt || !service) {
    return res.status(400).json({
      error: '❌ فیلدهای ویدیو، پرامپت و نوع سرویس (aleph/runway) الزامی هستند.'
    });
  }

  try {
    /* 🟡 مرحله ۱: بررسی فرمت و حجم فایل */
    const allowedExt = ['.mp4', '.mov', '.avi'];
    const ext = '.' + (req.file.originalname.split('.').pop() || '').toLowerCase();

    if (!allowedExt.includes(ext))
      return res.status(400).json({ error: '❌ فرمت باید MP4 / MOV / AVI باشد.' });

    if (req.file.size > 500 * 1024 * 1024)
      return res.status(400).json({ error: '❌ حجم ویدیو نباید بیش از 500MB باشد.' });

    /* 🟠 مرحله ۲: آپلود فایل به KIE File Stream */
    const formData = new FormData();
    formData.append('file', new Blob([req.file.buffer]), req.file.originalname);
    formData.append('uploadPath', 'videos/user-uploads');

    const uploadResp = await axios.post(FILE_UPLOAD_URL, formData, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        ...formData.getHeaders()
      },
    });

    const uploadData = uploadResp.data;
    if (!uploadData.success || !uploadData.data?.downloadUrl) {
      return res.status(500).json({
        error: '❌ آپلود به KIE.AI ناموفق بود.',
        rawResponse: uploadData
      });
    }

    const videoUrl = uploadData.data.downloadUrl;

    /* 🔵 مرحله ۳: انتخاب سرویس هدف */
    let genUrl;
    if (service.toLowerCase() === 'aleph') genUrl = ALEPH_GENERATE_URL;
    else if (service.toLowerCase() === 'runway') genUrl = RUNWAY_GENERATE_URL;
    else
      return res.status(400).json({ error: '❌ مقدار service باید aleph یا runway باشد.' });

    /* 🟢 مرحله ۴: آماده‌سازی بدنه درخواست تولید */
    const body = { prompt, videoUrl };

    // افزودن پارامترهای اختیاری فقط در صورت وجود
    if (callBackUrl) body.callBackUrl = callBackUrl;
    if (watermark) body.watermark = watermark;
    if (aspectRatio) body.aspectRatio = aspectRatio;
    if (duration) body.duration = duration;
    if (resolution) body.resolution = resolution;
    if (camera_fixed) body.camera_fixed = camera_fixed;
    if (seed) body.seed = seed;
    if (enable_safety_checker) body.enable_safety_checker = enable_safety_checker;
    if (end_image_url) body.end_image_url = end_image_url;
    if (expandPrompt) body.expandPrompt = expandPrompt;
    if (quality) body.quality = quality;
    if (parentTaskId) body.parentTaskId = parentTaskId;

    /* 🔵 مرحله ۵: ارسال درخواست تولید */
    const genResp = await axios.post(genUrl, body, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const taskId = genResp.data?.data?.taskId;

    if (!taskId) {
      return res.status(500).json({
        upload: { downloadUrl: videoUrl },
        task: null,
        error: '❌ Task ID از پاسخ دریافت نشد.',
        rawResponse: genResp.data
      });
    }

    /* ✅ پاسخ نهایی موفق */
    res.status(200).json({
      success: true,
      upload: { downloadUrl: videoUrl },
      task: { taskId },
      msg: `✅ تسک ${service.toUpperCase()} با موفقیت ایجاد شد.`,
      rawResponse: genResp.data
    });

  } catch (err) {
    console.error('❌ Error creating task:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      success: false,
      error: err.response?.data || err.message
    });
  }
});

/* 📊 وضعیت تسک (Status) */
router.get('/status/:service/:taskId', async (req, res) => {
  const { service, taskId } = req.params;

  if (!taskId)
    return res.status(400).json({ error: '❌ taskId الزامی است.' });

  let statusUrl;
  if (service.toLowerCase() === 'aleph')
    statusUrl = `${ALEPH_STATUS_URL}?taskId=${taskId}`;
  else if (service.toLowerCase() === 'runway')
    statusUrl = `${RUNWAY_STATUS_URL}?taskId=${taskId}`;
  else
    return res.status(400).json({ error: '❌ service باید aleph یا runway باشد.' });

  try {
    const statusResp = await axios.get(statusUrl, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });

    res.status(200).json({
      success: true,
      service,
      taskId,
      data: statusResp.data,
    });
  } catch (err) {
    console.error('❌ Status error:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      success: false,
      error: err.response?.data || err.message,
    });
  }
});

export default router;
