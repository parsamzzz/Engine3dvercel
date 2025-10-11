import express from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import fetch from 'node-fetch';

const router = express.Router();

/* 🔑 API Key و URL سرویس‌ها */
const API_KEY = '3bde9bb7f13f99eb4bd62496476338bc';

const FILE_UPLOAD_URL = 'https://kieai.redpandaai.co/api/file-stream-upload';
const LUMA_MODIFY_GENERATE_URL = 'https://api.kie.ai/api/v1/modify/generate';
const LUMA_MODIFY_STATUS_URL = 'https://api.kie.ai/api/v1/modify/record-info';
const LUMA_REFRAME_GENERATE_URL = 'https://api.kie.ai/api/v1/jobs/createTask';
const LUMA_REFRAME_STATUS_URL = 'https://api.kie.ai/api/v1/jobs/recordInfo';

/* 📦 آپلود در حافظه */
const upload = multer({ storage: multer.memoryStorage() });

/* 🟢 تست سلامت */
router.get('/', (req, res) => {
  res.send('✅ Luma modify + reframe API route working.');
});

/* 📤 ایجاد تسک */
router.post('/process', upload.single('video'), async (req, res) => {
  const {
    type = 'modify', // modify یا reframe
    prompt,
    callBackUrl,
    watermark,
    model,
    aspect_ratio,
    duration,
    grid_position_x,
    grid_position_y,
    x_start,
    y_start,
    y_end,
    keepMainObject
  } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: '❌ فایل ویدیو الزامی است.' });
  }

  // بررسی فرمت
  const allowedExt = ['.mp4', '.mov', '.avi'];
  const ext = '.' + (req.file.originalname.split('.').pop() || '').toLowerCase();
  if (!allowedExt.includes(ext))
    return res.status(400).json({ error: '❌ فرمت باید MP4 / MOV / AVI باشد.' });

  if (req.file.size > 500 * 1024 * 1024)
    return res.status(400).json({ error: '❌ حجم ویدیو نباید بیش از 500MB باشد.' });

  try {
    /* 🟡 مرحله ۱: آپلود فایل */
    const formData = new FormData();
    formData.append('file', new Blob([req.file.buffer]), req.file.originalname);
    formData.append('uploadPath', 'videos/user-uploads');

    const uploadResp = await fetch(FILE_UPLOAD_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}` },
      body: formData
    });

    const uploadData = await uploadResp.json();
    console.log('📤 Upload API response:', uploadData);

    if (!uploadData.success) {
      return res.status(500).json({
        error: '❌ آپلود فایل شکست خورد.',
        rawResponse: uploadData
      });
    }

    const videoUrl = uploadData.data.downloadUrl;
    let genResp;

    /* 🟢 مرحله ۲: ایجاد تسک */
    if (type === 'modify') {
      // ✳️ حالت Modify
      const body = { prompt, videoUrl };
      if (callBackUrl) body.callBackUrl = callBackUrl;
      if (watermark) body.watermark = watermark;

      genResp = await axios.post(LUMA_MODIFY_GENERATE_URL, body, {
        headers: { Authorization: `Bearer ${API_KEY}` }
      });
    } else if (type === 'reframe') {
      // ✳️ حالت Reframe
      const body = {
        model: model || 'luma-dream-machine/ray-2-flash-reframe',
        callBackUrl,
        input: {
          video_url: videoUrl,
          aspect_ratio: aspect_ratio || '9:16',
          duration,
          grid_position_x,
          grid_position_y,
          x_start,
          y_start,
          y_end,
          keepMainObject: keepMainObject === 'true' || keepMainObject === true,
          prompt
        }
      };

      genResp = await axios.post(LUMA_REFRAME_GENERATE_URL, body, {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
    } else {
      return res.status(400).json({ error: '❌ مقدار type نامعتبر است.' });
    }

    console.log('📤 Generate API response:', genResp.data);
    const taskId = genResp.data?.data?.taskId;

    if (!taskId) {
      return res.status(500).json({
        upload: { url: videoUrl },
        task: null,
        error: '❌ Task ID دریافت نشد.',
        rawResponse: genResp.data
      });
    }

    res.status(200).json({
      upload: { url: videoUrl },
      task: { taskId },
      msg: `✅ تسک ${type} ایجاد شد`
    });
  } catch (err) {
    console.error('❌ Error creating task:', err.response?.data || err.message);
    res.status(err.response?.status || 500)
      .json({ error: err.response?.data || err.message });
  }
});

/* 📊 وضعیت تسک */
router.get('/status/:type/:taskId', async (req, res) => {
  const { type, taskId } = req.params;
  let url;

  if (type === 'modify') url = `${LUMA_MODIFY_STATUS_URL}?taskId=${taskId}`;
  else if (type === 'reframe') url = `${LUMA_REFRAME_STATUS_URL}?taskId=${taskId}`;
  else return res.status(400).json({ error: '❌ نوع تسک نامعتبر است.' });

  try {
    const statusResp = await axios.get(url, {
      headers: { Authorization: `Bearer ${API_KEY}` }
    });
    res.status(200).json(statusResp.data);
  } catch (err) {
    console.error('❌ Status error:', err.response?.data || err.message);
    res.status(err.response?.status || 500)
      .json({ error: err.response?.data || err.message });
  }
});

export default router;
