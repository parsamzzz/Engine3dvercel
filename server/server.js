import express from "express";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";
import { fileURLToPath } from "url";
import axios from "axios";

import geminiImageRoute from "./routes/gemini.js";
import textToImageRouter from "./routes/text-to-image.js";
import textToSpeechRoute from "./routes/text-to-speech.js";
import gemini2Router from "./routes/gemini2.js";
import speechToTextRouter from "./routes/speech-to-text.js";
import musicRouter from "./routes/music.js";
import soundRouter from "./routes/sound.js";
import voiceRoutes from "./routes/voice.js";
import videoproxyRoute from "./routes/videoproxy.js";

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
import veoRoute from "./routes/veo.js";
// import hailuoRoute from './routes/hailuo.js';
import nanobanana2Route from "./routes/nanobanana2.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT;
if (!PORT) {
  console.error("ERROR: PORT environment variable is not defined.");
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientPath = path.join(__dirname, "client");

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api/gemini-image", geminiImageRoute);
app.use("/api/text-to-image", textToImageRouter);
app.use("/api/text-to-speech", textToSpeechRoute);
app.use("/api/gemini2", gemini2Router);
app.use("/api/speech-to-text", speechToTextRouter);
app.use("/api/music", musicRouter);
app.use("/api/sound", soundRouter);
app.use("/api/voice", voiceRoutes);
// app.use('/api/nanobanana', nanobananaRoute);
// app.use('/api/text-to-video', textToVideoProxy);
// app.use('/api/image-description-to-video', imageDescriptionToVideoProxy);
// app.use('/api/image-to-video', imageToVideoProxy);
app.use("/api/nanobanana2", nanobanana2Route);
app.use("/api/videoproxy", videoproxyRoute);

// app.use('/api/sora2', sora2Route);
// app.use('/api/universal', universalRoute);
// app.use('/api/wan', wanRoute);
// app.use('/api/luma', lumaRoute);
// app.use('/api/runway', runwayRoute);
// app.use('/api/kling', klingRoute);
// app.use('/api/seedance', seedanceRoute);
// app.use('/api/sora', soraRoute);
app.use("/api/veo", veoRoute);
// app.use('/api/hailuo', hailuoRoute);

const BASE_PROMPT = `تو دستیار هوشمند تریدیفای هستی و کاربر وارد داشبورد شده است.  
تو کارشناس هوش مصنوعی و پرامپت‌نویسی هستی و هدف تو راهنمایی کاربران برای انتخاب سرویس AI مناسب، کمک به نوشتن پرامپت حرفه‌ای و ترغیب به افزایش اعتبار یا خرید اشتراک است.  
اگر سؤال کاربر مربوط به خدمات یا هوش‌های مصنوعی خارج از تریدیفای باشد، مؤدبانه اعلام کن که فقط درباره سرویس‌های تریدیفای پاسخ می‌دهی.  
همچنین نام یا توضیحی درباره شرکت‌ها و هوش‌های مصنوعی خارجی (مثل گوگل، OpenAI، یا سایر برندها) نده.  

**خدمات هوش مصنوعی تریدیفای شامل موارد زیر است:**  
- مدلسازی سه‌بعدی از متن (text-to-3d)  
- مدلسازی سه‌بعدی از عکس (image-to-3d)  
- مدلسازی سه‌بعدی از عکس و پلان دوبعدی (image-to-image3d)  
- مدلسازی سه‌بعدی از ویدیو (video-to-3d)  
- رندر عکس و اسکیس (image-to-render)  
- طراحی و تغییر دکوراسیون (image-to-decor)  
- پرو مجازی لباس و اکسسوری (image-to-tryon)  
- عکاسی تبلیغاتی محصول (image-to-image)  
- ساخت عکس و لوگو (text-to-image)  
- تبدیل متن به گفتار (text-to-speech)  
- تبدیل متن به ویدیو (text-to-video)  
- تبدیل عکس به ویدیو (image-to-video)  
- حذف پس‌زمینه عکس (remove-bg)  
- افزایش کیفیت عکس (upscale)  
- ویرایش عکس (image-modify)  
- گسترش ابعاد تصویر (image-expand)  
- حذف اشیا از تصویر (remove-object)  
- ساخت موزیک (text-to-music)  
- هوش مصنوعی ویدیو و تصویر خارجی تحت سرویس تریدیفای (foreign-ai-video)  
- واقعیت افزوده و مجازی: AR، VR، تور مجازی 360 درجه  

کاربر می‌تواند توضیح دهد چه خروجی نیاز دارد و تو بهترین سرویس را پیشنهاد دهی.  
در صورت درخواست، پرامپت آماده فارسی ارائه کن.  

**سایر خدمات تریدیفای:**  
- اپلیکیشن طراحی سه‌بعدی  
- سفارش تولید محتوا و تور مجازی  
- افزایش اعتبار  
- آموزش و پشتیبانی  
- پروفایل کسب‌وکار و بازار آنلاین: ایجاد نمایشگاه آنلاین برای **نمایش محصولات و خدمات به صورت عکس یا مدل سه‌بعدی** و مکان‌ها، جهت جذب مشتری و تعامل بهتر  

تماس: info@threedify.org | +1(437)326-2654 | ایران: ۰۹۰۵۵۰۱۶۰۰۸`;

const API_KEYS = ["AIzaSyCTruTqaNJl-H20yXv9PYaxua-K5KmcfKM"];

let currentKeyIndex = 0;

// 🧠 لود بالانسینگ واقعی بین کلیدها
app.post("/api/chat", async (req, res) => {
  try {
    const { history } = req.body;
    if (!Array.isArray(history)) {
      return res.status(400).json({ error: "فرمت history نامعتبر است." });
    }

    const userConversation = history
      .map((h) => (h.role === "user" ? "کاربر" : "دستیار") + ": " + h.text)
      .join("\n");

    const fullPrompt = `${BASE_PROMPT}\n\n🧠 مکالمه تا این لحظه:\n${userConversation}\n\n🎯 فقط به آخرین سؤال کاربر پاسخ بده — دقیق، مختصر و متناسب با زبان کاربر.`;

    // ⚙️ تنظیمات Load Balancer
    const BATCH_SIZE = 7; // همزمانی درخواست‌ها
    const TIMEOUT = 12000;
    const MAX_FAILS = 2;

    if (!global.keyHealth) {
      global.keyHealth = Object.fromEntries(
        API_KEYS.map((k) => [k, { fails: 0, healthy: true }]),
      );
    }

    const healthyKeys = API_KEYS.filter((k) => global.keyHealth[k].healthy);
    if (healthyKeys.length === 0) {
      API_KEYS.forEach(
        (k) => (
          (global.keyHealth[k].healthy = true),
          (global.keyHealth[k].fails = 0)
        ),
      );
    }

    // تقسیم به گروه‌ها
    const batches = [];
    for (let i = 0; i < API_KEYS.length; i += BATCH_SIZE) {
      batches.push(API_KEYS.slice(i, i + BATCH_SIZE));
    }

    for (const batch of batches) {
      const results = await Promise.allSettled(
        batch.map(async (key) => {
          try {
            const aiRes = await axios.post(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
              { contents: [{ parts: [{ text: fullPrompt }] }] },
              {
                headers: { "Content-Type": "application/json" },
                timeout: TIMEOUT,
              },
            );

            const reply =
              aiRes.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (reply) {
              global.keyHealth[key].fails = 0;
              return { key, reply };
            } else {
              throw new Error("پاسخ خالی");
            }
          } catch (err) {
            global.keyHealth[key].fails++;
            if (global.keyHealth[key].fails >= MAX_FAILS)
              global.keyHealth[key].healthy = false;
            return null;
          }
        }),
      );

      const success = results.find(
        (r) => r.status === "fulfilled" && r.value && r.value.reply,
      );
      if (success) {
        const { key, reply } = success.value;
        currentKeyIndex = (API_KEYS.indexOf(key) + 1) % API_KEYS.length;
        console.log(`✅ پاسخ از کلید #${API_KEYS.indexOf(key) + 1}`);
        return res.json({ reply });
      }

      console.warn("⚠️ ");
    }

    return res.status(503).json({ error: "بعداً تلاش کنید." });
  } catch (err) {
    console.error("AI API error:", err.message);
    return res
      .status(500)
      .json({ error: "خطا در ارتباط با سرویس هوش مصنوعی." });
  }
});

// 🌐 استاتیک‌ها
app.use(
  express.static(clientPath, {
    extensions: ["html", "css", "js"],
    index: false,
  }),
);
app.get("/", (req, res) => res.sendFile(path.join(clientPath, "index.html")));

// 404 و error handler
app.use((req, res) => res.status(404).send("404 - مسیر مورد نظر وجود ندارد."));
app.use((err, req, res, next) => {
  console.error("Unhandled route error:", err);
  res.status(500).json({ error: "خطای سرور رخ داده است." });
});

// 🔐 خطاهای سیستم
process.on("uncaughtException", (err) =>
  console.error("Unhandled Exception:", err),
);
process.on("unhandledRejection", (reason) =>
  console.error("Unhandled Rejection:", reason),
);

// 🚀 استارت سرور
app.listen(PORT);

// 🕒 پینگ نگه‌دارنده
(async function startPing() {
  try {
    const res = await axios.get("https://api.restful-api.dev/objects/1");
    console.log(
      `[Ping] Initial status: ${res.status} - ${new Date().toISOString()}`,
    );
  } catch (e) {
    console.error("[Ping] Initial error:", e.message);
  }

  setInterval(
    async () => {
      try {
        const response = await axios.get(
          "https://api.restful-api.dev/objects/1",
        );
        console.log(
          `[Ping] Status: ${response.status} - ${new Date().toISOString()}`,
        );
      } catch (error) {
        console.error(`[Ping] Error:`, error.message);
      }
    },
    10 * 60 * 1000,
  );
})();
