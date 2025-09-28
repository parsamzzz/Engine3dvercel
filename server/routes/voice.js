// routes/voice.js
import express from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';

const router = express.Router();
const upload = multer();

const BASE_URL = 'https://api.musicgpt.com/api/public/v1';
const API_KEY =
  '-ccq3UOUBxFhk6IjU19gPVTmDL1ACK93kzA7XTiCMJPDWTZx6CD2LRS5a0X4nk3BsZIVvS9RqfsyrjpT7dSy2g';

/**
 * 🎤 دریافت لیست صداها
 */
router.get('/list', async (req, res) => {
  const { limit = 20, page = 0 } = req.query;
  try {
    const response = await axios.get(`${BASE_URL}/getAllVoices`, {
      headers: { Authorization: API_KEY },
      params: { limit, page },
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
  const { audio_url, voice_id, remove_background = 0, pitch = 0, webhook_url = '' } = req.body;
  const file = req.file;

  if (!voice_id) {
    return res.status(400).json({ error: '❌ فیلد voice_id الزامی است.' });
  }
  if (!audio_url && !file) {
    return res.status(400).json({ error: '❌ لطفاً یک audio_url یا فایل صوتی ارسال کنید.' });
  }

  try {
    const formData = new FormData();
    if (audio_url) formData.append('audio_url', audio_url);
    if (file) formData.append('audio_file', file.buffer, file.originalname);
    formData.append('voice_id', voice_id);
    formData.append('remove_background', remove_background);
    formData.append('pitch', pitch);
    if (webhook_url) formData.append('webhook_url', webhook_url);

    const response = await axios.post(`${BASE_URL}/VoiceChanger`, formData, {
      headers: {
        Authorization: API_KEY,
        ...formData.getHeaders(),
      },
    });

    res.json(response.data); // شامل task_id و conversion_id
  } catch (err) {
    console.error('❌ Voice Change error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

/**
 * 🔎 بررسی وضعیت تغییر صدا
 * ⚠️ باید از task_id استفاده شود
 */
router.get('/status/:taskId', async (req, res) => {
  const { taskId } = req.params;

  try {
    const response = await axios.get(`${BASE_URL}/byId`, {
      headers: { Authorization: API_KEY },
      params: {
        conversionType: 'VOICE_CONVERSION', // 👈 مطابق مستندات
        task_id: taskId,                     // 👈 به جای conversion_id
      },
    });

    res.json(response.data);
  } catch (err) {
    console.error('❌ Status error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

export default router;
