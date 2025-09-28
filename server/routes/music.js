// routes/music.js
import express from 'express';
import axios from 'axios';

const router = express.Router();

const BASE_URL = 'https://api.musicgpt.com/api/public/v1';
const API_KEY =
  'oZUxto2nBJQYM88WLXbwUwu0TS8vOcAd7zBNOBWfnvR6MEWPzSyBdOLsr3S02fXXm8F7QKG35m-8kWak8szUFQ';
/* 🎵 ساخت موزیک با MusicAI */
router.post('/create', async (req, res) => {
  const {
    prompt,
    music_style,
    lyrics,
    make_instrumental = false,
    vocal_only = false,
    voice_id,
    webhook_url
  } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: '❌ فیلد prompt الزامی است.' });
  }

  try {
    const response = await axios.post(
      `${BASE_URL}/MusicAI`,
      {
        prompt,
        music_style,
        lyrics,
        make_instrumental,
        vocal_only,
        voice_id,
        webhook_url
      },
      {
        headers: {
          Authorization: API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    // پاسخ شامل task_id و conversion_id_1 و conversion_id_2 است
    res.json(response.data);
  } catch (err) {
    console.error('❌ MusicAI error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

/* 🔎 بررسی وضعیت تولید موزیک با task_id */
router.get('/status/:taskId', async (req, res) => {
  const { taskId } = req.params;

  try {
    const response = await axios.get(`${BASE_URL}/byId`, {
      headers: { Authorization: API_KEY },
      params: {
        task_id: taskId,                // ✅ استفاده از task_id
        conversionType: 'MUSIC_AI'      // ✅ برای MusicAI الزامی است
      }
    });

    res.json(response.data);
  } catch (err) {
    console.error('❌ Status error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

/* 🎤 دریافت لیست صداها */
router.get('/voices', async (req, res) => {
  const { limit = 20, page = 0 } = req.query;

  try {
    const response = await axios.get(`${BASE_URL}/getAllVoices`, {
      headers: { Authorization: API_KEY },
      params: { limit, page }
    });

    res.json(response.data);
  } catch (err) {
    console.error('❌ Voices List error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

export default router;
