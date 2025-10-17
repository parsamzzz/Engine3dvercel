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

      // 🧠 چک پارامترهای مشترک بین همه مدل‌ها
      const validRatios = ['16:9','4:3','1:1','3:4','9:16','21:9','9:21'];
      if (aspect_ratio) {
        if (!validRatios.includes(aspect_ratio))
          return res.status(400).json({ error: '❌ aspect_ratio نامعتبر است.' });
        input.aspect_ratio = aspect_ratio;
      }

      const validResolutions = ['480p', '720p', '1080p'];
      if (resolution) {
        if (!validResolutions.includes(resolution))
          return res.status(400).json({ error: '❌ resolution نامعتبر است.' });
        input.resolution = resolution;
      }

      const validDurations = ['5', '10'];
      if (duration) {
        if (!validDurations.includes(duration.toString()))
          return res.status(400).json({ error: '❌ duration نامعتبر است.' });
        input.duration = duration.toString();
      }

      if (camera_fixed !== undefined)
        input.camera_fixed = camera_fixed === 'true' || camera_fixed === true;

      if (enable_safety_checker !== undefined)
        input.enable_safety_checker =
          enable_safety_checker === 'true' || enable_safety_checker === true;

      if (seed !== undefined && seed !== null && seed !== '') {
        const numSeed = Number(seed);
        if (isNaN(numSeed) || numSeed < -1 || numSeed > 2147483647)
          return res.status(400).json({ error: '❌ seed نامعتبر است.' });
        input.seed = numSeed;
      }

      // ✅ ساخت body نهایی
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

// 🕓 گرفتن وضعیت Task بدون فیلد param
router.get('/recordInfo', async (req, res) => {
  try {
    const { taskId } = req.query;
    if (!taskId)
      return res.status(400).json({ error: '❌ taskId الزامی است.' });

    const response = await axios.get(`${RECORD_INFO_URL}?taskId=${taskId}`, {
      headers: { Authorization: `Bearer ${API_KEY}` }
    });

    // حذف فیلد param از داده برگشتی
    const data = { ...response.data.data };
    if ('param' in data) delete data.param;

    res.json({
      code: response.data.code,
      msg: response.data.msg,
      data
    });
  } catch (err) {
    console.error('❌ خطا در گرفتن وضعیت:', err.response?.data || err.message);
    res.status(500).json({
      error: '❌ خطا در گرفتن وضعیت Task',
      details: err.response?.data || err.message
    });
  }
});

export default router;
