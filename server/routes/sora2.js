import express from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import fetch from 'node-fetch';

const router = express.Router();

/* 🔑 API Key و URLها — با قابلیت چرخش */
let apiKeys = [
  { key: '0f0421314cdb133c96145192f5cffd87', active: true },
  { key: 'e497ee9a169a6bac8dd9bd6d9db0775e', active: true },
  { key: 'edac70ca980ae21d58d380a633c837b8', active: true },
  { key: 'edac70ca980ae21d58d380a633c837b8', active: true }
];

const FILE_UPLOAD_URL = 'https://kieai.redpandaai.co/api/file-stream-upload';
const CREATE_TASK_URL = 'https://api.kie.ai/api/v1/jobs/createTask';
const RECORD_INFO_URL = 'https://api.kie.ai/api/v1/jobs/recordInfo';

/* 📌 توابع کمکی */
function getActiveKey() {
  return apiKeys.find(k => k.active)?.key || null;
}
function disableKey(key) {
  const i = apiKeys.findIndex(k => k.key === key);
  if (i !== -1) {
    apiKeys[i].active = false;
    console.warn(`🔴 API-Key غیرفعال شد: ${key}`);
  }
}

/* 📦 ذخیره فایل در حافظه */
const upload = multer({ storage: multer.memoryStorage() });

/* 🟢 تست سلامت */
router.get('/', (req, res) => {
  res.send('✅ Sora2 API route is working.');
});

/* 📤 ایجاد Task جدید با Failover */
router.post('/createTask', upload.single('image'), async (req, res) => {
  try {
    const { model, prompt, aspect_ratio, callBackUrl } = req.body;

    if (!model || !prompt) {
      return res.status(400).json({ error: '❌ model و prompt الزامی هستند.' });
    }

    let image_url = null;

    // 🟡 بررسی و آپلود تصویر
    if (req.file) {
      const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
      const maxSize = 30 * 1024 * 1024;

      if (!allowed.includes(req.file.mimetype)) {
        return res.status(400).json({ error: '❌ فرمت فایل مجاز نیست (PNG/JPG/WEBP).' });
      }
      if (req.file.size > maxSize) {
        return res.status(400).json({ error: '❌ حجم فایل باید کمتر از 30MB باشد.' });
      }

      const formData = new FormData();
      formData.append('file', req.file.buffer, req.file.originalname);
      formData.append('uploadPath', 'images/user-uploads');

      const key = getActiveKey();
      if (!key) return res.status(500).json({ error: '⛔ هیچ کلید فعالی موجود نیست.' });

      const uploadResp = await fetch(FILE_UPLOAD_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}` },
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
    if (image_url && model.includes('image-to-video')) {
      input.image_urls = [image_url];
    }

    const body = { model, input };
    if (callBackUrl) body.callBackUrl = callBackUrl;

    let triedKeys = [];
    let response;

    // 🚀 ایجاد Task با چرخش کلیدها
    for (const k of apiKeys.filter(k => k.active)) {
      try {
        console.log(`⚙️ تلاش با کلید: ${k.key}`);
        response = await axios.post(CREATE_TASK_URL, body, {
          headers: { Authorization: `Bearer ${k.key}`, 'Content-Type': 'application/json' }
        });

        // ✅ فقط در صورتی که code === 200 بلافاصله برگرد
        if (response.data.code === 200 && response.data.data?.taskId) {
          console.log(`✅ موفق با کلید: ${k.key}`);
          return res.status(200).json({
            taskId: response.data.data.taskId,
            msg: '✅ Task با موفقیت ایجاد شد.',
            usedKey: k.key
          });
        } else {
          // ⛔ هر وضعیت غیر 200 → غیرفعال کن و برو بعدی
          console.error(`❌ پاسخ ناموفق (${k.key}):`, response.data);
          disableKey(k.key);
          triedKeys.push(k.key);
        }
      } catch (err) {
        console.error(`🚨 خطای درخواست با کلید ${k.key}:`, err.response?.data || err.message);
        disableKey(k.key);
        triedKeys.push(k.key);
      }
    }

    // ⛔ اگر هیچ کلیدی جواب نداد
    return res.status(500).json({
      error: '⛔ همه کلیدها خطا دادند.',
    });

  } catch (err) {
    console.error('[CreateTask Error]:', err.response?.data || err.message);
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

    const key = getActiveKey();
    if (!key) return res.status(500).json({ error: '⛔ هیچ کلید فعالی موجود نیست.' });

    const statusResp = await axios.get(`${RECORD_INFO_URL}?taskId=${taskId}`, {
      headers: { Authorization: `Bearer ${key}` }
    });

    res.status(200).json(statusResp.data);
  } catch (err) {
    console.error('[RecordInfo Error]:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: err.response?.data || err.message
    });
  }
});

export default router;
