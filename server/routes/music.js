// routes/music.js
import express from 'express';
import axios from 'axios';

const router = express.Router();

// ✅ بهتر است کلید از متغیر محیطی خوانده شود
const BASE_URL = 'https://api.musicgpt.com/api/public/v1';
const API_KEY =
  '-ccq3UOUBxFhk6IjU19gPVTmDL1ACK93kzA7XTiCMJPDWTZx6CD2LRS5a0X4nk3BsZIVvS9RqfsyrjpT7dSy2g';

/* 🎵 ساخت موزیک با MusicAI */
router.post('/create', async (req, res) => {
  const {
    prompt = '',
    music_style = '',
    lyrics = '',
    make_instrumental = false,
    vocal_only = false,
    voice_id = '',
    webhook_url = '',
    bpm_request = 0,      // 👈 پشتیبانی BPM
    key_request = ''      // 👈 پشتیبانی کلید موسیقی
  } = req.body;

  // حداقل یکی از این سه لازم است
  if (!prompt && !lyrics && !music_style) {
    return res.status(400).json({
      error: '❌ حداقل یکی از فیلدهای prompt یا lyrics یا music_style لازم است.'
    });
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
        webhook_url,
        bpm_request,   // 👈 اضافه شد
        key_request    // 👈 اضافه شد
      },
      {
        headers: {
          Authorization: API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    // پاسخ شامل task_id و conversion_id_1 و conversion_id_2
    res.status(response.status).json(response.data);
  } catch (err) {
    console.error('❌ MusicAI error:', err.response?.data || err.message);
    res
      .status(err.response?.status || 500)
      .json({ error: err.response?.data || err.message });
  }
});

/* 🔎 بررسی وضعیت تولید موزیک با task_id */
router.get('/status/:taskId', async (req, res) => {
  const { taskId } = req.params;
  try {
    const response = await axios.get(`${BASE_URL}/byId`, {
      headers: { Authorization: API_KEY },
      params: { conversionType: 'MUSIC_AI', task_id: taskId }
    });
    res.status(response.status).json(response.data);
  } catch (err) {
    console.error('❌ Status error:', err.response?.data || err.message);
    res
      .status(err.response?.status || 500)
      .json({ error: err.response?.data || err.message });
  }
});

/* 🔎 دریافت جزئیات آهنگ با conversion_id */
router.get('/conversion/:conversionId', async (req, res) => {
  const { conversionId } = req.params;
  try {
    const response = await axios.get(`${BASE_URL}/byId`, {
      headers: { Authorization: API_KEY },
      params: { conversionType: 'MUSIC_AI', conversion_id: conversionId }
    });
    res.status(response.status).json(response.data);
  } catch (err) {
    console.error('❌ Conversion error:', err.response?.data || err.message);
    res
      .status(err.response?.status || 500)
      .json({ error: err.response?.data || err.message });
  }
});

/* 🎤 دریافت لیست صداهای MusicAI */
router.get('/voices', async (req, res) => {
  const { limit = 20, page = 0 } = req.query;
  try {
    const response = await axios.get(`${BASE_URL}/getAllVoices`, {
      headers: { Authorization: API_KEY },
      params: { limit, page }
    });
    res.status(response.status).json(response.data);
  } catch (err) {
    console.error('❌ Voices List error:', err.response?.data || err.message);
    res
      .status(err.response?.status || 500)
      .json({ error: err.response?.data || err.message });
  }
});

export default router;
