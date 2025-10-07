// 📄 routes/universal.js
import express from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import { Blob } from 'node:buffer';

const router = express.Router();

/* 🔑 API Key */
const API_KEY = process.env.KLING_API_KEY || 'YOUR_API_KEY_HERE';

/* 🟦 تنظیمات سرویس‌ها */
const SERVICE_CONFIG = {
  // نمونه‌های ویدیویی دیگر
  luma: {
    uploadField: 'video',
    generateUrl: 'https://api.kie.ai/api/v1/modify/generate',
    statusUrl: 'https://api.kie.ai/api/v1/modify/record-info',
    fileTypes: ['.mp4', '.mov', '.avi'],
    maxSize: 500 * 1024 * 1024
  },
  aleph: {
    uploadField: 'video',
    generateUrl: 'https://api.kie.ai/api/v1/aleph/generate',
    statusUrl: 'https://api.kie.ai/api/v1/aleph/record-info',
    fileTypes: ['.mp4', '.mov', '.avi'],
    maxSize: 500 * 1024 * 1024
  },
  runway: {
    uploadField: 'video',
    generateUrl: 'https://api.kie.ai/api/v1/runway/generate',
    statusUrl: 'https://api.kie.ai/api/v1/runway/record-info',
    fileTypes: ['.mp4', '.mov', '.avi'],
    maxSize: 500 * 1024 * 1024
  },
  veo3: {
    uploadField: 'image',
    generateUrl: 'https://api.kie.ai/api/v1/veo/generate',
    statusUrl: 'https://api.kie.ai/api/v1/veo/record-info',
    fileTypes: ['.png', '.jpg', '.jpeg'],
    maxSize: 30 * 1024 * 1024
  },

  /* 🟢 سرویس اصلی KLINGAI */
  klingai: {
    uploadField: 'image',
    generateUrl: 'https://api.kie.ai/api/v1/jobs/createTask',
    statusUrl: 'https://api.kie.ai/api/v1/jobs/recordInfo',
    fileTypes: ['.png', '.jpg', '.jpeg', '.webp'],
    maxSize: 10 * 1024 * 1024 // طبق داکیومنت Kling حداکثر 10MB
  },

  seedancer: {
    uploadField: 'image',
    generateUrl: 'https://api.seedancer.com/v1/jobs/createTask',
    statusUrl: 'https://api.seedancer.com/v1/jobs/recordInfo',
    fileTypes: ['.png', '.jpg', '.jpeg'],
    maxSize: 30 * 1024 * 1024
  }
};

/* 📦 Multer: ذخیره در حافظه */
const upload = multer({ storage: multer.memoryStorage() });

/* 🟢 تست سلامت */
router.get('/', (req, res) => {
  res.send('✅ Universal API route is working.');
});

/* 📤 ایجاد تسک */
router.post('/create', upload.single('file'), async (req, res) => {
  try {
    const { service, prompt, ...otherParams } = req.body;
    const srvKey = service?.toLowerCase();
    if (!srvKey || !SERVICE_CONFIG[srvKey]) {
      return res.status(400).json({ error: '❌ سرویس نامعتبر است.' });
    }
    const cfg = SERVICE_CONFIG[srvKey];

    if (!req.file && !prompt) {
      return res.status(400).json({ error: '❌ فایل یا prompt الزامی است.' });
    }

    // اعتبارسنجی فرمت و حجم
    if (req.file) {
      const ext = '.' + req.file.originalname.split('.').pop().toLowerCase();
      if (!cfg.fileTypes.includes(ext)) {
        return res.status(400).json({ error: `❌ فرمت فایل باید یکی از ${cfg.fileTypes.join(', ')} باشد.` });
      }
      if (req.file.size > cfg.maxSize) {
        return res.status(400).json({ error: `❌ حجم فایل بیش از ${cfg.maxSize / (1024 * 1024)}MB است.` });
      }
    }

    /* 🟡 آپلود فایل به سرور Kling */
    let uploadUrl = null;
    if (req.file) {
      const formData = new FormData();
      formData.append('file', new Blob([req.file.buffer]), req.file.originalname);
      formData.append('uploadPath', 'images/user-uploads');

      const uploadResp = await axios.post(
        'https://kieai.redpandaai.co/api/file-stream-upload',
        formData,
        { headers: { Authorization: `Bearer ${API_KEY}`, ...formData.getHeaders() } }
      );
      if (!uploadResp.data.success) {
        return res.status(500).json({ error: '❌ آپلود فایل شکست خورد', raw: uploadResp.data });
      }
      uploadUrl = uploadResp.data.data.downloadUrl;
    }

    /* 🟢 آماده‌سازی بدنه درخواست */
    // برای KlingAI باید input داخل body قرار گیرد
    let body = {};
    if (srvKey === 'klingai') {
      body = {
        model: otherParams.model || 'kling/v2-1-standard',
        input: {
          prompt,
          ...(uploadUrl && { image_url: uploadUrl }),
          ...(otherParams.duration && { duration: otherParams.duration }),
          ...(otherParams.aspect_ratio && { aspect_ratio: otherParams.aspect_ratio }),
          ...(otherParams.negative_prompt && { negative_prompt: otherParams.negative_prompt }),
          ...(otherParams.cfg_scale && { cfg_scale: parseFloat(otherParams.cfg_scale) }),
          ...(otherParams.tail_image_url && { tail_image_url: otherParams.tail_image_url })
        },
        ...(otherParams.callBackUrl && { callBackUrl: otherParams.callBackUrl })
      };
    } else {
      // برای سرویس‌های دیگر
      body = { prompt, ...(uploadUrl && { fileUrl: uploadUrl }), ...otherParams };
    }

    const genResp = await axios.post(cfg.generateUrl, body, {
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' }
    });

    const taskId = genResp.data?.data?.taskId || genResp.data?.taskId;
    if (!taskId) {
      return res.status(500).json({ error: '❌ Task ID دریافت نشد', raw: genResp.data });
    }

    res.status(200).json({ taskId, uploadUrl, msg: `✅ Task ${service} ایجاد شد` });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(err.response?.status || 500).json({ error: err.response?.data || err.message });
  }
});

/* 📊 دریافت وضعیت تسک */
router.get('/status/:service/:taskId', async (req, res) => {
  try {
    const { service, taskId } = req.params;
    const srvKey = service?.toLowerCase();
    if (!srvKey || !SERVICE_CONFIG[srvKey]) {
      return res.status(400).json({ error: '❌ سرویس نامعتبر است.' });
    }

    const statusUrl = `${SERVICE_CONFIG[srvKey].statusUrl}?taskId=${taskId}`;
    const statusResp = await axios.get(statusUrl, {
      headers: { Authorization: `Bearer ${API_KEY}` }
    });

    res.status(200).json(statusResp.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(err.response?.status || 500).json({ error: err.response?.data || err.message });
  }
});

export default router;
