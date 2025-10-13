import express from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';

const router = express.Router();

const API_KEY = process.env.KIE_API_KEY || 'YOUR_API_KEY_HERE';
const FILE_UPLOAD_URL = 'https://kieai.redpandaai.co/api/file-stream-upload'; // بررسی شود
const GENERATE_URL = 'https://api.kie.ai/api/v1/veo/generate';
const RECORD_INFO_URL = 'https://api.kie.ai/api/v1/veo/record-info';
const GET_1080P_URL = 'https://api.kie.ai/api/v1/veo/get-1080p-video';

/* 📦 دریافت فایل در حافظه */
const upload = multer({ storage: multer.memoryStorage() });

/* 🟢 تست سلامت API */
router.get('/', (req, res) => {
  res.send('✅ Veo3 API route is working.');
});

/* 📤 ایجاد Task تولید ویدیو */
router.post('/generate', upload.single('image'), async (req, res) => {
  try {
    const {
      prompt,
      model = 'veo3',                    // 'veo3' یا 'veo3_fast'
      aspectRatio = '16:9',              // '16:9', '9:16', یا 'Auto'
      seeds,
      watermark,
      callBackUrl,
      enableFallback = false,
      enableTranslation = true
    } = req.body;

    // ✅ حداقل یکی از prompt یا تصویر باید وجود داشته باشد
    if (!prompt && !req.file) {
      return res.status(400).json({ error: '❌ فیلد prompt یا تصویر الزامی است.' });
    }

    /* 🟡 آپلود تصویر در صورت وجود (image-to-video) */
    let imageUrls;
    if (req.file) {
      const formData = new FormData();
      formData.append('file', req.file.buffer, req.file.originalname);
      formData.append('uploadPath', 'images/user-uploads');

      const uploadResp = await axios.post(FILE_UPLOAD_URL, formData, {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          ...formData.getHeaders()
        }
      });

      const uploadData = uploadResp.data;
      if (!uploadData.success || !uploadData.data?.downloadUrl) {
        return res.status(500).json({
          error: '❌ آپلود تصویر شکست خورد.',
          rawResponse: uploadData
        });
      }
      imageUrls = [uploadData.data.downloadUrl];
    }

    /* 🔵 بررسی seeds */
    let seedValue;
    if (seeds) {
      const parsedSeed = parseInt(seeds);
      if (parsedSeed < 10000 || parsedSeed > 99999) {
        return res.status(400).json({ error: '❌ seeds باید بین 10000 تا 99999 باشد.' });
      }
      seedValue = parsedSeed;
    }

    /* 🟢 آماده سازی body درخواست Veo3 */
    const body = {
      prompt,
      model,
      aspectRatio,
      enableFallback: enableFallback === 'true' || enableFallback === true,
      enableTranslation: enableTranslation === 'true' || enableTranslation === true
    };

    if (imageUrls) body.imageUrls = imageUrls;
    if (seedValue) body.seeds = seedValue;
    if (watermark) body.watermark = watermark;
    if (callBackUrl) body.callBackUrl = callBackUrl;

    /* 🟣 ارسال درخواست تولید ویدیو */
    const taskResp = await axios.post(GENERATE_URL, body, {
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
      msg: '✅ Task Veo3 با موفقیت ایجاد شد.',
      uploadImage: imageUrls ? imageUrls[0] : null
    });

  } catch (err) {
    console.error('❌ Error:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({ error: err.response?.data || err.message });
  }
});

/* 📊 بررسی وضعیت Task */
router.get('/recordInfo/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    if (!taskId)
      return res.status(400).json({ error: '❌ پارامتر taskId الزامی است.' });

    const statusResp = await axios.get(`${RECORD_INFO_URL}?taskId=${taskId}`, {
      headers: { Authorization: `Bearer ${API_KEY}` }
    });

    res.status(200).json(statusResp.data);
  } catch (err) {
    console.error('❌ Status error:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({ error: err.response?.data || err.message });
  }
});

/* 🎬 دریافت ویدیوی 1080P (فقط برای 16:9 و بدون fallback) */
router.get('/get-1080p/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    if (!taskId)
      return res.status(400).json({ error: '❌ پارامتر taskId الزامی است.' });

    // دریافت اطلاعات Task
    const statusResp = await axios.get(`${RECORD_INFO_URL}?taskId=${taskId}`, {
      headers: { Authorization: `Bearer ${API_KEY}` }
    });

    const record = statusResp.data.data;
    if (record.fallbackFlag) {
      return res.status(400).json({ error: '❌ ویدیو fallback قابل دریافت 1080P نیست.' });
    }
    if (record.aspectRatio !== '16:9') {
      return res.status(400).json({ error: '❌ فقط ویدیوهای 16:9 از 1080P پشتیبانی می‌کنند.' });
    }

    // دریافت ویدیوی HD
    const videoResp = await axios.get(`${GET_1080P_URL}?taskId=${taskId}&index=0`, {
      headers: { Authorization: `Bearer ${API_KEY}` }
    });

    res.status(200).json(videoResp.data);
  } catch (err) {
    console.error('❌ 1080P error:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({ error: err.response?.data || err.message });
  }
});

export default router;
