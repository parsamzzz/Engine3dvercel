import express from 'express'
import multer from 'multer'
import axios from 'axios'
import mime from 'mime-types'
import dotenv from 'dotenv'

dotenv.config()

const router = express.Router()
const upload = multer()

// API keys برای Gemini
const API_KEYS = process.env.GEMINI_API_KEYS?.split(',').map(k => k.trim()) || []

// کلید خصوصی برای احراز هویت
const PRIVATE_KEY = process.env.PRIVATE_API_KEY

router.post('/', upload.single('image'), async (req, res) => {
  // ⛔ بررسی احراز هویت
  const clientKey = req.headers['x-api-key']
  if (!clientKey || clientKey !== PRIVATE_KEY) {
    console.warn('🛑 دسترسی غیرمجاز.')
    return res.status(403).json({ error: 'Unauthorized' })
  }

  const prompt = req.body.prompt
  const file = req.file
  const imageBuffer = file?.buffer
  const originalName = file?.originalname

  console.log('📥 prompt:', prompt)
  console.log('📷 file:', originalName)
  console.log('📏 size:', imageBuffer?.length || 0, 'bytes')

  if (!prompt || !imageBuffer || !originalName) {
    return res.status(400).json({ error: 'prompt یا تصویر ارسال نشده.' })
  }

  const mimeType = mime.lookup(originalName) || file.mimetype
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
    return res.status(415).json({ error: 'فرمت تصویر پشتیبانی نمی‌شود.' })
  }

  const base64Image = imageBuffer.toString('base64')

  for (const key of API_KEYS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${key}`

      const payload = {
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Image,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      }

      const aiRes = await axios.post(url, payload, {
        headers: { 'Content-Type': 'application/json' },
      })

      const base64 = aiRes.data?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data
      if (base64) {
        return res.json({ base64 })
      }
    } catch (err) {
      console.error(`❌ Key ${key.substring(0, 15)}...`, err.response?.data?.error?.message || err.message)
    }
  }

  res.status(500).json({ error: 'هیچ‌کدام از کلیدهای Gemini موفق نبود.' })
})

export default router
