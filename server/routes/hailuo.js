import express from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import fetch from 'node-fetch';

const router = express.Router();

/* 🔑 تنظیمات ثابت */
const API_KEY = process.env.KIE_API_KEY || 'dbd18fd3191266b86bbf18adb81d67d4';
const FILE_UPLOAD_URL = 'https://kieai.redpandaai.co/api/file-stream-upload';
const CREATE_TASK_URL = 'https://api.kie.ai/api/v1/jobs/createTask';
const RECORD_INFO_URL = 'https://api.kie.ai/api/v1/jobs/recordInfo';

const upload = multer({ storage: multer.memoryStorage() });

/* 🔼 آپلود فایل */
const uploadFile = async (file) => {
  if (!file) return null;

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.mimetype))
    throw new Error('فرمت تصویر باید jpeg/png/webp باشد.');
  if (file.size > 10 * 1024 * 1024)
    throw new Error('حجم تصویر باید کمتر از 10MB باشد.');

  const formData = new FormData();
  formData.append('file', file.buffer, { filename: file.originalname });
  formData.append('uploadPath', 'hailuo/uploads');

  const res = await fetch(FILE_UPLOAD_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, ...formData.getHeaders() },
    body: formData,
  });

  if (!res.ok)
    throw new Error(`آپلود تصویر ناموفق بود. Status: ${res.status}`);

  const data = await res.json().catch(async () => {
    const text = await res.text();
    throw new Error('پاسخ JSON معتبر نیست: ' + text);
  });

  if (data.code !== 200 || !data.data?.downloadUrl)
    throw new Error('پاسخ نامعتبر از سرور آپلود فایل.');

  return data.data.downloadUrl;
};

/* 🟢 تست سرور */
router.get('/', (req, res) => res.send('✅ Hailuo API active'));

/* 📤 ایجاد تسک */
router.post('/createTask', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'end_image_url', maxCount: 1 }
]), async (req, res) => {
  try {
    let { model, prompt, duration, resolution, prompt_optimizer, callBackUrl } = req.body;

    // trim ورودی‌ها
    prompt = prompt?.trim();
    duration = duration ? String(duration).trim() : undefined;
    resolution = resolution ? String(resolution).toUpperCase().trim() : undefined;

    if (!model) return res.status(400).json({ error: 'model الزامی است.' });
    if (!prompt) return res.status(400).json({ error: 'prompt الزامی است.' });
    if (prompt.length > 1500) return res.status(400).json({ error: 'طول prompt نباید بیش از 1500 کاراکتر باشد.' });

    // فایل‌ها
    const imageFile = req.files?.image?.[0] || null;
    const endImageFile = req.files?.end_image_url?.[0] || null;

    let image_url = null;
    let end_image_url = null;

    if (imageFile) {
      try { image_url = await uploadFile(imageFile); }
      catch (err) { return res.status(400).json({ error: err.message }); }
    }

    if (endImageFile) {
      try { end_image_url = await uploadFile(endImageFile); }
      catch (err) { return res.status(400).json({ error: err.message }); }
    }

    const parseBool = (v) => v === 'true' || v === true;
    const input = { prompt };

    // مدیریت مدل‌ها
    switch (model) {
      case 'hailuo/02-text-to-video-pro':
        if (prompt_optimizer !== undefined) input.prompt_optimizer = parseBool(prompt_optimizer);
        break;

      case 'hailuo/02-text-to-video-standard':
        if (duration && !['6','10'].includes(duration))
          return res.status(400).json({ error: 'duration باید "6" یا "10" باشد.' });
        if (resolution && !['512P','768P'].includes(resolution))
          return res.status(400).json({ error: 'resolution باید "512P" یا "768P" باشد.' });
        if (prompt_optimizer !== undefined) input.prompt_optimizer = parseBool(prompt_optimizer);
        if (duration) input.duration = duration;
        if (resolution) input.resolution = resolution;
        break;

      case 'hailuo/02-image-to-video-pro':
      case 'hailuo/02-image-to-video-standard':
        if (!image_url) return res.status(400).json({ error: 'image_url الزامی است.' });
        input.image_url = image_url;
        if (end_image_url) input.end_image_url = end_image_url;
        if (duration && !['6','10'].includes(duration))
          return res.status(400).json({ error: 'duration باید "6" یا "10" باشد.' });
        if (resolution && !['512P','768P'].includes(resolution))
          return res.status(400).json({ error: 'resolution باید "512P" یا "768P" باشد.' });
        if (duration) input.duration = duration;
        if (resolution) input.resolution = resolution;
        if (prompt_optimizer !== undefined) input.prompt_optimizer = parseBool(prompt_optimizer);
        break;

      default:
        return res.status(400).json({ error: 'مدل ارسالی معتبر نیست.' });
    }

    // بدنه نهایی
    const body = { model, input };
    if (callBackUrl) {
      try { new URL(callBackUrl); body.callBackUrl = callBackUrl; }
      catch { return res.status(400).json({ error: 'callBackUrl معتبر نیست.' }); }
    }

    // ارسال به API
    let response;
    try {
      response = await axios.post(CREATE_TASK_URL, body, {
        headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' }
      });
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      return res.status(err.response?.status || 500).json({ error: 'خطا در ایجاد تسک: ' + msg });
    }

    const result = response.data;
    if (result.code !== 200 || !result.data?.taskId)
      return res.status(500).json({ error: 'ایجاد تسک ناموفق بود.', raw: result });

    res.status(200).json({
      success: true,
      message: 'تسک با موفقیت ایجاد شد',
      taskId: result.data.taskId,
      uploadImage: image_url || null,
      uploadEndImage: end_image_url || null
    });

  } catch (err) {
    console.error('CreateTask Error:', err.response?.data || err.message, err.response?.status);
    res.status(err.response?.status || 500).json({ error: 'خطا در ارتباط با سرویس.' });
  }
});

/* 📊 بررسی وضعیت تسک */
router.get('/recordInfo/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    if (!taskId) return res.status(400).json({ error: 'taskId الزامی است.' });

    const resp = await axios.get(`${RECORD_INFO_URL}?taskId=${taskId}`, {
      headers: { Authorization: `Bearer ${API_KEY}` }
    });

    res.status(200).json(resp.data);

  } catch (err) {
    console.error('RecordInfo Error:', err.response?.data || err.message, err.response?.status);
    res.status(err.response?.status || 500).json({ error: 'خطا در دریافت وضعیت تسک.' });
  }
});

export default router;
