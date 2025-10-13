import express from 'express'
import cors from 'cors'
import axios from 'axios'

const router = express.Router()

const API_KEY = process.env.AIVIDEO_API_KEY || 'b46f49238b51c77af7078c7d9156b2af'

router.use(cors())
router.options('*', cors())

let videoCounter = 0 
router.post('/', async (req, res) => {
  try {
    const {
      img_base64,
      text_prompt,
      model = 'gen4',
      image_as_end_frame = false,
      flip = false,
      motion = 5,
      seed = 0,
      callback_url = '',
      time = 5,
    } = req.body

    if (!text_prompt || typeof text_prompt !== 'string' || text_prompt.trim() === '') {
      return res.status(400).json({ error: 'text_prompt is required and must be a non-empty string' })
    }
    if (!img_base64 || typeof img_base64 !== 'string' || !img_base64.startsWith('data:image')) {
      return res.status(400).json({ error: 'img_base64 is required and must be a valid base64 image string' })
    }

    const duration = Number(time)
    if (![5, 10].includes(duration)) {
      return res.status(400).json({ error: 'Invalid time value. Only 5 or 10 are allowed.' })
    }

    const body = {
      text_prompt,
      img_prompt: img_base64,
      model,
      image_as_end_frame: image_as_end_frame === true || image_as_end_frame === 'true',
      flip: flip === true || flip === 'true',
      motion: Number(motion),
      seed: Number(seed),
      callback_url,
      time: duration,
    }

    const response = await axios.post(
      'https://api.aivideoapi.com/runway/generate/imageDescription',
      body,
      {
        headers: {
          Authorization: API_KEY,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 15000,
      }
    )

    // لاگ شماره‌گذاری برای ویدیو تولید شده
    videoCounter++
    console.info(`🎬 [Video Generate] ویدیو شماره ${videoCounter} تولید شد.`)

    res.status(response.status).json(response.data)
  } catch (error) {
    console.error('Image + Text to video error:', error.response?.data || error.message)
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
    if (req.query.download === 'true') {
      res.setHeader('Content-Disposition', 'attachment; filename="video.mp4"')
    }

    videoResponse.data.pipe(res)
  } catch (error) {
    console.error('Video proxy by UUID error:', error.response?.data || error.message)
    res.status(error.response?.status || 500).json({ error: 'Failed to fetch video by UUID' })
  }
})

export default router
