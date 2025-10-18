import express from 'express';
import { GoogleGenAI, Modality } from '@google/genai';
import fs from 'fs';
import multer from 'multer';
import path from 'path';

const router = express.Router();
const upload = multer({ dest: 'tmp/' });

// =====================
// 🔑 همه کلیدها
// =====================
const API_KEYS = [
  "AIzaSyAM6ZzH-ngfxY1wKTnoHVMyD2kYOHLd1i4",
  "AIzaSyBRLO9BrEuF5Psn9HzVIgM5t7r4BhfytW0",
  "AIzaSyCvPUJ7zLFWJIzVw9UD3voAY9FJXTXAcD4",
  "AIzaSyDhqJ8gwKQixfPtCZeEzfropdYh9-_yqb0",
  "AIzaSyDpqyXS3RAsPufJAKT3Zmne8SL1EgOIQKc",
  "AIzaSyDqXmdk8a3euOrvH-FTsSmUA0BP6wfPPIk",
  "AIzaSyDMSd0-yTpoYUEJqa2K6rpMhS9I1p0nLcQ",
  "AIzaSyAQ9qgYwtrutklb3BTpKiW6tAZ2fhPfSWI",
  "AIzaSyCfX1d9Xr0M7BiDyzwIxy5f3oVJqO__n9Y",
  "AIzaSyD7wbXAYoSYD0WGg8-6IZOhKyfSym00g7g",
  "AIzaSyDAqLei5_h4y5Vg1qVSKvdbbLiHQrGfjX4",
  "AIzaSyADOgOBfQT1U-bRQAxXscq4sPqJJlEz4_0",
  "AIzaSyAZk5FE4XUx14SEH9n8wy6rh0PbVOM_e0o",
  "AIzaSyAmDnnMUYcv6QMt-fhF0YHdRzD4x2qDwqg",
  "AIzaSyBQ_yRx5w6bmhnYpeKqFGnWBwdtWoGFTgc",
  "AIzaSyBD5V0Y0BYKFUIFvbnmi46IFuh5y-ibSdA",
  "AIzaSyARk8SUMKga6uXMt6v-FWtGdlo6arfgtUM",
  "AIzaSyCGcnePSQRL6PUC0zrE3z3NBQEdAWuWIVE",
  "AIzaSyAXGxErlDP7gEZ5nWCxDl3V0Tu5Poo6AzQ",
  "AIzaSyAYnfzx1_3UiyE-jyfLpO4i2zrcM0USUoA",
  "AIzaSyAzweAy_UzoquW2EMJ7n6mzSe-EUQZ7GCk",
  "AIzaSyDWxlokRrSIMBlup0FA8JOCDCpYsJma7VY",
  "AIzaSyCoN49vCB-p1pNzkoP0i1P6tGBBgBQMRV4",
  "AIzaSyBn1Fm_OtU0cWxo4MkpnrDyBJn9HXlwABQ",
  "AIzaSyDGBqiqsW9U1mivsAwh5vMU0ZARP8E-uvM",
  "AIzaSyCa_2ERS8aAM5pKFa1xOhwsyJ_IpXxmEdU",
  "AIzaSyB-bI0yLJG7U5jtBRpYqMsSZdvwkWpHcSE",
  "AIzaSyDiDSuUQzXOUdUK0RMGflQG1V62FWySvD0",
  "AIzaSyB20bDSlzPbJVkVJf1_ogIbline3gB32LQ",
  "AIzaSyA73WazXgApiGxxNIUkNLS6HH58FwnytlY",
  "AIzaSyD9Kw0CvNCbvHB8EL0LCMI1N-fIwdnwDiY",
  "AIzaSyCsMSgT_VWOLJRaxDoWHiteKuZm23JtrJM",
  "AIzaSyANSaxkxwQrGUNT6zkAjvemsRSxNe2eyok",
  "AIzaSyBrYNNtwbvgky0rdEDyVzGGCTKXgH5Bsp8",
  "AIzaSyA-MtzXcddrH6ShV_y6hZ7fncpxy0d5JO4",
  "AIzaSyARi1ijMaLk5bQkJg08UCd0G7DcIJCtiIA",
  "AIzaSyD1QDm9kNrIi3cbNkEvkTTZTD4KQSh-Io0",
  "AIzaSyCki2DcqBZh5_5hJ1VmdKzK5VkvDStM9Ic",
  "AIzaSyC8Jn0bF7FPzO4UHcArQzYMoj_v8vPu1OY",
  "AIzaSyARHMDI6gJr77QePCbUne6G4U6VhC6caRI",
  "AIzaSyCG0e6OkV7RZ9xf9doYQgFMlZ_evHNZx4M",
  "AIzaSyALL4vcUd3Kgk17OCNTt75H5VErcwvDxUc"
];

const PRIVATE_KEY = 'threedify_7Vg5NqXk29Lz3MwYcPfBTr84sD';

// =====================
// وضعیت کلیدها و صف
// =====================
const keyState = API_KEYS.map(() => ({ cooldownUntil: 0, inUse: false }));
let apiKeyIndex = 0;
const requestQueue = [];
let processingQueue = false;

// =====================
// انتخاب کلید سالم
// =====================
function getNextAvailableKey() {
  const totalKeys = API_KEYS.length;
  for (let i = 0; i < totalKeys; i++) {
    const idx = (apiKeyIndex + i) % totalKeys;
    const state = keyState[idx];
    if (!state.inUse && Date.now() > state.cooldownUntil) {
      apiKeyIndex = (idx + 1) % totalKeys;
      state.inUse = true;
      return { key: API_KEYS[idx], idx };
    }
  }
  return null;
}

// =====================
// MIME type براساس پسوند فایل
// =====================
function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  switch(ext) {
    case '.wav': return 'audio/wav';
    case '.mp3': return 'audio/mp3';
    case '.aiff': return 'audio/aiff';
    case '.aac': return 'audio/aac';
    case '.ogg': return 'audio/ogg';
    case '.flac': return 'audio/flac';
    default: return 'audio/mp3';
  }
}

// =====================
// پردازش صف
// =====================
async function processQueue() {
  if (processingQueue) return;
  processingQueue = true;

  while (requestQueue.length > 0) {
    const { req, res, next } = requestQueue.shift();
    try {
      await handleRequest(req, res, next);
    } catch (err) {
      next(err);
    }
  }

  processingQueue = false;
}

// =====================
// تابع اصلی درخواست
// =====================
async function handleRequest(req, res, next) {
  let audioBuffer;
  let mimeType = 'audio/mp3';

  if (req.file) {
    audioBuffer = fs.readFileSync(req.file.path);
    mimeType = getMimeType(req.file.originalname);
    fs.unlinkSync(req.file.path);
  } else {
    return res.status(400).json({ error: 'فایل صوتی معتبر نیست.' });
  }

  let triedKeys = 0;
  const totalKeys = API_KEYS.length;

  while (triedKeys < totalKeys) {
    const keyData = getNextAvailableKey();
    if (!keyData) {
      await new Promise(r => setTimeout(r, 100));
      continue;
    }

    const { key, idx } = keyData;

    try {
      const client = new GoogleGenAI({ apiKey: key });

      // مرحله 1: آپلود فایل
      const fileUpload = await client.files.upload({
        file: audioBuffer,
        config: { mimeType }
      });

      // مرحله 2: generateContent
      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        instructions: 'Generate a full transcript with timestamps in SRT format.',
        input_files: [fileUpload.uri],
        config: { responseModalities: [Modality.TEXT] }
      });

      keyState[idx].inUse = false;

      const transcript = response.candidates?.[0]?.content?.[0]?.text;
      if (transcript) return res.json({ srt: transcript });

      return res.status(200).json({ message: 'متنی دریافت نشد.', response });

    } catch (err) {
      keyState[idx].inUse = false;
      if (err.message.includes('429')) {
        keyState[idx].cooldownUntil = Date.now() + 60 * 60 * 1000;
        triedKeys++;
        continue;
      }
      return next(err);
    }
  }

  res.status(503).json({ error: 'هیچ کلید موفق نشد.' });
}

// =====================
// مسیر POST
// =====================
router.post('/', upload.single('audio'), (req, res, next) => {
  const clientKey = req.headers['x-api-key'];
  if (!clientKey || clientKey !== PRIVATE_KEY) return res.status(403).json({ error: 'Unauthorized' });

  requestQueue.push({ req, res, next });
  processQueue();
});

// مدیریت خطا
router.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err);
  res.status(500).json({ error: 'خطای سرور.' });
});

export default router;
