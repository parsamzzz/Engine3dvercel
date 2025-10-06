// 📄 routes/universal.js
import express from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import { Blob } from 'node:buffer';

const router = express.Router();

/* 🔑 API Keys و URL سرویس‌ها */
const API_KEY = process.env.KIE_API_KEY || 'YOUR_API_KEY_HERE';

const SERVICE_CONFIG = {
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
  ve3: {
    uploadField: 'image',
    generateUrl: 'https://api.kie.ai/api/v1/veo/generate',
    statusUrl: 'https://api.kie.ai/api/v1/veo/record-info',
    fileTypes: ['.png', '.jpg', '.jpeg'],
    maxSize: 30 * 1024 * 1024
  },
  sora2: {
    uploadField: 'image',
    generateUrl: 'https://api.kie.ai/api/v1/jobs/createTask',
    statusUrl: 'https://api.kie.ai/api/v1/jobs/recordInfo',
    fileTypes: ['.png', '.jpg', '.jpeg'],
    maxSize: 30 * 1024 * 1024
  },
  seedancer: {
    uploadField: 'image',
    generateUrl: 'https://api.seedancer.com/v1/jobs/createTask',
    statusUrl: 'https://api.seedancer.com/v1/jobs/recordInfo',
    fileTypes: ['.png', '.jpg', '.jpeg'],
    maxSize: 30 * 1024 * 1024
  },
  kie: {
    uploadField: 'image',
    generateUrl: 'https://api.kie.ai/api/v1/jobs/createTask',
    statusUrl: 'https://api.kie.ai/api/v1/jobs/recordInfo',
    fileTypes: ['.png', '.jpg', '.jpeg'],
    maxSize: 30 * 1024 * 1024
  },
  wan: {
    uploadField: 'image',
    generateUrl: 'https://api.kie.ai/api/v1/jobs/createTask',
    statusUrl: 'https://api.kie.ai/api/v1/jobs/recordInfo',
    fileTypes: ['.png', '.jpg', '.jpeg'],
    maxSize: 30 * 1024 * 1024
  }
};

/* 📦 Multer برای آپلود فایل */
const upload = multer({ storage: multer.memoryStorage() });

/* 🟢 تست سلامت */
router.get('/', (req, res) => {
  res.send('✅ Universal API route is working.');
});

/* 📤 ایجاد تسک برای هر سرویس */
router.post('/create', upload.single('file'), async (req, res) => {
  try {
    const { service, prompt, ...otherParams } = req.body;
    if (!service || !SERVICE_CONFIG[service.toLowerCase()]) {
      return res.status(400).json({ error: '❌ سرویس نامعتبر است.' });
    }
    const cfg = SERVICE_CONFIG[service.toLowerCase()];

    if (!req.file && !prompt) {
      return res.status(400).json({ error: '❌ فایل یا prompt الزامی است.' });
    }

    const ext = '.' + (req.file?.originalname.split('.').pop() || '').toLowerCase();
    if (req.file && !cfg.fileTypes.includes(ext)) {
      return res.status(400).json({ error: `❌ فرمت فایل باید یکی از ${cfg.fileTypes.join(', ')} باشد.` });
    }

    if (req.file && req.file.size > cfg.maxSize) {
      return res.status(400).json({ error: `❌ حجم فایل نباید بیش از ${cfg.maxSize / (1024*1024)}MB باشد.` });
    }

    // 🟡 آپلود فایل به Kie یا Seedancer
    let uploadUrl = null;
    if (req.file) {
      const formData = new FormData();
      formData.append('file', new Blob([req.file.buffer]), req.file.originalname);
      formData.append('uploadPath', 'user-uploads');

      const uploadResp = await axios.post('https://kieai.redpandaai.co/api/file-stream-upload', formData, {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          ...formData.getHeaders()
        }
      });
      if (!uploadResp.data.success) {
        return res.status(500).json({ error: '❌ آپلود فایل شکست خورد', raw: uploadResp.data });
      }
      uploadUrl = uploadResp.data.data.downloadUrl;
    }

    // 🟢 آماده‌سازی body با پارامترها
    const body = { prompt };
    if (uploadUrl) body.fileUrl = uploadUrl;
    Object.assign(body, otherParams);

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
    if (!service || !SERVICE_CONFIG[service.toLowerCase()]) {
      return res.status(400).json({ error: '❌ سرویس نامعتبر است.' });
    }
    const statusUrl = SERVICE_CONFIG[service.toLowerCase()].statusUrl + '?taskId=' + taskId;

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
