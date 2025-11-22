import express from 'express';
import { GoogleGenAI, Modality } from '@google/genai';

const router = express.Router();

const API_KEYS = [
  "AIzaSyBONg3Ahiq7ff8dCo7RklYa66_ho-MPu04",
  "AIzaSyAHui5kphP_JRqkGWSC02Lz2hQZAmSXeAk",
  "AIzaSyAP4XaQhZAvG5oK3UpWgP1vN5ZuXYueAhU",
  "AIzaSyDcrViDE0SvAiNqExY2jwDzNxOgCzbS2jk",
"AIzaSyBJ-rrCisLSfP9U3EK-2dEixyjCv3UTTxw",
"AIzaSyCtfBELkVgqRolJ3k11jBNe3dgS-m7IiWc",
"AIzaSyBDIceyx9r2m2xVvYCNMw_PXc2saIqrJBY",
"AIzaSyAkQkN1i333AB6NxyKWpdjcxLgpX_--TaM",
"AIzaSyDMAzjK2QpzTzJUiwXPHa8KDmVMuuOZZNU",
"AIzaSyDqNjHO0s4FyUMSx3EyWLK0OQFgBvdQzjQ",
"AIzaSyDea0i2iqu2pm2pmLtWN7DFwmwXaelecPg",
"AIzaSyACiwfsPDcDIhumEjMJhP4rEmHL_rREbFM",
"AIzaSyBZpRBwmX70A_q_g680975uBNYD0ascv7g",
"AIzaSyDlWet1YLKUKTyhzIhf-ehOo4QUN5Dao2c",
"AIzaSyAw-Um55X0N3pgdBJdmddRUh-DSuDY1LSM",
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
  "AIzaSyAa2VsTjm9uMcmKGZUX-mc0-Fv8fN1NZEw",
"AIzaSyD3FDM4JsNV9HXSEBdszKBFD7I_Q2i0tRY",
"AIzaSyAh0WeiUzWW5ebS7l4ZsdU177AaZ5CFHac",
"AIzaSyAh0WeiUzWW5ebS7l4ZsdU177AaZ5CFHac",
"AIzaSyBIAaNrM1Vnh0vjUHdkkUxPB6zLZcTaYno",
"AIzaSyDLEuUDjr0QVEVa2N6EAwzVK5pWjAuz5vI",
"AIzaSyBc5YEP53Qi8veNWiHPa_cgBYzVFfq8DOY",
"AIzaSyDKynBrgXS7I58GgDlHReUywjvUcf3a9Rw",
"AIzaSyDlTNWfL1qCBBqVe-BwjcIWiv2Qgs2qwhM",
"AIzaSyAFPBMAKpVhtj-rzIcB0fW5JAIWiglZ2-g",
"AIzaSyCUsZcgS7sZvbZ1xB_lxPAN6f5kF2Vzs58",
"AIzaSyBSDNVwU2Tap8cHrZEwAPJxNtgQDFdmv00",
"AIzaSyAJ5g--1llSCdhqL4sRshpZSvbx8Ulqxbc",
"AIzaSyDSqbWsNiVGITxg2zmjdMvCdLNSRWPxXNs",
"AIzaSyCMU-Y9KaN_L2xjao2GogKQhCp6HG6jNck",
"AIzaSyApY8n2n_5UXr2cYfkDWyxcKf7wsZcDQFg",
"AIzaSyDKan26KjFC2Ykbq7XQPHxq6fM8XBRx0jg",
"AIzaSyDTTxtK_StFV0Ly06qEWL6CQK3CQhxFVJ0",
"AIzaSyDaeHwoBJX40RxH7TYPWyHgEKfjABKiRiw",
"AIzaSyCPOgWUayXQsd8PsAjaX7yPu8ZtdAtmSL8",
"AIzaSyAM5WAup8_PzYi5e5ZMMIDB6TP20hpm_HI",
"AIzaSyCDe8z-0UdTlpjhKFANAZcwNpdtn1u4tBc",
"AIzaSyCjGBHPMykeAcrB7Tmg_04CeT8xNla6fn8",
"AIzaSyDqxK3FOfmGqBbOq0UKwzqNZ1w99qfLVhc",
"AIzaSyCrt9DMd48G7atXU3dtqgmlBUr_j2o-mm4",
"AIzaSyCtesTkM0AaQpT6uhnYEV4L20tzz5GXbF0",
"AIzaSyCaR6NqOp8KyEd4nbtJRyAYRJI-1miKKn0",
"AIzaSyD7HjgaHq--XYnCVBA7veUmUDyuZcnsmZ0",
"AIzaSyBOeQjN7XNPreX4PU59zW6L4A-l1aHomRI",
"AIzaSyB4dPLQlZ43dn47N8ukxuMb7X8Y5e9_lUM",
"AIzaSyDlpNwYqxTOpmZJlLcpEJ17ltAaMRNeUiA",
"AIzaSyDmASwFNvTsDcxnwRZ5uFPjKp-UVbRtIFc",
"AIzaSyALC3P-uLiBsuJX7QLoCFaAyLQ8fdypSxA",
"AIzaSyCTEF4kRLdy4vl6nDg4H92i4_AOwuTPzJs",
"AIzaSyDLSNKGOfQca4sZLoFXBiq7gdNBXasZyWI",
"AIzaSyDyYOlxdQsfbP8XzHWalKLzoK2rlzPT7wI",
"AIzaSyBvMmUlpwukk2FJjadKuwHmaNoxsQXBkz0",
"AIzaSyCcd8lq1VOSD5msbEwXacAvLO7aenG9FNM",
"AIzaSyDVPsPb9OxEMqWNglQRG6OvOR9Vjxg2rsU",
"AIzaSyBeLyUhxmzwmO3egO2pkFmTP6OX-Mc0HPc",
"AIzaSyDTcqrRPj09ijPc8kuYCYsh3fwZ83P5TlQ",
"AIzaSyAirf_0VWj4Ni1-CgZc3maroNnyqB6l8IM",
"AIzaSyAgc6EFISZsk0-7eiwv4PirkLuzzIq_rYw",
"AIzaSyCtH0uMZ8R7G1zcYSYCNpu8Gm9RfH-qNVw",
"AIzaSyCrXyczr1UNNd7mV2WsN6lel4d7l5RxPcc",
"AIzaSyAboUjY82fCZQ3EUe5Lv_4_LQslQ6xYhOE",
"AIzaSyCVOsOz3fZg_7ybIj2UTDQsHkkN0xb4YDQ",
"AIzaSyCOI4i9oJjwG6zTPPYQkyULT2awKcwsf6c",
"AIzaSyDzD5Q3VdRn5VKMGmPFIUlVuVxtqwGqjgI",
"AIzaSyDkclFcHMgiVsyzBX7r-j__pggIn4NLpVQ",
"AIzaSyBBz_xwOvHlQzcyMaaDBdAODkTQM_g9AG0",
"AIzaSyANSmiWpRQ6itu-BrY2KHgoRKfRY7k-HeA",
"AIzaSyDFbQIMoaYItZy71BzK7kJ24iKCsr8AG4w",
"AIzaSyCxXKT7Kpvfs4prmuvWjZouLxH_9sw5s94",
"AIzaSyAOkrlR3gz23_0EDQVWx9NuYFjLzCFqsRU",
"AIzaSyB6sJRBFH9dQ7zu2YsUMEGabZgsXVdB11A",
"AIzaSyD6wjGfCW4Gpl2gZjlPtVgTHAI7vBY4rkA",
"AIzaSyDcB2-rYfWZURq44OPjv_oaBOs2iy_Pqis",
"AIzaSyC-VyowbBUI9dkh4f2XpMzKOjKFfEv0tZw",
"AIzaSyCCxe4O8X53Eknxo7LEWAbv59XJT9Q1lqA",
"AIzaSyAew4lyayOhOouOyeOutYG-a0zj0I1rpX0",
"AIzaSyCelRFa6xk-jrIHszpMZVAXaNzEHY-iSIM",
"AIzaSyBLKy0H10L15WKEjJeghqm57BdKQg9dcso",
"AIzaSyAJgmvlx-4rXUPtJsBl1Xk0ApxkW0TXYXg",
"AIzaSyAsLO0mKFJtC6ewNc4fpM0OYhp_MkyxEsE",
"AIzaSyAsLO0mKFJtC6ewNc4fpM0OYhp_MkyxEsE",
"AIzaSyDpG-gjNelVan_F7K2XkRrMku6KN9-NBy0",
"AIzaSyAA05bPIY3XXTsQQEmZu7SAN5_bwTMLiJ8",
"AIzaSyCTHb-iIgjh8QvTcwtHswMUT3jDJD01j_k",
"AIzaSyChOLQ7cKOBwGhnQ_9vL-hwCJealrOqD30",
"AIzaSyAk7YdNh554psa8505bMVqj313FyvI4Zgs",
"AIzaSyBWwliP_sx27z8pOBSXhBv1tf49r7Y-bQI",
"AIzaSyA7u748I03ksTzAoZBw5J5t29eOa4RGRXM",
"AIzaSyAqMg1fD6mlBylWy9zNF6qafzlswSoQwJQ",
"AIzaSyDJFxYntCLw5veGdICf9BDme6XZYgTQDP4",
"AIzaSyBtOM5TLy8S2hZDhe4Y5EN-Z04UMFjKcZ4",
"AIzaSyDd5KSnEb6ui9RGSzpa8dYIfWSelAd8i60",
"AIzaSyAaGwoCfSAxRN1l-GdRwXTp6sDFsmTYtCw",
"AIzaSyAovrIny1l99QMMkaW-CHgNJsJhbpiJ_po",
"AIzaSyA2SmkshLJnqUXc_nCsYxP0NsdBbKPlTRg",
"AIzaSyDGbn4QYo-9KOsX3PGa_1IlKVRrlJbVimo",
"AIzaSyDNCEIcyMooJ4SfvJ6ZCgISNV2sOLmLihI",
"AIzaSyCAH_NqLEWbF_zJCHZqPguOkmNGuRHILmA",
"AIzaSyDy1n07NT5Fph_OVdtgyeXgnjXtSzok3g4",
"AIzaSyBKd0wSNXzbeUB0NmREnPRzVLWc70ujOCM",
"AIzaSyDWRvK6tvPeuZHAUmeizhQqAil4Uuagf-I",
"AIzaSyCXunul1U9oPjO-UxmYc3yi2CUGVFqgt0A",
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
"AIzaSyBU-J_wY5irpDFNcQaPEa0HgoZGgCTgN1Q",
"AIzaSyAIzpDn6uC3kkZPFyXa8JXICdTGPelc1Jg"

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
