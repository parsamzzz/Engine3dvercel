// routes/music.js
import express from 'express';
import axios from 'axios';

const router = express.Router();

// 📌 تنظیمات پایه
const BASE_URL = 'https://api.musicgpt.com/api/public/v1';
const API_KEY = process.env.MUSICGTP_API_KEY;

/**
 * 🎵 ساخت موزیک با تمام پارامترها
 * POST /api/music/create
 */
router.post('/create', async (req, res) => {
  const {
    prompt,
    music_style,
    lyrics,
    make_instrumental,
    vocal_only,
    voice_id,
    webhook_url         // اختیاری – اگر خالی بماند، وب‌هوک فعال نمی‌شود
  } = req.body;

  try {
    const response = await axios.post(
      `${BASE_URL}/MusicAI`,
      {
        prompt: prompt || '',
        music_style: music_style || '',
        lyrics: lyrics || '',
        make_instrumental: make_instrumental || false,
        vocal_only: vocal_only || false,
        voice_id: voice_id || '',
        webhook_url: webhook_url || ''
      },
      {
        headers: {
          Authorization: API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    // پاسخ شامل task_id و conversion_idها
    res.json(response.data);
  } catch (err) {
    console.error('❌ MusicAI error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

/**
 * 🔎 بررسی وضعیت تولید موزیک
 * GET /api/music/status/:taskId
 */
router.get('/status/:taskId', async (req, res) => {
  const { taskId } = req.params;
  const { conversionType = 'MUSIC_AI' } = req.query;

  try {
    const response = await axios.get(`${BASE_URL}/byId`, {
      headers: { Authorization: API_KEY },
      params: { conversionType, task_id: taskId }
    });

    res.json(response.data);
  } catch (err) {
    console.error('❌ Status error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

export default router;
