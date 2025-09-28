// routes/voice.js
import express from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';  // 👈 حتما اضافه کن

const router = express.Router();
const upload = multer();

const BASE_URL = 'https://api.musicgpt.com/api/public/v1';
const API_KEY =
  'oZUxto2nBJQYM88WLXbwUwu0TS8vOcAd7zBNOBWfnvR6MEWPzSyBdOLsr3S02fXXm8F7QKG35m-8kWak8szUFQ';

/**
 * 🎤 دریافت لیست صداها
 */
router.get('/list', async (req, res) => {
  const { limit = 20, page = 0 } = req.query;
  try {
    const response = await axios.get(`${BASE_URL}/getAllVoices`, {
      headers: { Authorization: API_KEY },
      params: { limit, page }
    });
    res.json(response.data);
  } catch (err) {
    console.error('❌ Voice List error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

/**
 * 🔄 تغییر صدا
 */
router.post('/change', upload.single('audio_file'), async (req, res) => {
  const { audio_url, voice_id, remove_background = 0, pitch = 0 } = req.body;
  const file = req.file;

  if (!audio_url && !file) {
    return res.status(400).json({ error: '❌ لطفاً یک audio_url یا فایل صوتی ارسال کنید.' });
  }
  if (!voice_id) {
    return res.status(400).json({ error: '❌ فیلد voice_id الزامی است.' });
  }

  try {
    const formData = new FormData();
    if (audio_url) formData.append('audio_url', audio_url);
    if (file) formData.append('audio_file', file.buffer, file.originalname);
    formData.append('voice_id', voice_id);
    formData.append('remove_background', remove_background);
    formData.append('pitch', pitch);

    const response = await axios.post(`${BASE_URL}/VoiceChanger`, formData, {
      headers: {
        Authorization: API_KEY,
        ...formData.getHeaders()
      }
    });

    res.json(response.data);
  } catch (err) {
    console.error('❌ Voice Change error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

/**
 * 🔎 بررسی وضعیت تبدیل صدا
 */
router.get('/status/:conversionId', async (req, res) => {
  const { conversionId } = req.params;
  try {
    const response = await axios.get(`${BASE_URL}/byId`, {
      headers: { Authorization: API_KEY },
      params: { conversion_id: conversionId }
    });
    res.json(response.data);
  } catch (err) {
    console.error('❌ Status error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

export default router;
