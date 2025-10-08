// server/routes/wanAI.js
import express from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import fetch from 'node-fetch';

const router = express.Router();

/* 🔑 کلید API (فقط روی سرور) */
const API_KEY = '223eaeae057df456a48746b0338448d8';

/* 🔗 URL های سرویس WAN */
const FILE_UPLOAD_URL = 'https://kieai.redpandaai.co/api/file-stream-upload';
const CREATE_TASK_URL = 'https://api.kie.ai/api/v1/jobs/createTask';
const RECORD_INFO_URL = 'https://api.kie.ai/api/v1/jobs/recordInfo';

/* 📦 ذخیره فایل در حافظه */
const upload = multer({ storage: multer.memoryStorage() });

/* 🟢 تست سلامت */
router.get('/', (req, res) => {
  res.send('✅ WAN AI API route is working.');
});

/* 📤 ایجاد Task جدید */
router.post('/createTask', upload.single('image'), async (req, res) => {
  try {
    const {
      model,
      callBackUrl,
      prompt,
      resolution,
      aspect_ratio,
      enable_prompt_expansion,
      seed,
      acceleration
    } = req.body;

    if (!model || (!prompt && !req.file)) {
      return res.status(400).json({ error: '❌ model و prompt یا image الزامی هستند.' });
    }

    let image_url = null;

    /* 🟡 آپلود تصویر در صورت وجود */
    if (req.file) {
      const allowed = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowed.includes(req.file.mimetype)) {
        return res.status(400).json({ error: '❌ فرمت تصویر مجاز نیست. (jpeg/png/webp)' });
      }
      if (req.file.size > 10 * 1024 * 1024) {
        return res.status(400).json({ error: '❌ حجم تصویر باید کمتر از 10MB باشد.' });
      }

      const formData = new FormData();
      formData.append('file', req.file.buffer, req.file.originalname);
      formData.append('uploadPath', 'images/user-uploads');

      const uploadResp = await fetch(FILE_UPLOAD_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${API_KEY}` },
        body: formData
      });

      const uploadData = await uploadResp.json();
      if ((uploadData.code && uploadData.code !== 200) || uploadData.success === false) {
        console.error('❌ آپلود تصویر شکست خورد:', uploadData);
        return res.status(500).json({ error: '❌ آپلود تصویر شکست خورد.' });
      }

      image_url = uploadData.data?.downloadUrl;
    }

    /* 🟢 آماده‌سازی ورودی برای ایجاد Task */
    const input = {};
    if (prompt) input.prompt = prompt;
    if (resolution) input.resolution = resolution;
    if (aspect_ratio) input.aspect_ratio = aspect_ratio;
    if (typeof enable_prompt_expansion !== 'undefined') {
      input.enable_prompt_expansion =
        enable_prompt_expansion === true || enable_prompt_expansion === 'true';
    }
    if (seed) input.seed = parseInt(seed);
    if (acceleration) input.acceleration = acceleration;
    if (image_url) input.image_url = image_url;

    const body = { model, input };
    if (callBackUrl) body.callBackUrl = callBackUrl;

    // 📜 لاگ سرور برای CreateTask
    console.log('🚀 [WAN] ایجاد تسک جدید:', { model, hasImage: !!image_url });

    /* 🚀 ارسال درخواست ایجاد Task */
    const taskResp = await axios.post(CREATE_TASK_URL, body, {
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' }
    });

    if (taskResp.data.code !== 200 || !taskResp.data.data?.taskId) {
      console.error('❌ [WAN] Task ایجاد نشد:', taskResp.data);
      return res.status(500).json({ error: '❌ Task ایجاد نشد.' });
    }

    res.status(200).json({
      taskId: taskResp.data.data.taskId,
      msg: '✅ Task با موفقیت ایجاد شد.',
      uploadImage: image_url || null
    });
  } catch (err) {
    console.error('🚨 [WAN] CreateTask Error:', err.response?.data || err.message);
    res.status(500).json({ error: '❌ خطای داخلی سرور هنگام ایجاد Task.' });
  }
});

/* 📊 بررسی وضعیت Task */
router.get('/recordInfo/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    if (!taskId) return res.status(400).json({ error: '❌ taskId الزامی است.' });

    const statusResp = await axios.get(`${RECORD_INFO_URL}?taskId=${taskId}`, {
      headers: { Authorization: `Bearer ${API_KEY}` }
    });

    let parsedResults = null;
    if (statusResp.data?.data?.resultJson) {
      try {
        parsedResults = JSON.parse(statusResp.data.data.resultJson);
      } catch {
        parsedResults = null;
      }
    }

    res.status(200).json({ ...statusResp.data, parsedResults });
  } catch (err) {
    console.error('🚨 [WAN] RecordInfo Error:', err.response?.data || err.message);
    res.status(500).json({ error: '❌ خطا در دریافت وضعیت Task.' });
  }
});

export default router;
