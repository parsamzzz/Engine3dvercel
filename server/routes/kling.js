import express from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import fetch from 'node-fetch';

const router = express.Router();
const API_KEY = process.env.KIE_API_KEY || 'dbd18fd3191266b86bbf18adb81d67d4';

const FILE_UPLOAD_URL = 'https://kieai.redpandaai.co/api/file-stream-upload';
const CREATE_TASK_URL = 'https://api.kie.ai/api/v1/jobs/createTask';
const RECORD_INFO_URL = 'https://api.kie.ai/api/v1/jobs/recordInfo';

// 📦 فایل‌ها در حافظه نگهداری می‌شن
const upload = multer({ storage: multer.memoryStorage() });

// 🔹 تابع آپلود فایل به KIE.AI
const uploadFile = async (file) => {
  if (!file) return null;

  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.mimetype)) {
    throw new Error('❌ فرمت تصویر مجاز نیست (jpeg/png/webp).');
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('❌ حجم تصویر باید کمتر از 10MB باشد.');
  }

  const formData = new FormData();
  formData.append('file', file.buffer, file.originalname);
  formData.append('uploadPath', 'images/user-uploads');

  const uploadResp = await fetch(FILE_UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      ...formData.getHeaders()
    },
    body: formData
  });

  if (!uploadResp.ok) {
    throw new Error(`❌ آپلود تصویر شکست خورد. وضعیت: ${uploadResp.status}`);
  }

  const uploadData = await uploadResp.json();
  if (uploadData.code !== 200 || !uploadData.data?.downloadUrl) {
    throw new Error('❌ پاسخ نامعتبر از سرور آپلود فایل.');
  }

  return uploadData.data.downloadUrl;
};

// 🔹 ایجاد Task
router.post(
  '/createTask',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'tail_image', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const {
        model,
        prompt,
        duration,
        aspect_ratio,
        negative_prompt,
        cfg_scale,
        callBackUrl
      } = req.body;

      const imageFile = req.files?.['image']?.[0];
      const tailFile = req.files?.['tail_image']?.[0];

      let image_url = imageFile ? await uploadFile(imageFile) : null;
      let tail_image_url = tailFile ? await uploadFile(tailFile) : null;

      if (prompt && prompt.length > 5000)
        return res.status(400).json({ error: '❌ طول prompt نباید بیش از 5000 کاراکتر باشد.' });
      if (negative_prompt && negative_prompt.length > 500)
        return res.status(400).json({ error: '❌ طول negative_prompt نباید بیش از 500 کاراکتر باشد.' });

      // 🔸 ساخت ورودی بر اساس مدل
      const input = {};

      switch (model) {
        // مدل‌های قدیمی 2.1
        case 'kling/v2-1-master-image-to-video':
        case 'kling/v2-1-standard':
          if (!prompt || !image_url)
            return res.status(400).json({ error: '❌ prompt و image_url الزامی است.' });
          input.prompt = prompt;
          input.image_url = image_url;
          break;

        case 'kling/v2-1-master-text-to-video':
          if (!prompt)
            return res.status(400).json({ error: '❌ prompt الزامی است.' });
          input.prompt = prompt;
          if (aspect_ratio) input.aspect_ratio = aspect_ratio;
          break;

        case 'kling/v2-1-pro':
          if (!prompt || !image_url)
            return res.status(400).json({ error: '❌ prompt و image_url الزامی است.' });
          input.prompt = prompt;
          input.image_url = image_url;
          if (tail_image_url) input.tail_image_url = tail_image_url;
          break;

        // مدل‌های جدید 2.5
        case 'kling/v2-5-turbo-image-to-video-pro':
          if (!prompt || !image_url)
            return res.status(400).json({ error: '❌ prompt و image_url الزامی است.' });
          input.prompt = prompt;
          input.image_url = image_url;
          break;

        case 'kling/v2-5-turbo-text-to-video-pro':
          if (!prompt)
            return res.status(400).json({ error: '❌ prompt الزامی است.' });
          input.prompt = prompt;
          break;

        default:
          return res.status(400).json({ error: '❌ مدل نامعتبر است.' });
      }

      // 🔹 اضافه کردن پارامترهای اختیاری به صورت یکنواخت
      if (duration) input.duration = duration.toString();
      if (aspect_ratio) input.aspect_ratio = aspect_ratio;
      if (negative_prompt) input.negative_prompt = negative_prompt;
      if (tail_image_url) input.tail_image_url = tail_image_url;
      if (cfg_scale !== undefined) {
        const scale = parseFloat(cfg_scale);
        if (scale < 0 || scale > 1)
          return res.status(400).json({ error: '❌ cfg_scale باید بین 0 و 1 باشد.' });
        input.cfg_scale = scale;
      }

      const taskBody = { model, input };
      if (callBackUrl) taskBody.callBackUrl = callBackUrl;

      const taskRes = await axios.post(CREATE_TASK_URL, taskBody, {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      res.json(taskRes.data);
    } catch (err) {
      console.error('❌ خطا در ایجاد Task:', err.response?.data || err.message);
      res.status(500).json({
        error: '❌ خطا در ایجاد Task',
        details: err.response?.data || err.message
      });
    }
  }
);

// 🔹 گرفتن وضعیت Task
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
    console.error(err.response?.data || err.message);
    res.status(500).json({
      error: '❌ خطا در گرفتن وضعیت Task',
      details: err.response?.data || err.message
    });
  }
});

export default router;
