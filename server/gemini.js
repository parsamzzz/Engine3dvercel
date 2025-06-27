import express from 'express'
import multer from 'multer'
import axios from 'axios'
import mime from 'mime-types'
import dotenv from 'dotenv'

dotenv.config()

const router = express.Router()
const upload = multer()

// کلیدهای عمومی برای Google Gemini
const API_KEYS = process.env.GEMINI_API_KEYS?.split(',').map(k => k.trim()) || []

// کلید دسترسی خصوصی برای حفاظت API
const PRIVATE_KEY = process.env.PRIVATE_API_KEY

router.post('/', upload.single('image'), async (req, res) => {
  // ⛔ بررسی کلید امنیتی
  const clientKey = req.headers['x-api-key']
  if (!clientKey || clientKey !== PRIVATE_KEY) {
    console.warn('🛑 درخواست بدون یا با کلید نامعتبر رد شد.')
    return res.status(403).json({ error: 'Unauthorized' })
  }

  const prompt = req.body.prompt
  const file = req.file
  const imageBuffer = file?.buffer
  const originalName = file?.originalname

  console.log('📥 دریافت شد → prompt:', prompt)
  console.log('📷 نام فایل:', originalName)
  console.log('📏 حجم فایل:', imageBuffer?.length || 0, 'بایت')

  if (!prompt || !imageBuffer || !originalName) {
    console.warn('⛔ داده ناقص دریافت شد.')
    return res.status(400).json({ error: 'prompt یا تصویر ارسال نشده.' })
  }

  const mimeType = mime.lookup(originalName) || file.mimetype
  console.log('🧪 تشخیص MIME type:', mimeType)

  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
    console.warn('⚠️ فرمت غیرمجاز:', mimeType)
    return res.status(415).json({ error: 'فرمت تصویر پشتیبانی نمی‌شود. فقط jpg, png, webp مجازند.' })
  }

  const base64Image = imageBuffer.toString('base64')

  for (const key of API_KEYS) {
    const shortKey = key.substring(0, 20) + '...'
    console.log('🚀 در حال ارسال به Gemini با کلید:', shortKey)

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
        console.log('✅ تصویر تولید شد ✅')
        return res.json({ base64 })
      } else {
        console.warn('⚠️ پاسخ بدون تصویر بود.')
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message
      console.error(`❌ خطا در کلید ${shortKey}:`, msg)
    }
  }

  console.error('❌ هیچ کلیدی موفق نشد.')
  res.status(500).json({ error: 'هیچ‌کدام از کلیدهای Gemini موفق نبود.' })
})

export default router
