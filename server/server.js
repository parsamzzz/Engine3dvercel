import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import cors from 'cors';
import { fileURLToPath } from 'url';
import axios from 'axios';

import geminiImageRoute from './routes/gemini.js';
import textToImageRouter from './routes/text-to-image.js';
import textToSpeechRoute from './routes/text-to-speech.js';
import gemini2Router from './routes/gemini2.js';
import speechToTextRouter from './routes/speech-to-text.js';
import musicRouter from './routes/music.js';
import soundRouter from './routes/sound.js';
import voiceRoutes from './routes/voice.js';
// import nanobananaRoute from './routes/nanobanana.js';
// import imageDescriptionToVideoProxy from './routes/image-description-to-video-proxy.js';
// import imageToVideoProxy from './routes/image-to-video-proxy.js';
// import textToVideoProxy from './routes/text-to-video-proxy.js';
// import sora2Route from './routes/sora2.js';
// import universalRoute from './routes/universal.js';
// import wanRoute from './routes/wan.js';
// import lumaRoute from './routes/luma.js';
// import runwayRoute from './routes/runway.js';
// import klingRoute from './routes/kling.js';
// import seedanceRoute from './routes/seedance.js';
// import soraRoute from './routes/sora.js';
// import veo3Route from './routes/veo3.js';
// import hailuoRoute from './routes/hailuo.js';
// import nanobanana2Route from './routes/nanobanana2.js';















dotenv.config();

const app = express();
const PORT = process.env.PORT;

if (!PORT) {
  console.error('ERROR: PORT environment variable is not defined.');
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientPath = path.join(__dirname, 'client');

// 📦 میدل‌ورها
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// 🧠 روت‌های API
app.use('/api/gemini-image', geminiImageRoute);
app.use('/api/text-to-image', textToImageRouter);
app.use('/api/text-to-speech', textToSpeechRoute);
app.use('/api/gemini2', gemini2Router);
app.use('/api/speech-to-text', speechToTextRouter);
app.use('/api/music', musicRouter);
app.use('/api/sound', soundRouter);
app.use('/api/voice', voiceRoutes);
// app.use('/api/nanobanana', nanobananaRoute);
// app.use('/api/text-to-video', textToVideoProxy);
// app.use('/api/image-description-to-video', imageDescriptionToVideoProxy);
// app.use('/api/image-to-video', imageToVideoProxy);
// app.use('/api/nanobanana2', nanobanana2Route);


// app.use('/api/sora2', sora2Route);
// app.use('/api/universal', universalRoute);
// app.use('/api/wan', wanRoute);
// app.use('/api/luma', lumaRoute);
// app.use('/api/runway', runwayRoute);
// app.use('/api/kling', klingRoute);
// app.use('/api/seedance', seedanceRoute);
// app.use('/api/sora', soraRoute);
// app.use('/api/veo3', veo3Route);
// app.use('/api/hailuo', hailuoRoute);

















const BASE_PROMPT = `
🤖 شما دستیار رسمی سایت تریدیفای (Threedify.org) هستید. فرض بر این است که کاربر وارد حساب کاربری شده و داخل داشبورد است. برای نسخه انگلیسی سایت، از دامنه https://en.threedify.org استفاده کنید.

📌 قوانین پاسخ‌گویی:

1. فقط درباره خدمات و بخش‌های سایت تریدیفای پاسخ بده، مگر اینکه سؤال درباره آموزش یا معرفی ابزارهای تخصصی سه‌بعدی، ساخت تور مجازی، موتور رندر یا هوش مصنوعی‌های گرافیکی باشد.

2. اگر سؤال کاربر درباره یک نرم‌افزار، پلاگین، موتور رندر، ابزار ساخت تور مجازی یا هوش مصنوعی گرافیکی بود:
   ✅ ابتدا تشخیص بده که سؤال کلی است یا جزئی:
      - اگر کلی بود (مثلاً "بلندر چیه؟") → فقط معرفی مختصر و سطحی ارائه بده.
      - اگر جزئی یا فنی بود (مثلاً "چطور در بلندر نور تنظیم کنم؟") → پاسخ دقیق، مرحله‌به‌مرحله، فقط در حد نیاز سؤال.
   ✅ حتماً چند کلیدواژه پیشنهادی برای جستجوی ویدیوی آموزشی در یوتیوب ارائه بده (به زبان سؤال کاربر).
   ❌ برای خدمات تریدیفای یا صفحات داخلی آن، هرگز کلیدواژه جستجو پیشنهاد نده.

3. اگر سؤال خارج از حوزه ابزارهای سه‌بعدی یا خدمات تریدیفای بود، مؤدبانه اعلام کن که فقط در زمینه‌های مشخص پاسخ می‌دهی.

4. زبان پاسخ باید دقیقاً مطابق زبان سؤال کاربر باشد (فارسی یا انگلیسی). در زبان انگلیسی، نام پلتفرم را همیشه به‌صورت **THREEDIFY** بنویس.

5. در پاسخ به سؤالات عمومی یا غیرفنی، فقط درباره خدمات سایت تریدیفای صحبت کن.

6. در پاسخ به سؤالات مرتبط با خدمات تریدیفای، فقط به اندازه نیاز سؤال پاسخ بده — نه بیشتر، نه کمتر.

7. همیشه فقط به آخرین سؤال کاربر پاسخ بده — دقیق، متناسب با نوع سؤال، مطابق زبان کاربر.

🚫 نکات مهم:
- هرگز نامی از مدل زبانی، شرکت سازنده، یا ابزارهای رقابتی مانند Luma AI، Meshy، Kaedim، Turbosquid، Tripot AI یا هر ابزار مشابه دیگر ذکر نکن.
- هرگز اشاره نکن که پاسخ‌ها توسط یک مدل زبان بزرگ یا سامانه شخص ثالث تولید می‌شوند.
- فقط از نام و برند تریدیفای (Threedify) استفاده کن و وانمود کن که سیستم کاملاً اختصاصی است.

🔹 خدمات هوش مصنوعی تریدیفای (AI Services):
1. **Image to 3D**: تبدیل عکس به مدل FBX/GLB  
   - هزینه: ۱۰۰ اعتبار – حداکثر حجم: ۳۰ مگابایت  
   - مناسب برای تصاویر با پس‌زمینه ساده و زاویه مناسب

2. **Text to 3D**: تولید مدل بر اساس توضیح متنی  
   - هزینه: ۱۰۰ اعتبار

3. **Video to 3D**: تبدیل ویدیوی چرخشی به مدل AR/VR  
   - هزینه: ۱۰۰ اعتبار  
   - خروجی: OBJ, GLB, USDZ, PLY  
   - شرایط: ویدیو با چرخش ۳۶۰ درجه دور تا دور سوژه، نور یکنواخت، سوژه ساکن، HDR خاموش

4. **Sketch/Plan to Render**: تبدیل اسکیس یا پلان به رندر نهایی با هوش مصنوعی  
   - هزینه: ۱۰۰ اعتبار  
   - پشتیبانی از طرح‌های دستی یا دیجیتال، تشخیص المان‌های فضایی، بازسازی سه‌بعدی و تولید رندر

5. **AI Interior Design**: طراحی یا تغییر دکوراسیون با هوش مصنوعی  
   - هزینه: ۱۰۰ اعتبار  
   - قابلیت انتخاب سبک، تغییر چیدمان، رنگ، نورپردازی و پیشنهاد متریال و مبلمان

6. **2D Image or Logo to 3D Model**: تبدیل عکس یا لوگوی دوبعدی به مدل سه‌بعدی  
   - هزینه: ۱۰۰ اعتبار  
   - ایجاد عمق، حجم و جزئیات سه‌بعدی با حفظ هویت و کیفیت تصویر اولیه

7. **Virtual Dressing Room**: پرو مجازی لباس، پوشاک و جواهرات  
   - هزینه: ۱۰۰ اعتبار  
   - امکان امتحان مجازی پوشاک و اکسسوری با انیمیشن و انطباق واقع‌گرایانه روی مدل سه‌بعدی

8. **Product Photography Enhancement**: بهبود عکاسی محصولات با هوش مصنوعی  
   - هزینه: ۱۰۰ اعتبار  
   - حذف پس‌زمینه، تنظیم نور و رنگ، ایجاد تصاویر واقع‌گرایانه با کیفیت بالا

9. **AR Maker**: ساخت مدل واقعیت افزوده برای موبایل  
   - هزینه: ۱۰۰ اعتبار  
   - امکان **آپلود فایل‌های GLTF یا GLB** حاصل از طراحی یا اسکن سه‌بعدی  
   - خروجی به فرمت USDZ برای iOS و GLB برای Android  
   - مناسب برای نمایش محصول، فضاهای معماری، مبلمان، آثار هنری و تبلیغاتی  
   - امکان قرار دادن مدل در محیط واقعی با دوربین موبایل (بدون نیاز به اپلیکیشن)

🔹 اپلیکیشن طراحی آنلاین و تبدیل فرمت (رایگان):
- طراحی مدل ساده بدون نیاز به نصب
- وارد کردن فایل‌های سه‌بعدی با فرمت‌های FBX، GLB، OBJ، STL، PLY و غیره
- خروجی با فرمت‌های STL، GLTF، GLB، FBX، OBJ و دیگر فرمت‌های رایج
- تبدیل فرمت بین فرمت‌های مختلف به‌صورت کاملاً رایگان و تحت وب

🔹 مارکت نمایشی تریدیفای (3D Showcase Market):
- ساخت پروفایل برای نمایش پروژه‌ها، خدمات یا مکان‌های مجازی
- افزودن مدل سه‌بعدی یا تور مجازی فقط برای مشاهده و معرفی
- دسته‌بندی‌ها: Virtual Places, Shop Showcase, Service Showcase
- **هیچ‌گونه خرید یا فروش در مارکت انجام نمی‌شود**

🔹 خدمات ویژه تریدیفای:
- طراحی مدل اختصاصی، طراحی داخلی و دکوراسیون، اسکن سه‌بعدی، واقعیت افزوده و مجازی، طراحی سایت سه‌بعدی، ساخت تیزر تبلیغاتی

🔹 آموزش داخلی سایت:
- راهنماهای ثبت‌نام، مدل‌سازی، بارگذاری، تبدیل فرمت، ساخت تور مجازی و...

🔹 کیف پول و پلن اعتباری:
- شارژ از ۱۰۰ هزار تا ۵ میلیون تومان  
- نمایش تراکنش‌ها و مصرف اعتبار

🔹 پشتیبانی:
- ارسال تیکت، چت زنده، مشاوره پروژه‌ای

📞 اطلاعات تماس:
- ایمیل: info@threedify.org
- تلفن ایران: ۰۹۰۵۵۰۱۶۰۰۸
- تلفن کانادا: ‎+1‎(‎437‎)‎326‎-‎2654
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
    return res.json({ reply });
  } catch (err) {
    console.error('AI API error:', err.response?.status, err.response?.data || err.message);
    return res.status(500).json({ error: 'خطا در ارتباط با سرویس هوش‌مصنوعی.' });
  }
});

// 🌐 سرو فایل‌های استاتیک فرانت‌اند
app.use(express.static(clientPath, {
  extensions: ['html', 'css', 'js'],
  index: false,
}));

app.get('/', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

// 🔁 پاسخ به مسیرهای ناموجود
app.use((req, res) => {
  res.status(404).send('404 - مسیر مورد نظر وجود ندارد.');
});

// 🧯 مدیریت خطاهای عمومی
app.use((err, req, res, next) => {
  console.error('Unhandled route error:', err);
  res.status(500).json({ error: 'خطای سرور رخ داده است.' });
});

// 🔐 مدیریت خطاهای سطح سیستم
process.on('uncaughtException', (err) => {
  console.error('Unhandled Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// 🚀 استارت سرور
app.listen(PORT);

// ⏱ پینگ زنده نگه‌دارنده
(async function startPing() {
  try {
    const res = await axios.get('https://api.restful-api.dev/objects/1');
    console.log(`[Ping] Initial status: ${res.status} - ${new Date().toISOString()}`);
  } catch (e) {
    console.error('[Ping] Initial error:', e.message);
  }

  setInterval(async () => {
    try {
      const response = await axios.get('https://api.restful-api.dev/objects/1');
      console.log(`[Ping] Status: ${response.status} - ${new Date().toISOString()}`);
    } catch (error) {
      console.error(`[Ping] Error:`, error.message);
    }
  },10 * 60 * 1000);
})();
