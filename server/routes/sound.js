// routes/sound.js
import express from 'express'
import axios from 'axios'

const router = express.Router()

const BASE_URL = 'https://api.musicgpt.com/api/public/v1'
const API_KEY = '-ccq3UOUBxFhk6IjU19gPVTmDL1ACK93kzA7XTiCMJPDWTZx6CD2LRS5a0X4nk3BsZIVvS9RqfsyrjpT7dSy2g'


/* 🎛 ساخت صدا از متن  POST /api/sound/create */
router.post('/create', async (req, res) => {
  const { prompt = '', audio_length = 10, webhook_url = '' } = req.body

  if (!prompt) {
    return res.status(400).json({ error: '❌ فیلد prompt الزامی است.' })
  }

  try {
    // می‌توان JSON هم فرستاد؛ MusicGPT قبول می‌کند
    const response = await axios.post(
      `${BASE_URL}/sound_generator`,
      { prompt, audio_length, webhook_url },
      { headers: { Authorization: API_KEY, 'Content-Type': 'application/json' } }
    )

    // پاسخ شامل task_id و conversion_id
    res.status(response.status).json(response.data)
  } catch (err) {
    console.error('❌ Sound Generator error:', err.response?.data || err.message)
    res.status(err.response?.status || 500).json({ error: err.response?.data || err.message })
  }
})

/* 🔎 بررسی وضعیت ساخت صدا  GET /api/sound/status/:taskId */
router.get('/status/:taskId', async (req, res) => {
  try {
    const response = await axios.get(`${BASE_URL}/byId`, {
      headers: { Authorization: API_KEY },
      params: { conversionType: 'SOUND_GENERATOR', task_id: req.params.taskId }
    })

    res.status(response.status).json(response.data)
  } catch (err) {
    console.error('❌ Sound Status error:', err.response?.data || err.message)
    res.status(err.response?.status || 500).json({ error: err.response?.data || err.message })
  }
})

/* 🔎 دریافت جزئیات با conversion_id  GET /api/sound/conversion/:conversionId */
router.get('/conversion/:conversionId', async (req, res) => {
  try {
    const response = await axios.get(`${BASE_URL}/byId`, {
      headers: { Authorization: API_KEY },
      params: { conversionType: 'SOUND_GENERATOR', conversion_id: req.params.conversionId }
    })

    res.status(response.status).json(response.data)
  } catch (err) {
    console.error('❌ Sound Conversion error:', err.response?.data || err.message)
    res.status(err.response?.status || 500).json({ error: err.response?.data || err.message })
  }
})

export default router
