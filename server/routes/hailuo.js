import express from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import fetch from 'node-fetch';

const router = express.Router();

/* 🔑 تنظیمات ثابت */
const API_KEY = process.env.KIE_API_KEY || "dbd18fd3191266b86bbf18adb81d67d4";
const FILE_UPLOAD_URL = 'https://kieai.redpanda123.com/api/v1/file/upload';
const CREATE_TASK_URL = 'https://kieai.redpanda123.com/api/v1/jobs/createTask';
const RECORD_INFO_URL = 'https://kieai.redpanda123.com/api/v1/jobs/recordInfo';

/* 📦 تنظیم Multer برای آپلود فایل در حافظه */
const upload = multer({ storage: multer.memoryStorage() });

/* 🟢 تست سرور */
router.get('/', (req, res) => res.send('✅ Hailuo API route active'));

/* 📤 ایجاد تسک */
router.post('/createTask', upload.single('image'), async (req, res) => {
  try {
    const {
      model,
      prompt,
      duration,
      resolution,
      prompt_optimizer,
      callBackUrl,
      end_image_url
    } = req.body;

    /* 1️⃣ بررسی ورودی‌های پایه */
    if (!model) return res.status(400).json({ error: '❌ model الزامی است.' });
    if (!prompt) return res.status(400).json({ error: '❌ prompt الزامی است.' });
    if (prompt.length > 1500)
      return res.status(400).json({ error: '❌ طول prompt نباید بیش از 1500 کاراکتر باشد.' });

    /* 2️⃣ آپلود فایل در صورت وجود */
    let image_url = null;

    if (req.file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(req.file.mimetype))
        return res.status(400).json({ error: '❌ فقط فرمت‌های JPG, PNG, WEBP مجاز هستند.' });

      if (req.file.size > 10 * 1024 * 1024)
        return res.status(400).json({ error: '❌ حجم فایل نباید بیش از 10MB باشد.' });

      const formData = new FormData();
      formData.append('file', req.file.buffer, req.file.originalname);
      formData.append('uploadPath', 'hailuo/uploads');

      const uploadResp = await fetch(FILE_UPLOAD_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${API_KEY}` },
        body: formData
      });

      const uploadData = await uploadResp.json();
      if (!uploadData?.success || !uploadData?.data?.downloadUrl) {
        return res
          .status(500)
          .json({ error: '❌ آپلود تصویر ناموفق بود.', rawResponse: uploadData });
      }
      image_url = uploadData.data.downloadUrl;
    }

    /* 3️⃣ بررسی صحت پارامترها بر اساس مدل */
    const parseBool = (v) => v === 'true' || v === true;
    const input = { prompt };

    switch (model) {
      // 🟦 TEXT → VIDEO (PRO)
      case 'hailuo/02-text-to-video-pro':
        if (prompt_optimizer !== undefined)
          input.prompt_optimizer = parseBool(prompt_optimizer);
        break;

      // 🟥 TEXT → VIDEO (STANDARD)
      case 'hailuo/02-text-to-video-standard':
        if (duration && !['6', '10'].includes(duration))
          return res
            .status(400)
            .json({ error: '❌ مقدار duration فقط می‌تواند 6 یا 10 باشد.' });
        if (prompt_optimizer !== undefined)
          input.prompt_optimizer = parseBool(prompt_optimizer);
        if (duration) input.duration = Number(duration);
        break;

      // 🟩 IMAGE → VIDEO (PRO)
      case 'hailuo/02-image-to-video-pro':
        if (!image_url)
          return res
            .status(400)
            .json({ error: '❌ برای مدل image-to-video-pro تصویر الزامی است.' });
        input.image_url = image_url;
        if (end_image_url) input.end_image_url = end_image_url;
        if (prompt_optimizer !== undefined)
          input.prompt_optimizer = parseBool(prompt_optimizer);
        break;

      // 🟨 IMAGE → VIDEO (STANDARD)
      case 'hailuo/02-image-to-video-standard':
        if (!image_url)
          return res
            .status(400)
            .json({ error: '❌ برای مدل image-to-video-standard تصویر الزامی است.' });
        input.image_url = image_url;
        if (end_image_url) input.end_image_url = end_image_url;

        if (duration && !['6', '10'].includes(duration))
          return res
            .status(400)
            .json({ error: '❌ مقدار duration فقط می‌تواند 6 یا 10 باشد.' });
        if (resolution && !['512P', '768P'].includes(resolution))
          return res
            .status(400)
            .json({ error: '❌ مقدار resolution فقط می‌تواند 512P یا 768P باشد.' });

        if (duration) input.duration = Number(duration);
        if (resolution) input.resolution = resolution;
        if (prompt_optimizer !== undefined)
          input.prompt_optimizer = parseBool(prompt_optimizer);
        break;

      default:
        return res.status(400).json({ error: '❌ مدل ارسالی معتبر نیست.' });
    }

    /* 4️⃣ ساخت بدنه نهایی درخواست */
    const body = { model, input };
    if (callBackUrl) {
      const validUrl = /^https?:\/\/[^\s$.?#].[^\s]*$/;
      if (!validUrl.test(callBackUrl))
        return res.status(400).json({ error: '❌ callBackUrl باید یک URL معتبر باشد.' });
      body.callBackUrl = callBackUrl;
    }

    /* 🚀 ارسال به API اصلی */
    const response = await axios.post(CREATE_TASK_URL, body, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const result = response.data;
    if (result.code !== 200 || !result.data?.taskId) {
      return res
        .status(500)
        .json({ error: '❌ ایجاد تسک ناموفق بود.', rawResponse: result });
    }

    res.status(200).json({
      success: true,
      message: '✅ تسک با موفقیت ایجاد شد',
      taskId: result.data.taskId,
      uploadImage: image_url || null
    });
  } catch (err) {
    console.error('CreateTask Error:', err.response?.data || err.message);
    res
      .status(err.response?.status || 500)
      .json({ error: '❌ خطایی در ارتباط با سرویس  رخ داد.' });
  }
});

/* 📊 بررسی وضعیت تسک */
router.get('/recordInfo/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    if (!taskId) return res.status(400).json({ error: '❌ taskId الزامی است.' });

    const resp = await axios.get(`${RECORD_INFO_URL}?taskId=${taskId}`, {
      headers: { Authorization: `Bearer ${API_KEY}` }
    });

    res.status(200).json(resp.data);
  } catch (err) {
    console.error('RecordInfo Error:', err.response?.data || err.message);
    res
      .status(err.response?.status || 500)
      .json({ error: '❌ خطایی در دریافت وضعیت تسک رخ داد.' });
  }
});

export default router;
