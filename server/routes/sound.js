// routes/sound.js
import express from 'express';
import axios from 'axios';

const router = express.Router();

const BASE_URL = 'https://api.musicgpt.com/api/public/v1';
const API_KEY =
  '-ccq3UOUBxFhk6IjU19gPVTmDL1ACK93kzA7XTiCMJPDWTZx6CD2LRS5a0X4nk3BsZIVvS9RqfsyrjpT7dSy2g';

/**
 * 🎛 ساخت صدا از متن
 * POST /api/sound/create
 */
router.post('/create', async (req, res) => {
  const { prompt, audio_length = 10, webhook_url = '' } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: '❌ فیلد prompt الزامی است.' });
  }

  try {
    // 🟢 ارسال به‌صورت URL-encoded
    const formData = new URLSearchParams();
    formData.append('prompt', prompt);
    formData.append('audio_length', audio_length);
    if (webhook_url) formData.append('webhook_url', webhook_url);

    const response = await axios.post(`${BASE_URL}/sound_generator`, formData, {
      headers: {
        Authorization: API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    // پاسخ شامل task_id و conversion_id است
    res.json(response.data);
  } catch (err) {
    console.error('❌ Sound Generator error:', err.response?.data || err.message);
    res.status(500).json({
      error: err.response?.data || err.message,
    });
  }
});

/**
 * 🔎 بررسی وضعیت ساخت صدا
 * GET /api/sound/status/:taskId
 * ✅ طبق مستندات باید از task_id استفاده شود
 */
router.get('/status/:taskId', async (req, res) => {
  const { taskId } = req.params;

  try {
    const response = await axios.get(`${BASE_URL}/byId`, {
      headers: { Authorization: API_KEY },
      params: {
        conversionType: 'SOUND_GENERATOR', // 👈 الزامی
        task_id: taskId,                   // 👈 بر اساس مستندات
      },
    });

    res.json(response.data);
  } catch (err) {
    console.error('❌ Sound Status error:', err.response?.data || err.message);
    res.status(500).json({
      error: err.response?.data || err.message,
    });
  }
});

export default router;
