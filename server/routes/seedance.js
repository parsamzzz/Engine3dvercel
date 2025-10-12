import express from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import fetch from 'node-fetch';

const router = express.Router();

const API_KEY = process.env.KIE_API_KEY || 'dbd18fd3191266b86bbf18adb81d67d4';

// 📡 URLهای اصلی
const FILE_UPLOAD_URL = 'https://kieai.redpandaai.co/api/file-stream-upload';
const CREATE_TASK_URL = 'https://api.kie.ai/api/v1/jobs/createTask';
const RECORD_INFO_URL = 'https://api.kie.ai/api/v1/jobs/recordInfo';

// 📦 فایل‌ها در حافظه نگهداری می‌شن
const upload = multer({ storage: multer.memoryStorage() });

// 🔹 تابع آپلود فایل تصویر به KIE.AI
const uploadFile = async (file) => {
  if (!file) return '';

  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.mimetype)) {
    throw new Error('❌ فرمت تصویر مجاز نیست (jpeg/png/webp).');
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error('❌ حجم تصویر باید کمتر از 10MB باشد.');
  }

  const formData = new FormData();
  formData.append('file', file.buffer, file.originalname);
  formData.append('uploadPath', 'images/seedance');

  const response = await fetch(FILE_UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      ...formData.getHeaders()
    },
    body: formData
  });

  const data = await response.json();
  if (data.code !== 200 || !data.data?.downloadUrl) {
    throw new Error('❌ خطا در آپلود تصویر به سرور KIE.AI');
  }

  return data.data.downloadUrl;
};

// 🧩 ایجاد تسک (Create Task)
router.post(
  '/createTask',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'end_image', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const {
        model,
        prompt,
        aspect_ratio,
        resolution,
        duration,
        camera_fixed,
        seed,
        enable_safety_checker,
        callBackUrl
      } = req.body;

      // 📷 آپلود تصویرها در صورت نیاز
      const imageFile = req.files?.['image']?.[0];
      const endImageFile = req.files?.['end_image']?.[0];

      let image_url = '';
      let end_image_url = '';

      if (imageFile) image_url = await uploadFile(imageFile);
      if (endImageFile) end_image_url = await uploadFile(endImageFile);

      // ✅ ساخت input بر اساس نوع مدل
      const input = {};

      switch (model) {
        case 'bytedance/v1-pro-text-to-video':
        case 'bytedance/v1-lite-text-to-video':
          if (!prompt) return res.status(400).json({ error: '❌ prompt الزامی است.' });
          input.prompt = prompt;
          break;

        case 'bytedance/v1-pro-image-to-video':
        case 'bytedance/v1-lite-image-to-video':
          if (!prompt || !image_url)
            return res.status(400).json({ error: '❌ prompt و image_url الزامی است.' });
          input.prompt = prompt;
          input.image_url = image_url;
          if (end_image_url) input.end_image_url = end_image_url;
          break;

        default:
          return res.status(400).json({ error: '❌ مدل نامعتبر است.' });
      }

      // 🧠 پارامترهای مشترک بین همه مدل‌ها
      if (aspect_ratio) input.aspect_ratio = aspect_ratio;
      if (resolution) input.resolution = resolution;
      if (duration) input.duration = duration;
      if (camera_fixed) input.camera_fixed = camera_fixed === 'true';
      if (seed) input.seed = Number(seed);
      if (enable_safety_checker)
        input.enable_safety_checker = enable_safety_checker === 'true';

      const body = { model, input };
      if (callBackUrl) body.callBackUrl = callBackUrl;

      // 🛰️ ارسال درخواست به KIE.AI
      const response = await axios.post(CREATE_TASK_URL, body, {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      res.json(response.data);
    } catch (err) {
      console.error('❌ خطا در ایجاد Task:', err.response?.data || err.message);
      res.status(500).json({
        error: '❌ خطا در ایجاد Task',
        details: err.response?.data || err.message
      });
    }
  }
);

// 🕓 گرفتن وضعیت Task
router.get('/recordInfo', async (req, res) => {
  try {
    const { taskId } = req.query;
    if (!taskId)
      return res.status(400).json({ error: '❌ taskId الزامی است.' });

    const response = await axios.get(`${RECORD_INFO_URL}?taskId=${taskId}`, {
      headers: { Authorization: `Bearer ${API_KEY}` }
    });

    res.json(response.data);
  } catch (err) {
    console.error('❌ خطا در گرفتن وضعیت:', err.response?.data || err.message);
    res.status(500).json({
      error: '❌ خطا در گرفتن وضعیت Task',
      details: err.response?.data || err.message
    });
  }
});

export default router;
