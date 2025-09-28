// routes/sound.js
import express from 'express';
import axios from 'axios';

const router = express.Router();

const BASE_URL = 'https://api.musicgpt.com/api/public/v1';
const API_KEY = 'oZUxto2nBJQYM88WLXbwUwu0TS8vOcAd7zBNOBWfnvR6MEWPzSyBdOLsr3S02fXXm8F7QKG35m-8kWak8szUFQ';

/**
 * 🎛 ساخت صدا از متن
 * POST /api/sound/create
 */
router.post('/create', async (req, res) => {
  const { prompt, audio_length, webhook_url } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: '❌ فیلد prompt الزامی است.' });
  }

  try {
    // 🟢 استفاده از فرم URL-encoded چون API این فرمت را می‌خواهد
    const formData = new URLSearchParams();
    formData.append('prompt', prompt);
    formData.append('audio_length', audio_length || 10);
    if (webhook_url) formData.append('webhook_url', webhook_url);

    const response = await axios.post(`${BASE_URL}/sound_generator`, formData, {
      headers: {
        Authorization: API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    res.json(response.data);
  } catch (err) {
    console.error('❌ Sound Generator error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

/**
 * 🔎 بررسی وضعیت ساخت صدا
 * GET /api/sound/status/:taskId
 */
router.get('/status/:taskId', async (req, res) => {
  const { taskId } = req.params;
  const { conversionType = 'SOUND_GENERATOR' } = req.query;

  try {
    const response = await axios.get(`${BASE_URL}/byId`, {
      headers: { Authorization: API_KEY },
      params: { conversionType, task_id: taskId }
    });

    res.json(response.data);
  } catch (err) {
    console.error('❌ Sound Status error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

export default router;
