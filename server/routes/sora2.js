import express from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import fetch from 'node-fetch';

const router = express.Router();

/* 🔑 API Key و URLها */
const API_KEY = '519384c53845320baee5ab7954d12eaa';   // ⬅️ کلید Kie AI خودتان
const FILE_UPLOAD_URL = 'https://kieai.redpandaai.co/api/file-stream-upload';
const CREATE_TASK_URL = 'https://api.kie.ai/api/v1/jobs/createTask';
const RECORD_INFO_URL = 'https://api.kie.ai/api/v1/jobs/recordInfo';

/* 📦 ذخیره فایل در حافظه */
const upload = multer({ storage: multer.memoryStorage() });

/* 🟢 تست سلامت */
router.get('/', (req, res) => {
  res.send('✅ Sora2 API route is working.');
});

/* 📤 ایجاد Task جدید */
router.post('/createTask', upload.single('image'), async (req, res) => {
  try {
    const {
      model,
      prompt,
      aspect_ratio,
      quality,
      callBackUrl
    } = req.body;

    if (!model || !prompt) {
      return res.status(400).json({ error: '❌ model و prompt الزامی هستند.' });
    }

    let image_url = null;

    // 🟡 آپلود تصویر (درصورت وجود)
    if (req.file) {
      const formData = new FormData();
      formData.append('file', req.file.buffer, req.file.originalname);
      formData.append('uploadPath', 'images/user-uploads');

      const uploadResp = await fetch(FILE_UPLOAD_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${API_KEY}` },
        body: formData
      });

      const uploadData = await uploadResp.json();
      if (!uploadData.success) {
        return res.status(500).json({
          error: '❌ آپلود تصویر شکست خورد.',
          rawResponse: uploadData
        });
      }

      image_url = uploadData.data.downloadUrl;
    }

    // 🟢 ساخت ورودی برای ایجاد Task
    const input = { prompt };
    if (aspect_ratio) input.aspect_ratio = aspect_ratio;
    if (quality) input.quality = quality;

    if (image_url && model.includes('image-to-video')) {
      input.image_urls = [image_url];
    }

    const body = { model, input };
    if (callBackUrl) body.callBackUrl = callBackUrl;

    // 🚀 ایجاد Task
    const taskResp = await axios.post(CREATE_TASK_URL, body, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (taskResp.data.code !== 200 || !taskResp.data.data?.taskId) {
      return res.status(500).json({
        error: '❌ Task ایجاد نشد.',
        rawResponse: taskResp.data
      });
    }

    res.status(200).json({
      taskId: taskResp.data.data.taskId,
      msg: '✅ Task با موفقیت ایجاد شد.',
      uploadImage: image_url || null
    });

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: err.response?.data || err.message
    });
  }
});

/* 📊 دریافت وضعیت Task */
router.get('/recordInfo/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    if (!taskId) {
      return res.status(400).json({ error: '❌ taskId الزامی است.' });
    }

    const statusResp = await axios.get(`${RECORD_INFO_URL}?taskId=${taskId}`, {
      headers: { Authorization: `Bearer ${API_KEY}` }
    });

    res.status(200).json(statusResp.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: err.response?.data || err.message
    });
  }
});

export default router;
