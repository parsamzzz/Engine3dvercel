import express from 'express';
import cors from 'cors';
import axios from 'axios';

const router = express.Router();

// فعال‌سازی CORS بدون محدودیت
router.use(cors());
router.options('*', cors());

// کلید API (بهتر است از env گرفته شود)
const API_KEY = process.env.AIVIDEO_API_KEY || '078146981ef7d340a1f118a54db40dbf';

// ==============================
// POST /api/text-to-video
// تولید ویدیو از متن
// ==============================
router.post('/', async (req, res) => {
  try {
    const {
      text_prompt,
      model = 'gen3',
      width = 1344,
      height = 768,
      seed = 0,
      callback_url = '',
      time = 5,
      motion = 5,
    } = req.body;

    if (!text_prompt || typeof text_prompt !== 'string' || text_prompt.trim() === '') {
      return res.status(400).json({ error: 'text_prompt is required and must be a non-empty string' });
    }

    const duration = Number(time);
    if (![5, 10].includes(duration)) {
      return res.status(400).json({ error: 'Invalid time value. Only 5 or 10 are allowed.' });
    }

    const body = {
      text_prompt,
      model,
      width,
      height,
      seed,
      callback_url,
      time: duration,
      motion,
    };

    const response = await axios.post(
      'https://api.aivideoapi.com/runway/generate/text',
      body,
      {
        headers: {
          Authorization: API_KEY,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }
    );

    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Text-to-video proxy error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: error.response?.data || error.message });
  }
});

// ==============================
// GET /api/text-to-video/status?uuid=xxx
// بررسی وضعیت تولید ویدیو
// ==============================
router.get('/status', async (req, res) => {
  const uuid = req.query.uuid;

  if (!uuid || typeof uuid !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid uuid parameter' });
  }

  try {
    const response = await axios.get('https://api.aivideoapi.com/status', {
      params: { uuid },
      headers: {
        Authorization: API_KEY,
        Accept: 'application/json',
      },
    });

    const data = response.data;

    res.status(response.status).json({
      uuid: data.uuid,
      status: data.status,
      progress: data.progress || 0,
      error: data.error || null,
    });
  } catch (error) {
    console.error('Status proxy error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: error.response?.data || error.message });
  }
});

// ==============================
// GET /api/text-to-video/video-proxy?uuid=xxx&download=true
// پراکسی ویدیو بر اساس uuid
// ==============================
router.get('/video-proxy', async (req, res) => {
  const uuid = req.query.uuid;
  const download = req.query.download === 'true';

  if (!uuid) {
    return res.status(400).json({ error: 'Missing uuid parameter' });
  }

  try {
    const statusResponse = await axios.get('https://api.aivideoapi.com/status', {
      params: { uuid },
      headers: {
        Authorization: API_KEY,
        Accept: 'application/json',
      },
    });

    const videoUrl = statusResponse.data.url;

    if (!videoUrl) {
      return res.status(404).json({ error: 'Video URL not available yet' });
    }

    const videoResponse = await axios.get(videoUrl, { responseType: 'stream' });

    res.setHeader('Content-Type', videoResponse.headers['content-type'] || 'video/mp4');

    if (videoResponse.headers['content-length']) {
      res.setHeader('Content-Length', videoResponse.headers['content-length']);
    }

    if (download) {
      res.setHeader('Content-Disposition', 'attachment; filename="generated.mp4"');
    }

    videoResponse.data.pipe(res);
  } catch (error) {
    console.error('Video proxy by UUID error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: 'Failed to fetch video by UUID' });
  }
});

export default router;
