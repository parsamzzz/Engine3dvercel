// import express from "express";
// import axios from "axios";
// import multer from "multer";
// import FormData from "form-data";

// const router = express.Router();

// // 🟢 لیست کلیدها برای چرخش
// const API_KEYS = ["dbd18fd3191266b86bbf18adb81d67d4"];

// // 🟢 تابع انتخاب کلید بعدی
// let currentKeyIndex = 0;
// function getCurrentKey() {
//   return API_KEYS[currentKeyIndex];
// }
// function rotateKey() {
//   currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
//   console.warn("🔑 کلید بعدی انتخاب شد:", getCurrentKey());
// }

// // 📌 ثابت‌ها
// const KIE_CREATE_URL = "https://api.kie.ai/api/v1/jobs/createTask";
// const KIE_QUERY_URL = "https://api.kie.ai/api/v1/jobs/recordInfo";
// const KIE_UPLOAD_URL = "https://kieai.redpandaai.co/api/file-stream-upload";

// // ⚙️ multer: تنظیم حافظه برای آپلود
// const upload = multer({ storage: multer.memoryStorage() });

// /* ===================================================
//    🔄 تابع عمومی برای فراخوانی API با مدیریت خطای اعتبار
// =================================================== */
// async function callKieAPI(url, method = "post", data = null, headers = {}) {
//   let tried = 0;
//   const maxTries = API_KEYS.length;

//   while (tried < maxTries) {
//     const apiKey = getCurrentKey();
//     try {
//       const resp = await axios({
//         url,
//         method,
//         data,
//         headers: { Authorization: `Bearer ${apiKey}`, ...headers },
//       });
//       return { resp, apiKey }; // موفق
//     } catch (err) {
//       const errData = err.response?.data;
//       if (errData?.error?.includes("INSUFFICIENT_CREDIT")) {
//         console.warn(`❌ اعتبار ناکافی برای کلید ${apiKey}`);
//         rotateKey(); // کلید بعدی
//         tried++;
//       } else {
//         throw err; // خطای دیگر
//       }
//     }
//   }
//   throw new Error("❌ تمام کلیدها اعتبار ندارند.");
// }

// /* ===================================================
//    1) 🟢 Generate Image
// =================================================== */
// router.post("/nano-banana", async (req, res) => {
//   console.log("🟢 [Generate] درخواست جدید دریافت شد:", req.body);
//   const { prompt, output_format = "png", image_size = "auto" } = req.body;

//   if (!prompt)
//     return res.status(400).json({ error: "❌ فیلد prompt الزامی است." });

//   try {
//     const { resp, apiKey } = await callKieAPI(KIE_CREATE_URL, "post", {
//       model: "google/nano-banana",
//       input: { prompt, output_format, image_size },
//     });

//     console.info(`✅ Generate با کلید ${apiKey}`);
//     res.status(resp.status).json(resp.data);
//   } catch (err) {
//     console.error("Nano-Banana error:", err.response?.data || err.message);
//     res.status(err.response?.status || 500).json({
//       error: err.response?.data || err.message,
//     });
//   }
// });

// /* ===================================================
//    2) ✏️ Edit Image
// =================================================== */
// router.post("/nano-banana-edit", async (req, res) => {
//   console.log("🟢 [Edit] درخواست جدید دریافت شد:", req.body);
//   const {
//     prompt,
//     image_urls = [],
//     output_format = "png",
//     image_size = "auto",
//   } = req.body;
//   if (!prompt || image_urls.length === 0)
//     return res.status(400).json({
//       error: "❌ فیلدهای prompt و image_urls الزامی هستند.",
//     });

//   try {
//     const { resp, apiKey } = await callKieAPI(KIE_CREATE_URL, "post", {
//       model: "google/nano-banana-edit",
//       input: { prompt, image_urls, output_format, image_size },
//     });

//     console.info(`✅ Edit با کلید ${apiKey}`);
//     res.status(resp.status).json(resp.data);
//   } catch (err) {
//     console.error("Nano-Banana-Edit error:", err.response?.data || err.message);
//     res.status(err.response?.status || 500).json({
//       error: err.response?.data || err.message,
//     });
//   }
// });

// /* ===================================================
//    🧩 Upload + Create Task (Nano-Banana-Edit-Full)
// =================================================== */
// router.post(
//   "/nano-banana-edit-full",
//   upload.array("files", 10),
//   async (req, res) => {
//     console.log("🟢 [Edit-Full] درخواست جدید:", {
//       prompt: req.body.prompt,
//       files: req.files?.map((f) => f.originalname),
//     });

//     const { prompt, output_format = "png", image_size = "auto" } = req.body;

//     if (!prompt)
//       return res.status(400).json({ error: "❌ فیلد prompt الزامی است." });
//     if (!req.files || req.files.length === 0)
//       return res.status(400).json({ error: "❌ فایل تصویر الزامی است." });

//     try {
//       const uploadedUrls = [];
//       for (const file of req.files) {
//         console.log(`⬆️ در حال آپلود: ${file.originalname}`);
//         const formData = new FormData();
//         formData.append("file", file.buffer, file.originalname);
//         formData.append("uploadPath", "images/user-uploads");

//         const { resp: uploadResp } = await callKieAPI(
//           KIE_UPLOAD_URL,
//           "post",
//           formData,
//           formData.getHeaders()
//         );

//         const uploadData = uploadResp.data;
//         if (!uploadData.success) {
//           console.warn("❌ یکی از آپلودها شکست خورد:", uploadData);
//           return res.status(500).json({
//             error: "❌ آپلود یکی از فایل‌ها شکست خورد.",
//             raw: uploadData,
//           });
//         }
//         uploadedUrls.push(uploadData.data.downloadUrl);
//       }

//       console.log("✅ آپلودها تکمیل شد:", uploadedUrls);

//       const { resp: createResp } = await callKieAPI(KIE_CREATE_URL, "post", {
//         model: "google/nano-banana-edit",
//         input: { prompt, image_urls: uploadedUrls, output_format, image_size },
//       });

//       const taskData = createResp.data?.data || {};
//       console.log("🟣 ادیت جدید ساخته شد:", taskData.taskId);

//       res.json({
//         success: true,
//         taskId: taskData.taskId,
//         model: taskData.model || "google/nano-banana-edit",
//         state: taskData.state || "waiting",
//         message: "✅ ادیت با موفقیت ایجاد شد.",
//       });
//     } catch (err) {
//       console.error(
//         "Nano-Banana-Edit-Full error:",
//         err.response?.data || err.message
//       );
//       res.status(err.response?.status || 500).json({
//         error: err.response?.data || err.message,
//       });
//     }
//   }
// );

// /* ===================================================
//    3) 🔎 Upscale Image
// =================================================== */
// router.post("/nano-banana-upscale", async (req, res) => {
//   console.log("🟢 [Upscale] درخواست جدید:", req.body);
//   const { image, scale = 2, face_enhance = false } = req.body;
//   if (!image)
//     return res.status(400).json({ error: "❌ فیلد image الزامی است." });

//   try {
//     const { resp, apiKey } = await callKieAPI(KIE_CREATE_URL, "post", {
//       model: "nano-banana-upscale",
//       input: { image, scale, face_enhance },
//     });

//     console.info(`✅ Upscale با کلید ${apiKey}`);
//     res.status(resp.status).json(resp.data);
//   } catch (err) {
//     console.error(
//       "Nano-Banana-Upscale error:",
//       err.response?.data || err.message
//     );
//     res.status(err.response?.status || 500).json({
//       error: err.response?.data || err.message,
//     });
//   }
// });

// /* ===================================================
//    4) 🔎 Query Task (چک وضعیت)
// =================================================== */
// router.get("/query", async (req, res) => {
//   const { taskId } = req.query;
//   if (!taskId)
//     return res.status(400).json({ error: "❌ پارامتر taskId الزامی است." });

//   try {
//     const { resp, apiKey } = await callKieAPI(
//       `${KIE_QUERY_URL}?taskId=${taskId}`,
//       "get"
//     );

//     const data = resp.data?.data || {};
//     const filteredData = {
//       taskId: data.taskId,
//       model: data.model,
//       state: data.state,
//       resultJson: data.resultJson,
//       failCode: data.failCode,
//       failMsg: data.failMsg,
//       costTime: data.costTime,
//       completeTime: data.completeTime,
//       createTime: data.createTime,
//     };

//     res.status(resp.status).json({
//       code: resp.data.code,
//       msg: resp.data.msg,
//       data: filteredData,
//     });
//   } catch (err) {
//     res.status(err.response?.status || 500).json({
//       error: err.response?.data || err.message,
//     });
//   }
// });

// /* ===================================================
//    404
// =================================================== */
// router.use((req, res) => {
//   console.log("⚠️ درخواست نامعتبر:", req.originalUrl);
//   res.status(404).json({ error: "❌ مسیر یافت نشد." });
// });

// export default router;
