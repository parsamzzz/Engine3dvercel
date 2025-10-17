import express from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import fetch from 'node-fetch';

const router = express.Router();

const API_KEY = 'dbd18fd3191266b86bbf18adb81d67d4';
const FILE_UPLOAD_URL = 'https://kieai.redpandaai.co/api/file-stream-upload';
const CREATE_TASK_URL = 'https://api.kie.ai/api/v1/jobs/createTask';
const RECORD_INFO_URL = 'https://api.kie.ai/api/v1/jobs/recordInfo';

const upload = multer({ storage: multer.memoryStorage() });

// --- مسیر تست ---
router.get('/', (req, res) => {
  res.send('✅ WAN AI API route is working.');
});

// --- ایجاد تسک ---
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
      acceleration,
      duration,
      negative_prompt
    } = req.body;

    if (!model) return res.status(400).json({ error: '❌ model الزامی است.' });

    let image_url = null;

    // --- آپلود تصویر ---
    if (req.file) {
      const allowed = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowed.includes(req.file.mimetype))
        return res.status(400).json({ error: '❌ فرمت تصویر مجاز نیست (jpeg/png/webp).' });
      if (req.file.size > 10 * 1024 * 1024)
        return res.status(400).json({ error: '❌ حجم تصویر باید کمتر از 10MB باشد.' });

      const formData = new FormData();
      formData.append('file', req.file.buffer, req.file.originalname);
      formData.append('uploadPath', 'images/user-uploads');

      const uploadResp = await fetch(FILE_UPLOAD_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${API_KEY}`, ...formData.getHeaders() },
        body: formData
      });

      if (!uploadResp.ok) return res.status(500).json({ error: '❌ آپلود تصویر شکست خورد.' });

      const uploadData = await uploadResp.json();
      if (uploadData.code !== 200 || !uploadData.data?.downloadUrl)
        return res.status(500).json({ error: '❌ آپلود تصویر شکست خورد.' });

      image_url = uploadData.data.downloadUrl;
    }

    const input = {};

    // --- ساخت input بر اساس مدل ---
    switch (model) {
      // === Text-to-Video Turbo ===
      case 'wan/2-2-a14b-text-to-video-turbo':
        if (!prompt) return res.status(400).json({ error: '❌ prompt الزامی است.' });
        input.prompt = prompt;

        if (resolution && ['480p','580p','720p'].includes(resolution)) input.resolution = resolution;
        if (aspect_ratio && ['16:9','9:16','1:1'].includes(aspect_ratio)) input.aspect_ratio = aspect_ratio;

        if (enable_prompt_expansion != null) input.enable_prompt_expansion = Boolean(enable_prompt_expansion);
        if (seed != null) input.seed = Number(seed);
        if (acceleration && ['none','regular'].includes(acceleration)) input.acceleration = acceleration;
        break;

      // === Text-to-Video 2.5 ===
      case 'wan/2-5-text-to-video':
        if (!prompt) return res.status(400).json({ error: '❌ prompt الزامی است.' });
        input.prompt = prompt;

        if (resolution && ['720p','1080p'].includes(resolution)) input.resolution = resolution;
        if (aspect_ratio && ['16:9','9:16','1:1'].includes(aspect_ratio)) input.aspect_ratio = aspect_ratio;
        if (negative_prompt) input.negative_prompt = negative_prompt;

        if (enable_prompt_expansion != null) input.enable_prompt_expansion = Boolean(enable_prompt_expansion);
        if (seed != null) input.seed = Number(seed);
        break;

      // === Image-to-Video Turbo ===
      case 'wan/2-2-a14b-image-to-video-turbo':
        if (!prompt || !image_url) return res.status(400).json({ error: '❌ prompt و image_url الزامی است.' });
        input.prompt = prompt;
        input.image_url = image_url;

        if (resolution && ['480p','580p','720p'].includes(resolution)) input.resolution = resolution;
        input.aspect_ratio = aspect_ratio || 'auto';

        if (enable_prompt_expansion != null) input.enable_prompt_expansion = Boolean(enable_prompt_expansion);
        if (seed != null) input.seed = Number(seed);
        if (acceleration && ['none','regular'].includes(acceleration)) input.acceleration = acceleration;
        break;

      // === Image-to-Video 2.5 ===
      case 'wan/2-5-image-to-video':
        if (!prompt || !image_url) return res.status(400).json({ error: '❌ prompt و image_url الزامی است.' });
        input.prompt = prompt;
        input.image_url = image_url;

        if (duration && ['5','10'].includes(duration)) input.duration = duration;
        if (resolution && ['720p','1080p'].includes(resolution)) input.resolution = resolution;
        input.aspect_ratio = aspect_ratio || 'auto';
        if (negative_prompt) input.negative_prompt = negative_prompt;

        if (enable_prompt_expansion != null) input.enable_prompt_expansion = Boolean(enable_prompt_expansion);
        if (seed != null) input.seed = Number(seed);
        break;

      default:
        return res.status(400).json({ error: '❌ مدل پشتیبانی نمی‌شود.' });
    }

    const body = { model, input };
    if (callBackUrl) body.callBackUrl = callBackUrl;

    console.log('🚀 [WAN] Sending createTask request:', { model, hasImage: !!image_url });

    const taskResp = await axios.post(CREATE_TASK_URL, body, {
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' }
    });

    if (taskResp.data.code !== 200 || !taskResp.data.data?.taskId)
      return res.status(500).json({ error: '❌ Task ایجاد نشد.', details: taskResp.data });

    res.status(200).json({
      taskId: taskResp.data.data.taskId,
      msg: '✅ Task با موفقیت ایجاد شد.',
      rawResponse: taskResp.data
    });
  } catch (err) {
    console.error('🚨 [WAN] CreateTask Error:', err.response?.data || err.message);
    res.status(500).json({ error: '❌ خطای داخلی سرور هنگام ایجاد Task.' });
  }
});

// --- وضعیت Task ---
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
