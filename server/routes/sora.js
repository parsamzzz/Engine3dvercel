import express from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import fetch from 'node-fetch';

const router = express.Router();

/* 🔑 API Key و URLها */
let apiKeys = [
  { key: 'dbd18fd3191266b86bbf18adb81d67d4', active: true },
  { key: 'e497ee9a169a6bac8dd9bd6d9db0775e', active: true },
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
  if (i !== -1) apiKeys[i].active = false;
}

/* 📦 ذخیره فایل در حافظه */
const upload = multer({ storage: multer.memoryStorage() });

/* 🟢 تست سلامت */
router.get('/', (req, res) => res.send('✅ Sora2 API route is working.'));

/* 📤 ایجاد Task با اعتبارسنجی دقیق پارامترها */
router.post('/createTask', upload.array('images', 5), async (req, res) => {
  try {
    const { model, callBackUrl, ...params } = req.body;
    if (!model) return res.status(400).json({ error: '❌ model الزامی است.' });

    let image_urls = [];

    // 🔹 آپلود فایل‌ها در صورت وجود
    if (req.files && req.files.length > 0) {
      const key = getActiveKey();
      if (!key) return res.status(500).json({ error: '⛔ هیچ کلید فعالی موجود نیست.' });

      for (const file of req.files) {
        const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
        const maxSize = 10 * 1024 * 1024; // 10MB

        if (!allowed.includes(file.mimetype))
          return res.status(400).json({ error: '❌ فرمت فایل مجاز نیست (PNG/JPG/WEBP).' });
        if (file.size > maxSize)
          return res.status(400).json({ error: '❌ حجم فایل باید کمتر از 10MB باشد.' });

        const formData = new FormData();
        formData.append('file', file.buffer, file.originalname);
        formData.append('uploadPath', 'images/user-uploads');

        const uploadResp = await fetch(FILE_UPLOAD_URL, {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}` },
          body: formData
        });

        const uploadData = await uploadResp.json();
        if (!uploadData.success) return res.status(500).json({ error: '❌ آپلود تصویر شکست خورد.', rawResponse: uploadData });

        image_urls.push(uploadData.data.downloadUrl);
      }
    }

    // 🔹 آماده‌سازی input بر اساس مدل
    const input = {};

    switch (model) {
      case 'sora-2-text-to-video':
        if (!params.prompt) return res.status(400).json({ error: '❌ prompt الزامی است.' });
        input.prompt = params.prompt;
        if (params.aspect_ratio && !['portrait', 'landscape'].includes(params.aspect_ratio))
          return res.status(400).json({ error: '❌ aspect_ratio نامعتبر است.' });
        if (params.n_frames && !['10', '15'].includes(params.n_frames))
          return res.status(400).json({ error: '❌ n_frames نامعتبر است.' });
        if (params.remove_watermark !== undefined)
          input.remove_watermark = params.remove_watermark === 'true';
        if (params.aspect_ratio) input.aspect_ratio = params.aspect_ratio;
        if (params.n_frames) input.n_frames = params.n_frames;
        break;

      case 'sora-2-image-to-video':
        if (!params.prompt && image_urls.length === 0)
          return res.status(400).json({ error: '❌ حداقل prompt یا تصویر الزامی است.' });
        if (params.prompt) input.prompt = params.prompt;
        if (image_urls.length > 0) input.image_urls = image_urls;
        if (params.aspect_ratio && !['portrait', 'landscape'].includes(params.aspect_ratio))
          return res.status(400).json({ error: '❌ aspect_ratio نامعتبر است.' });
        if (params.n_frames && !['10', '15'].includes(params.n_frames))
          return res.status(400).json({ error: '❌ n_frames نامعتبر است.' });
        if (params.remove_watermark !== undefined)
          input.remove_watermark = params.remove_watermark === 'true';
        if (params.aspect_ratio) input.aspect_ratio = params.aspect_ratio;
        if (params.n_frames) input.n_frames = params.n_frames;
        break;

      case 'sora-2-pro-text-to-video':
        if (!params.prompt) return res.status(400).json({ error: '❌ prompt الزامی است.' });
        input.prompt = params.prompt;
        if (params.aspect_ratio && !['portrait', 'landscape'].includes(params.aspect_ratio))
          return res.status(400).json({ error: '❌ aspect_ratio نامعتبر است.' });
        if (params.n_frames && !['10', '15'].includes(params.n_frames))
          return res.status(400).json({ error: '❌ n_frames نامعتبر است.' });
        if (params.size && !['standard', 'high'].includes(params.size))
          return res.status(400).json({ error: '❌ size نامعتبر است.' });
        if (params.remove_watermark !== undefined)
          input.remove_watermark = params.remove_watermark === 'true';
        if (params.aspect_ratio) input.aspect_ratio = params.aspect_ratio;
        if (params.n_frames) input.n_frames = params.n_frames;
        if (params.size) input.size = params.size;
        break;

      case 'sora-2-pro-image-to-video':
        if (params.prompt) input.prompt = params.prompt;
        if (image_urls.length > 0) input.image_urls = image_urls;
        if (params.aspect_ratio && !['portrait', 'landscape'].includes(params.aspect_ratio))
          return res.status(400).json({ error: '❌ aspect_ratio نامعتبر است.' });
        if (params.n_frames && !['10', '15'].includes(params.n_frames))
          return res.status(400).json({ error: '❌ n_frames نامعتبر است.' });
        if (params.size && !['standard', 'high'].includes(params.size))
          return res.status(400).json({ error: '❌ size نامعتبر است.' });
        if (params.remove_watermark !== undefined)
          input.remove_watermark = params.remove_watermark === 'true';
        if (params.aspect_ratio) input.aspect_ratio = params.aspect_ratio;
        if (params.n_frames) input.n_frames = params.n_frames;
        if (params.size) input.size = params.size;
        break;

      case 'sora-2-pro-storyboard':
        if (!params.n_frames || !params.shots) return res.status(400).json({ error: '❌ n_frames و shots الزامی هستند.' });
        if (!['10', '15', '25'].includes(params.n_frames)) return res.status(400).json({ error: '❌ n_frames نامعتبر است.' });
        input.n_frames = params.n_frames;
        input.shots = JSON.parse(params.shots);
        if (image_urls.length > 0) input.image_urls = image_urls;
        if (params.aspect_ratio && !['portrait', 'landscape'].includes(params.aspect_ratio))
          return res.status(400).json({ error: '❌ aspect_ratio نامعتبر است.' });
        if (params.aspect_ratio) input.aspect_ratio = params.aspect_ratio;
        break;

      default:
        return res.status(400).json({ error: '❌ مدل ناشناخته است.' });
    }

    // 🔹 ایجاد Task
    const body = { model, input };
    if (callBackUrl) body.callBackUrl = callBackUrl;

    let response;
    for (const k of apiKeys.filter(k => k.active)) {
      try {
        response = await axios.post(CREATE_TASK_URL, body, {
          headers: { Authorization: `Bearer ${k.key}`, 'Content-Type': 'application/json' }
        });
        if (response.data.code === 200 && response.data.data?.taskId) {
          return res.status(200).json({ taskId: response.data.data.taskId, msg: '✅ Task ایجاد شد.', usedKey: k.key });
        } else disableKey(k.key);
      } catch (err) {
        disableKey(k.key);
      }
    }

    return res.status(500).json({ error: '⛔ همه کلیدها خطا دادند.' });
  } catch (err) {
    res.status(err.response?.status || 500).json({ error: err.response?.data || err.message });
  }
});

/* 📊 دریافت وضعیت Task */
router.get('/recordInfo/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    if (!taskId) return res.status(400).json({ error: '❌ taskId الزامی است.' });

    const key = getActiveKey();
    if (!key) return res.status(500).json({ error: '⛔ هیچ کلید فعالی موجود نیست.' });

    const statusResp = await axios.get(`${RECORD_INFO_URL}?taskId=${taskId}`, {
      headers: { Authorization: `Bearer ${key}` }
    });

    res.status(200).json(statusResp.data);
  } catch (err) {
    res.status(err.response?.status || 500).json({ error: err.response?.data || err.message });
  }
});

export default router;
