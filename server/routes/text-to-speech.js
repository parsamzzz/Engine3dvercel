import express from 'express';
import { GoogleGenAI, Modality } from '@google/genai';

const router = express.Router();

const API_KEYS = [
  "AIzaSyBxPhDszuDkjVnr50XM9uTwDzp7FET2RrE",
  "AIzaSyDV2raljo0hG-SmwzYU_8VsvNZPIVq5jYs",
"AIzaSyDRlDTV8m70Z4Xi8kdH3d7-SqwO5DpjIvc",
"AIzaSyAPDPoJnwSiMWmI4k1bXkAcW-NY4gpQ2ss",
"AIzaSyB6A8aW6Q5bj-jtylwgB7_MDAMttABG7A0",
  "AIzaSyDlA9tgjJtVQX7FnPsnQH39ZThH5fNk5fg",
 "AIzaSyCq2uHV2RqEsXVlBBuII8tF9O35m-gF304",
  "AIzaSyAs8TIThsAQm5VnqU3p64V2Ia5c0Gr0bxY",
  "AIzaSyDaxiX9-bQR31SsriRVIRv9Ar1UzbENsFg",
  "AIzaSyCqPw7pUY9HVTGwLXJsCMc0b3nmmBagh5Y",
  "AIzaSyBsk8mjm_qfRCchjsxf9-mroylLzuW_uj0",
  "AIzaSyCll9epZcrWhEdwCXI6NXSyv_7YsUq0vNY",
  "AIzaSyCRfZ6Z_6xDek7yeB0joAe9Z4SUyXb44Ic",
  "AIzaSyAhtxKcaCYgd75upteTKy6gk9X6XF1Zq2A",
  "AIzaSyBBLC8ObmnPufQllz-GEB422b5tbnaMSi0",
  "AIzaSyDGQfUmDfAg0f3c_gupkD4oX0bvLFGxqt4",
  "AIzaSyBC6FvJXp_401hs7GKQU4N53J47xEFZABI",
  "AIzaSyBqKjF5kBVSrdAnqEPemYzIAUjxeF1C8ww",
  "AIzaSyBRaDzYy3ivS_wWD45PQYcPCGwhESle64I",
  "AIzaSyB8Jypz5MaY7hbrZr_T1KG2l02xmTZKAio",
  "AIzaSyDR9Tk3f1oQGgwCdNQvX2LscDFsukCJbyY",
  "AIzaSyAM6ZzH-ngfxY1wKTnoHVMyD2kYOHLd1i4",
  "AIzaSyCMmOaJFfHY2PnvNe2jAJ8gLb8ToFQxUMc",
  "AIzaSyC2Z4aD2ZSlpHem3BzA5u7GX8nM-Py5abw",
  "AIzaSyAkjVmUTeXK0Jnvg4sm6xOZZu6l2z9cEEw",
  "AIzaSyBZ_2Zu7xS4_4o2nOWmgTgrYWb6uwl_jDI",
  "AIzaSyDubsjj_oEy1qmF6_9GzuBkEjQuuANkG5M",
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
  "AIzaSyALL4vcUd3Kgk17OCNTt75H5VErcwvDxUc",
  "AIzaSyAtegVVBwMLCH1lgpYaXpV4xevbhZFpy94",
  "AIzaSyC1YjFwfMWgRkhG9n3R5ZKoYssPslVjCHI",
  "AIzaSyDYNLJ9rCPZkunXVlMX-Id2cN89dTWPvhM",
  "AIzaSyB1Knssvf8xyImnoqyX2TSj0oVft9lqriU",
  "AIzaSyDsJ_zyRwzjvhn1hDbTnTHk3yPqDOHGVjY",
  "AIzaSyA2c5kKBlEla9AjDRXYkoakzR0QCvAhZnQ",
  "AIzaSyDsuifBsjH9_D74w1yxVwi_jYqVtL7RClU",
  "AIzaSyCVDR3-fPGJ0FlzbrcuXFGH9IIWBpwZndE",
  "AIzaSyCy54Aij_7FQullxvbGlHb_JspAdkQCvGs",
  "AIzaSyCTvLkv3OLTNrs2oM3aLojfcH-OqxGpoLU",
  "AIzaSyAjQCP-lHUKrkg4Z1cBMebBkFi1Mxu0s4U",
  "AIzaSyBIfBLGxjPfrA4jW-lA4N6O5O2w6Gdo-1A",
  "AIzaSyCrgk9uOoM1pFav50NA4DEDvVWrt4mTjZw",
  "AIzaSyBAmw3lUQp9U7FW0e9F-9APtIBDIhOqTtM",
  "AIzaSyCktjDvAZ6W7rgjMGp4BkivNgpbuWBJeko",
"AIzaSyBqoiXFXFZ-yDz3lMROHNo9y_vGNYOl344",
"AIzaSyCWFpYQH1he-YtloLrlIdQy_QYDRuqGGJA",
"AIzaSyDB23RIMVS3VkE9C-aNEqvmHtXLyeSP87o",
"AIzaSyBDmos0BxSC3iROGUTJlaAsxb8JhOu4Ys4",
"AIzaSyATjzlYfN4JV1K1qGqxzEm1PqrEJZZ1PdA",
"AIzaSyCt21m4aPc17ARvRarWark85uVgtAmoXIg",
"AIzaSyAcILVh0F8Zf-kKlxChnhA7mLDObbp8J-c",
"AIzaSyDkybJu2ASfyo6VyBxj5vut95L1ARGiuvE",
"AIzaSyB_ynVyZg-Cr6gFY5LMsFdTFxaJB8BjskU",
"AIzaSyBCgOXpm8vw3fiBMzynq27CqNPQM7EcMjM",
"AIzaSyDbuhr5Rk3gcZbAmL6Zx8XtDzQcvz4s_Bo",
"AIzaSyBsPPKOgJrNzFGxibAwJ3-9lPWmmoUdPhI",
"AIzaSyDOFQVMASy1Wa8Ry-Thp_5EJcABAbyYvX4",
"AIzaSyAWiai4djhQfUVBDRal3GSFDOonfE19zw0",
"AIzaSyCEDSxJlsxTSfgTQbnCMjMPpJosyqRseDk",

];

// =====================
// 🛡 کلید خصوصی کلاینت
// =====================
const PRIVATE_KEY = 'threedify_7Vg5NqXk29Lz3MwYcPfBTr84sD';

// وضعیت کلیدها
const keyState = API_KEYS.map(() => ({ inUse: false }));
let apiKeyIndex = 0;

// صف درخواست‌ها
const requestQueue = [];
let processingQueue = false;

// =====================
// 📌 پردازش صف
// =====================
async function processQueue() {
  if (processingQueue) return;
  processingQueue = true;

  while (requestQueue.length > 0) {
    const { req, res, next } = requestQueue.shift();
    console.log(`📥 پردازش درخواست جدید - IP: ${req.ip}, body:`, req.body);
    try {
      await handleRequest(req, res, next);
    } catch (err) {
      next(err);
    }
  }

  processingQueue = false;
}

// =====================
// 📌 تابع اصلی درخواست
// =====================
async function handleRequest(req, res, next) {
  const { text, multiSpeaker, voiceName } = req.body;
  const totalKeys = API_KEYS.length;
  let fullPassCount = 0; // ✅ شمارنده‌ی تعداد دفعاتی که کل کلیدها چک شدند

  while (fullPassCount < 3) { // ✅ فقط تا ۳ بار مجاز به چرخیدن کل کلیدها هستیم
    // همه کلیدها آزاد هستند
    keyState.forEach(k => k.inUse = false);

    for (let i = 0; i < totalKeys; i++) {
      const idx = apiKeyIndex % totalKeys;
      apiKeyIndex = (apiKeyIndex + 1) % totalKeys;

      const key = API_KEYS[idx];
      keyState[idx].inUse = true;
      console.log(`🔑 کلید انتخاب شد: ${idx} - ${key.substring(0, 10)}...`);

      try {
        // تنظیمات صوت
        let speechConfig = {};
        if (multiSpeaker && Array.isArray(multiSpeaker) && multiSpeaker.length > 0) {
          speechConfig = {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: multiSpeaker.map(({ speaker, voiceName }) => ({
                speaker,
                voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' } }
              }))
            }
          };
        } else {
          speechConfig = { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' } } };
        }

        const ai = new GoogleGenAI({ apiKey: key });
        console.log(`🚀 ارسال درخواست به Gemini با کلید شماره ${idx}`);
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-preview-tts',
          contents: [{ parts: [{ text }] }],
          config: { responseModalities: [Modality.AUDIO], speechConfig }
        });

        const parts = response.candidates?.[0]?.content?.parts || [];
        const audioPart = parts.find(part => part.inlineData?.mimeType?.startsWith('audio/'));
        keyState[idx].inUse = false;

        if (audioPart?.inlineData?.data) {
          console.log(`✅ موفقیت: صوت تولید شد با کلید شماره ${idx}`);
          return res.json({ base64: audioPart.inlineData.data, mimeType: audioPart.inlineData.mimeType });
        } else {
          console.warn(`⚠️ صوتی تولید نشد با کلید شماره ${idx}، تلاش با کلید بعدی...`);
          continue;
        }

      } catch (err) {
        keyState[idx].inUse = false;
        console.error(`❌ خطا با کلید شماره ${idx}:`, err.message);
        continue; // ادامه با کلید بعدی
      }
    }

    fullPassCount++; // ✅ بعد از چرخیدن کامل همه کلیدها
    console.log(`🔁 پاس ${fullPassCount} از ${3} تمام شد.`);
  }

  // اگر بعد از ۳ بار همه کلیدها خطا داشتند:
  console.error('🚫 هیچ کلیدی پس از ۳ بار چرخش پاسخ نداد.');
  return res.status(500).json({ error: 'همه کلیدها در حال حاضر غیرفعال هستند. لطفاً بعداً دوباره تلاش کنید.' });
}


// =====================
// 📌 مسیر POST
// =====================
router.post('/', (req, res, next) => {
  const clientKey = req.headers['x-api-key'];
  console.log(`📩 درخواست POST دریافت شد - IP: ${req.ip}, x-api-key: ${clientKey ? '✔️ موجود' : '❌ ندارد'}`);

  if (!clientKey || clientKey !== PRIVATE_KEY) {
    console.warn('⚠️ کلید خصوصی معتبر نیست.');
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const { text } = req.body;
  if (!text || typeof text !== 'string' || text.trim() === '') {
    console.warn('⚠️ متن نامعتبر است.');
    return res.status(400).json({ error: 'text معتبر نیست.' });
  }

  requestQueue.push({ req, res, next });
  processQueue();
});

// =====================
// 📌 هندل خطاهای عمومی
// =====================
router.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err);
  res.status(500).json({ error: 'خطای سرور.' });
});

export default router;
