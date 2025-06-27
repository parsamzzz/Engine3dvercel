import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import axios from 'axios';
import cors from 'cors';
import { fileURLToPath } from 'url';
import geminiImageRoute from './gemini.js'; // ✅ مسیر جداگانه برای ارسال عکس

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientPath = path.join(__dirname, '../client');

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
   - هزینه: ۱۲۰ اعتبار – حداکثر حجم: ۳۰ مگابایت  
   - مناسب برای تصاویر با پس‌زمینه ساده و زاویه مناسب

2. **Text to 3D**: تولید مدل بر اساس توضیح متنی  
   - هزینه: ۱۰۰ اعتبار

3. **Video to 3D**: تبدیل ویدیوی چرخشی به مدل AR/VR  
   - هزینه: ۳۰۰ اعتبار  
   - خروجی: OBJ, GLB, USDZ, PLY  
   - شرایط: ویدیو با چرخش ۳۶۰ درجه دور تا دور سوژه، نور یکنواخت، سوژه ساکن، HDR خاموش

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
- تلفن کانادا: +1(437)326-2654
`;

app.use(cors());
app.use(express.json());


app.use('/api/gemini-image', geminiImageRoute);

// 🧠 پاسخ به چت
app.post('/api/chat', async (req, res) => {
  const { history } = req.body;

  if (!Array.isArray(history)) {
    return res.status(400).json({ error: 'فرمت history نامعتبر است.' });
  }

  const userConversation = history
    .map(h => (h.role === 'user' ? 'کاربر' : 'دستیار') + ': ' + h.text)
    .join('\n');

  const fullPrompt = `${BASE_PROMPT}\n\n🧠 مکالمه تا این لحظه:\n${userConversation}\n\n🎯 فقط به آخرین سؤال کاربر پاسخ بده — متناسب با عمق و نوع سؤال، دقیق، نه بیشتر و نه کمتر، با رعایت زبان کاربر.`;

  try {
    const aiRes = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.API_KEY}`,
      { contents: [{ parts: [{ text: fullPrompt }] }] }
    );

    const reply = aiRes.data?.candidates?.[0]?.content?.parts?.[0]?.text || '❌ پاسخی دریافت نشد.';
    res.json({ reply });
  } catch (err) {
    console.error('AI API error:', err.response?.status, err.response?.data || err.message);
    res.status(500).json({ error: 'خطا در ارتباط با سرویس هوش‌مصنوعی.' });
  }
});

// صفحه اصلی و استاتیک کلاینت
app.get('/', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

app.use(express.static(clientPath, {
  extensions: ['html', 'css', 'js'],
  index: false,
}));

// هندل 404
app.use((req, res) => {
  res.status(404).send('404 - مسیر مورد نظر وجود ندارد.');
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
