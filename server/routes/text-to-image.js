import express from "express";
import { GoogleGenAI, Modality } from "@google/genai";

const router = express.Router();

// =====================
// 🔑 همه کلیدها
// =====================
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
const PRIVATE_KEY = "threedify_7Vg5NqXk29Lz3MwYcPfBTr84sD";

// وضعیت کلیدها و صف
const keyState = API_KEYS.map(() => ({ cooldownUntil: 0, inUse: false }));
let apiKeyIndex = 0;
const requestQueue = [];
let processingQueue = false;

// =====================
// 📌 انتخاب کلید سالم با لاگ
// =====================
function getNextAvailableKey() {
  const totalKeys = API_KEYS.length;
  for (let i = 0; i < totalKeys; i++) {
    const idx = (apiKeyIndex + i) % totalKeys;
    const state = keyState[idx];
    if (!state.inUse && Date.now() > state.cooldownUntil) {
      apiKeyIndex = (idx + 1) % totalKeys;
      state.inUse = true;
      console.info(`🗝️ کلید انتخاب شد: ${keyState[idx].key?.substring(0,10) || 'hidden'} (index: ${idx})`);
      return { key: API_KEYS[idx], idx };
    }
  }
  console.warn("⏳ هیچ کلید فعالی در دسترس نیست.");
  return null;
}

// =====================
// 📌 پردازش صف با لاگ
// =====================
async function processQueue() {
  if (processingQueue) return;
  processingQueue = true;

  console.info(`➡️ شروع پردازش صف، طول صف: ${requestQueue.length}`);

  while (requestQueue.length > 0) {
    const { req, res, next } = requestQueue.shift();
    try {
      await handleRequest(req, res, next);
    } catch (err) {
      next(err);
    }
  }

  processingQueue = false;
  console.info("✅ پردازش صف به اتمام رسید.");
}

// =====================
// 📌 پردازش درخواست با لاگ کامل
// =====================
async function handleRequest(req, res, next) {
  const { prompt } = req.body;
  console.info(`✉️ دریافت درخواست با prompt: "${prompt.substring(0,50)}..."`);

  const totalKeys = API_KEYS.length;
  let triedKeys = 0;

  while (triedKeys < totalKeys) {
    const keyData = getNextAvailableKey();
    if (!keyData) {
      console.info("⏳ منتظر آزاد شدن کلید...");
      await new Promise(r => setTimeout(r, 100));
      continue;
    }

    const { key, idx } = keyData;
    console.info(`🔑 استفاده از کلید index ${idx}`);

    try {
      const ai = new GoogleGenAI({ apiKey: key });
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: { responseModalities: [Modality.TEXT, Modality.IMAGE] }
      });

      const parts = response.candidates?.[0]?.content?.parts || [];
      const imagePart = parts.find(p => p.inlineData?.mimeType?.startsWith("image/"));

      keyState[idx].inUse = false;

      if (imagePart?.inlineData?.data) {
        console.info(`✅ متن یه عکس  با موفقیت تولید شد با کلید index ${idx}`);
        return res.json({ base64: imagePart.inlineData.data, mimeType: imagePart.inlineData.mimeType });
      } else {
        console.warn(`⚠️ درخواست پردازش شد اما تصویری تولید نشد. index ${idx}`);
        return res.status(200).json({ message: "درخواست پردازش شد، اما تصویری تولید نشد.", parts });
      }
    } catch (err) {
      keyState[idx].inUse = false;
      console.error(`❌ خطا در کلید index ${idx}:`, err.message);

      const status = err.response?.status || 0;

      if (status === 429 || err.message.includes("429")) {
        keyState[idx].cooldownUntil = Date.now() + 60 * 60 * 1000; 
        console.warn(`⏳ کلید index ${idx} در cooldown به مدت 1 ساعت قرار گرفت (429).`);
        triedKeys++;
        continue;
      }

      if (status === 403 || err.message.includes("403")) {
        keyState[idx].cooldownUntil = Date.now() + 24 * 60 * 60 * 1000;
        console.warn(`🚫 کلید index ${idx} غیرفعال شد (403). کلید بعدی امتحان می‌شود.`);
        triedKeys++;
        continue;
      }

      // هندل کردن خطای 400
      if (status === 400 || err.message.includes("400")) {
        console.warn(`⚠️ خطای 400 در کلید index ${idx}... کلید بعدی امتحان می‌شود.`);
        triedKeys++;
        continue;
      }

      // سایر خطاها => خروج از حلقه و next(err)
      return next(err);
    }
  }

  console.error("❌ هیچ‌کدام از کلیدها موفق نشد.");
  res.status(503).json({ error: "هیچ‌کدام از کلیدها موفق نشد." });
}


// =====================
// 📌 مسیر POST با صف
// =====================
router.post("/", (req, res, next) => {
  const clientKey = req.headers["x-api-key"];
  if (!clientKey || clientKey !== PRIVATE_KEY) {
    console.warn("⛔ دسترسی غیرمجاز");
    return res.status(403).json({ error: "⛔ دسترسی غیرمجاز." });
  }

  const { prompt } = req.body;
  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
    console.warn("⛔ prompt معتبر نیست");
    return res.status(400).json({ error: "⛔ prompt معتبر نیست." });
  }

  console.info(`📝 درخواست به صف اضافه شد. طول صف: ${requestQueue.length + 1}`);
  requestQueue.push({ req, res, next });
  processQueue();
});

// =====================
// مدیریت خطا
// =====================
router.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "خطای سرور." });
});

export default router;
