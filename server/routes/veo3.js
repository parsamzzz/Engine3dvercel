import express from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';

const router = express.Router();
const API_KEY = process.env.KIE_API_KEY || 'dbd18fd3191266b86bbf18adb81d67d4';
const FILE_UPLOAD_URL = 'https://kieai.redpandaai.co/api/file-stream-upload';
const GENERATE_URL = 'https://api.kie.ai/api/v1/veo/generate';
const RECORD_INFO_URL = 'https://api.kie.ai/api/v1/veo/record-info';
const GET_1080P_URL = 'https://api.kie.ai/api/v1/veo/get-1080p-video';

/* دریافت فایل در حافظه */
const upload = multer({ storage: multer.memoryStorage() });

/* تست سلامت API */
router.get('/', (req, res) => {
  res.send('✅ Veo3 API route is working.');
});

/* Helper برای تعیین generationType و رعایت محدودیت‌ها */
function determineGenerationType(model, imageUrls, aspectRatio) {
  if (!imageUrls || imageUrls.length === 0) return 'TEXT_2_VIDEO';

  if (model === 'veo3_fast') {
    // REFERENCE_2_VIDEO فقط برای 1 تا 3 تصویر و aspectRatio 16:9
    if (imageUrls.length >= 1 && imageUrls.length <= 3) {
      if (imageUrls.length === 2) return 'FIRST_AND_LAST_FRAMES_2_VIDEO';
      if (aspectRatio !== '16:9') {
        throw new Error('REFERENCE_2_VIDEO فقط با aspectRatio 16:9 قابل استفاده است.');
      }
      return 'REFERENCE_2_VIDEO';
    }
    throw new Error('تعداد تصاویر معتبر نیست. فقط 1 تا 3 تصویر برای مدل Fast مجاز است.');
  }

  if (model === 'veo3') {
    if (imageUrls.length === 0 || imageUrls.length === 1) return 'TEXT_2_VIDEO';
    if (imageUrls.length === 2) return 'FIRST_AND_LAST_FRAMES_2_VIDEO';
    throw new Error('مدل Quality فقط از 0، 1 یا 2 تصویر پشتیبانی می‌کند.');
  }

  throw new Error('مدل انتخابی معتبر نیست.');
}

/* ایجاد Task تولید ویدیو */
router.post('/generate', upload.array('images', 3), async (req, res) => {
  try {
    const {
      prompt,
      model = 'veo3_fast',
      aspectRatio = '16:9',
      seeds,
      watermark,
      callBackUrl,
      enableTranslation = true
    } = req.body;

    if (!prompt && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ error: '❌ فیلد prompt یا حداقل یک تصویر الزامی است.' });
    }

    /* آپلود تصاویر در صورت وجود */
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        // بررسی MIME type اختیاری: فقط jpg/png
        if (!['image/jpeg','image/png'].includes(file.mimetype)) {
          return res.status(400).json({ error: '❌ فقط فرمت‌های JPG و PNG مجاز است.' });
        }

        const formData = new FormData();
        formData.append('file', file.buffer, file.originalname);
        formData.append('uploadPath', 'images/user-uploads');

        const uploadResp = await axios.post(FILE_UPLOAD_URL, formData, {
          headers: {
            Authorization: `Bearer ${API_KEY}`,
            ...formData.getHeaders()
          }
        });

        const uploadData = uploadResp.data;
        if (!uploadData.success || !uploadData.data?.downloadUrl) {
          return res.status(500).json({ error: '❌ آپلود تصویر شکست خورد.', rawResponse: uploadData });
        }
        imageUrls.push(uploadData.data.downloadUrl);
      }
    }

    /* بررسی seeds */
    let seedValue;
    if (seeds) {
      const parsedSeed = parseInt(seeds);
      if (parsedSeed < 10000 || parsedSeed > 99999) {
        return res.status(400).json({ error: '❌ seeds باید بین 10000 تا 99999 باشد.' });
      }
      seedValue = parsedSeed;
    }

    /* تعیین generationType */
    let generationType;
    try {
      generationType = determineGenerationType(model, imageUrls, aspectRatio);
    } catch (err) {
      return res.status(400).json({ error: `❌ ${err.message}` });
    }

    /* آماده سازی body درخواست Veo3 */
    const body = {
      prompt,
      model,
      aspectRatio,
      generationType,
      enableTranslation: Boolean(enableTranslation)
    };

    if (imageUrls.length) body.imageUrls = imageUrls;
    if (seedValue) body.seeds = seedValue;
    if (watermark) body.watermark = watermark;
    if (callBackUrl) body.callBackUrl = callBackUrl;

    /* ارسال درخواست تولید ویدیو */
    const taskResp = await axios.post(GENERATE_URL, body, {
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' }
    });

    if (taskResp.data.code !== 200 || !taskResp.data.data?.taskId) {
      return res.status(500).json({ error: '❌ Task ایجاد نشد.', rawResponse: taskResp.data });
    }

    res.status(200).json({
      taskId: taskResp.data.data.taskId,
      msg: '✅ Task Veo3 با موفقیت ایجاد شد.',
      uploadImages: imageUrls.length ? imageUrls : null
    });

  } catch (err) {
    console.error('❌ Error:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({ error: err.response?.data || err.message });
  }
});

/* بررسی وضعیت Task */
router.get('/record-info/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    if (!taskId) return res.status(400).json({ error: '❌ پارامتر taskId الزامی است.' });

    const statusResp = await axios.get(`${RECORD_INFO_URL}?taskId=${taskId}`, {
      headers: { Authorization: `Bearer ${API_KEY}` }
    });

    res.status(200).json(statusResp.data);
  } catch (err) {
    console.error('❌ Status error:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({ error: err.response?.data || err.message });
  }
});

/* دریافت ویدیوی 1080P (فقط برای 16:9 و بدون fallback) با retry ساده */
router.get('/get-1080p-video/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    if (!taskId) return res.status(400).json({ error: '❌ پارامتر taskId الزامی است.' });

    const statusResp = await axios.get(`${RECORD_INFO_URL}?taskId=${taskId}`, {
      headers: { Authorization: `Bearer ${API_KEY}` }
    });

    const record = statusResp.data.data;
    if (!record) return res.status(404).json({ error: '❌ رکوردی یافت نشد.' });
    if (record.fallbackFlag) return res.status(400).json({ error: '❌ ویدیو fallback قابل دریافت 1080P نیست.' });
    if (record.aspectRatio !== '16:9') return res.status(400).json({ error: '❌ فقط ویدیوهای 16:9 از 1080P پشتیبانی می‌کنند.' });

    // retry ساده
    let videoResp;
    for (let i = 0; i < 3; i++) {
      try {
        videoResp = await axios.get(`${GET_1080P_URL}?taskId=${taskId}&index=0`, {
          headers: { Authorization: `Bearer ${API_KEY}` }
        });
        break;
      } catch (e) {
        await new Promise(r => setTimeout(r, 2000)); // 2 ثانیه انتظار
      }
    }

    if (!videoResp) return res.status(500).json({ error: '❌ ویدیوی 1080P آماده نیست.' });

    res.status(200).json(videoResp.data);
  } catch (err) {
    console.error('❌ 1080P error:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({ error: err.response?.data || err.message });
  }
});

export default router;
