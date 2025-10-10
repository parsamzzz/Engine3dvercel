import express from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const router = express.Router();
const API_KEY = process.env.KIE_API_KEY || 'ca6811163e441a6291c30575531cff59';
const FILE_UPLOAD_URL = 'https://kieai.redpandaai.co/api/file-stream-upload';
const CREATE_TASK_URL = 'https://api.kie.ai/api/v1/jobs/createTask';
const RECORD_INFO_URL = 'https://api.kie.ai/api/v1/jobs/recordInfo';

const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } 
});

const uploadFile = async (file) => {
  if (!file) return '';
  const formData = new FormData();
  formData.append('file', fs.createReadStream(file.path), file.originalname);

  try {
    const response = await axios.post(FILE_UPLOAD_URL, formData, {
      headers: { 
        'Authorization': `Bearer ${API_KEY}`,
        ...formData.getHeaders()
      }
    });
    return response.data.data.fileUrl;
  } finally {
    fs.unlink(file.path, () => {}); 
  }
};

router.post('/createTask', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'tail_image', maxCount: 1 }
]), async (req, res) => {
  try {
    const { model, prompt, duration, aspect_ratio, negative_prompt, cfg_scale, callBackUrl } = req.body;
    const imageFile = req.files['image'] ? req.files['image'][0] : null;
    const tailFile = req.files['tail_image'] ? req.files['tail_image'][0] : null;

    // آپلود فایل‌ها
    const image_url = await uploadFile(imageFile);
    const tail_image_url = await uploadFile(tailFile);

    // اعتبارسنجی prompt و طول آن
    if (prompt && prompt.length > 5000) return res.status(400).json({ error: '❌ طول prompt نباید بیش از 5000 کاراکتر باشد.' });
    if (negative_prompt && negative_prompt.length > 500) return res.status(400).json({ error: '❌ طول negative_prompt نباید بیش از 500 کاراکتر باشد.' });

    // ساخت input بر اساس مدل
    const input = {};
    switch(model) {
      case 'kling/v2-1-master-image-to-video':
      case 'kling/v2-1-standard':
        if (!prompt || !image_url) return res.status(400).json({ error: '❌ prompt و image_url الزامی است.' });
        input.prompt = prompt;
        input.image_url = image_url;
        break;

      case 'kling/v2-1-master-text-to-video':
        if (!prompt) return res.status(400).json({ error: '❌ prompt الزامی است.' });
        input.prompt = prompt;
        if (aspect_ratio) input.aspect_ratio = aspect_ratio;
        break;

      case 'kling/v2-1-pro':
        if (!prompt || !image_url) return res.status(400).json({ error: '❌ prompt و image_url الزامی است.' });
        input.prompt = prompt;
        input.image_url = image_url;
        if (tail_image_url) input.tail_image_url = tail_image_url;
        break;

      default:
        return res.status(400).json({ error: '❌ مدل نامعتبر است.' });
    }

    // افزودن پارامترهای اختیاری
    if (duration) input.duration = duration.toString();
    if (negative_prompt) input.negative_prompt = negative_prompt;
    if (cfg_scale) {
      const scale = parseFloat(cfg_scale);
      if (scale < 0 || scale > 1) return res.status(400).json({ error: '❌ cfg_scale باید بین 0 و 1 باشد.' });
      input.cfg_scale = scale;
    }

    // ایجاد Task
    const taskRes = await axios.post(CREATE_TASK_URL, {
      model,
      ...(callBackUrl ? { callBackUrl } : {}), // ارسال callBackUrl فقط در صورت موجود بودن
      input
    }, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    res.json(taskRes.data);

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: '❌ خطا در ایجاد Task', details: err.response?.data || err.message });
  }
});

/* 🔹 Endpoint گرفتن وضعیت Task */
router.get('/recordInfo', async (req, res) => {
  try {
    const { taskId } = req.query;
    if (!taskId) return res.status(400).json({ error: '❌ taskId الزامی است.' });

    const response = await axios.get(`${RECORD_INFO_URL}?taskId=${taskId}`, {
      headers: { 'Authorization': `Bearer ${API_KEY}` }
    });

    res.json(response.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: '❌ خطا در گرفتن وضعیت Task', details: err.response?.data || err.message });
  }
});

export default router;
