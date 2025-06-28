// index.js
import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import cors from 'cors';
import { fileURLToPath } from 'url';
import geminiImageRoute from './routes/gemini.js'; // فرض بر این است فایل روت آپلود تصویر اینجاست

import axios from 'axios';

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientPath = path.join(__dirname, 'client'); // مسیر فایل‌های فرانت

app.use(cors());
app.use(express.json({ limit: '5mb' })); // محدودیت حجم JSON
app.use(express.urlencoded({ extended: true }));

// روت تصویر (Upload + Generate)
app.use('/api/gemini-image', geminiImageRoute);

// روت چت (مثال)
const BASE_PROMPT = `
شما یک دستیار هوشمند هستید که به زبان فارسی پاسخ می‌دهید.
`;
app.post('/api/chat', async (req, res) => {
  try {
    const { history } = req.body;
    if (!Array.isArray(history)) {
      return res.status(400).json({ error: 'فرمت history نامعتبر است.' });
    }

    const userConversation = history
      .map(h => (h.role === 'user' ? 'کاربر' : 'دستیار') + ': ' + h.text)
      .join('\n');

    const fullPrompt = `${BASE_PROMPT}\n\n🧠 مکالمه تا این لحظه:\n${userConversation}\n\n🎯 فقط به آخرین سؤال کاربر پاسخ بده — دقیق، مختصر و متناسب با زبان کاربر.`;

    const aiRes = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.API_KEY}`,
      { contents: [{ parts: [{ text: fullPrompt }] }] },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const reply = aiRes.data?.candidates?.[0]?.content?.parts?.[0]?.text || '❌ پاسخی دریافت نشد.';
    res.json({ reply });
  } catch (err) {
    console.error('AI API error:', err.response?.status, err.response?.data || err.message);
    res.status(500).json({ error: 'خطا در ارتباط با سرویس هوش‌مصنوعی.' });
  }
});

// سرو فایل استاتیک (فرانت)
app.use(express.static(clientPath, {
  extensions: ['html', 'css', 'js'],
  index: false,
}));

app.get('/', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

// پاسخ 404
app.use((req, res) => {
  res.status(404).send('404 - مسیر مورد نظر وجود ندارد.');
});

// Middleware مدیریت خطاهای ناشناخته روت‌ها
app.use((err, req, res, next) => {
  console.error('Unhandled route error:', err);
  res.status(500).json({ error: 'خطای سرور رخ داده است.' });
});

// مدیریت خطاهای سطح process (جلوگیری از کرش سرور)
process.on('uncaughtException', (err) => {
  console.error('Unhandled Exception:', err);
  // اینجا می‌تونی لاگ اضافی بزنی یا alert بدی
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// شروع سرور
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
