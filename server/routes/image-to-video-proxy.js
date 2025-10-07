import express from 'express'
import cors from 'cors'
import axios from 'axios'

const router = express.Router()

// فعال‌سازی CORS بدون محدودیت
router.use(cors())
router.options('*', cors())

const API_KEY = process.env.AIVIDEO_API_KEY || 'ef19f58f74c43ddc6d7cbaebfd0b1e5f'

let videoCounter = 0 // شمارنده لاگ ویدیوها

router.post('/', async (req, res) => {
  try {
    const {
      img_base64,
      model = 'gen4',
      image_as_end_frame = false,
      flip = false,
      motion = 5,
      seed = 0,
      time = 5,
      callback_url = '',
    } = req.body

    if (!img_base64 || typeof img_base64 !== 'string' || !img_base64.startsWith('data:image')) {
      return res.status(400).json({ error: 'img_base64 is required and must be a valid base64 image string' })
    }

    const body = {
      img_prompt: img_base64,
      model,
      image_as_end_frame,
      flip,
      motion: Number(motion),
      seed: Number(seed),
      time: Number(time),
      callback_url,
    }

    const response = await axios.post(
      'https://api.aivideoapi.com/runway/generate/image',
      body,
      {
        headers: {
          Authorization: API_KEY,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 30000,
      }
    )

    // لاگ شماره‌گذاری برای ویدیو تولید شده
    videoCounter++
    console.info(`🎬 [Video Generate] ویدیو شماره ${videoCounter} تولید شد.`)

    res.status(response.status).json(response.data)
  } catch (error) {
    console.error('❌ Image-to-video error:', error.response?.data || error.message)
    res.status(error.response?.status || 500).json({ error: error.response?.data || error.message })
  }
})

router.get('/status', async (req, res) => {
  const uuid = req.query.uuid

  if (!uuid || typeof uuid !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid uuid parameter' })
  }

  try {
    const response = await axios.get('https://api.aivideoapi.com/status', {
      params: { uuid },
      headers: {
        Authorization: API_KEY,
        Accept: 'application/json',
      },
      timeout: 10000,
    })

    const data = response.data

    res.status(response.status).json({
      uuid: data.uuid,
      status: data.status,
      progress: data.progress || 0,
      error: data.error || null,
    })
  } catch (error) {
    console.error('Status proxy error:', error.response?.data || error.message)
    res.status(error.response?.status || 500).json({ error: error.response?.data || error.message })
  }
})

router.get('/video-proxy', async (req, res) => {
  const uuid = req.query.uuid
  const download = req.query.download === 'true'

  if (!uuid) {
    return res.status(400).json({ error: 'Missing uuid parameter' })
  }

  try {
    const statusResponse = await axios.get('https://api.aivideoapi.com/status', {
      params: { uuid },
      headers: {
        Authorization: API_KEY,
        Accept: 'application/json',
      },
      timeout: 10000,
    })

    const videoUrl = statusResponse.data.url

    if (!videoUrl) {
      return res.status(404).json({ error: 'Video URL not available yet' })
    }

    const videoResponse = await axios.get(videoUrl, {
      responseType: 'stream',
      timeout: 30000,
    })

    res.setHeader('Content-Type', videoResponse.headers['content-type'] || 'video/mp4')

    if (videoResponse.headers['content-length']) {
      res.setHeader('Content-Length', videoResponse.headers['content-length'])
    }

    if (download) {
      res.setHeader('Content-Disposition', 'attachment; filename="generated.mp4"')
    }

    videoResponse.data.pipe(res)
  } catch (error) {
    console.error('Video proxy by UUID error:', error.response?.data || error.message)
    res.status(error.response?.status || 500).json({ error: 'Failed to fetch video by UUID' })
  }
})

export default router
