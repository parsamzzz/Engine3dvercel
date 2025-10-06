// 🌗 Theme Toggle
const themeToggle = document.getElementById('themeToggle');
themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  document.body.classList.toggle('light');
});

// 🌟 المان‌ها
const buttons = document.querySelectorAll('.cat-btn');
const previewContent = document.getElementById('previewContent');
const leftBtn = document.getElementById('arrowLeft');
const rightBtn = document.getElementById('arrowRight');
const logoEl = document.getElementById('selectedModelLogo');
const nameEl = document.getElementById('selectedModelName');
const panelContent = document.getElementById('panelContent');
const generateBtn = document.getElementById('generateBtn');

// 🟦 محتویات پنل
const contents = {
  image: `
    <div class="flex gap-2 mb-3">
      <button class="img-tab active px-3 py-1 rounded bg-sky-500 text-white text-xs" data-mode="text2img">Text-to-Image</button>
      <button class="img-tab px-3 py-1 rounded bg-gray-600/40 text-white text-xs" data-mode="img2img">Image-to-Image</button>
    </div>
    <label class="upload-box mb-3 hidden" id="imgUploadBox">
      <span>📤 Click or Drop Image Here</span>
      <input type="file" accept="image/*" id="imageInput" />
    </label>
    <label class="block text-xs opacity-80 mt-2">Output Format</label>
    <select class="input-dark mb-2">
      <option>png</option>
      <option>jpeg</option>
    </select>
    <label class="block text-xs opacity-80 mt-2">Image Size</label>
    <select class="input-dark mb-2">
      <option>1:1</option><option>9:16</option><option>16:9</option>
      <option>3:4</option><option>4:3</option><option>3:2</option>
      <option>2:3</option><option>5:4</option><option>4:5</option><option>21:9</option><option>auto</option>
    </select>
    <label class="block text-xs opacity-80 mt-2">Prompt</label>
    <textarea rows="4" class="input-dark resize-none" placeholder="Describe image…"></textarea>
  `,
  video: `
    <label class="upload-box" id="dropZone">
      <span>📤 Click or Drop Video/Image Here</span>
      <input type="file" accept="video/*,image/*" id="videoInput" />
    </label>
    <label class="block text-xs opacity-80 mt-2">Settings</label>
    <select class="input-dark mb-2"><option>Landscape</option><option>Portrait</option></select>
    <label class="block text-xs opacity-80 mt-2">Video Prompt</label>
    <textarea rows="4" class="input-dark resize-none" id="videoPrompt" placeholder="Describe video scene…"></textarea>
  `,
  audio: `
    <label class="upload-box" id="dropZone">
      <span>📤 Upload Audio</span>
      <input type="file" accept="audio/*" id="audioInput" />
    </label>
    <label class="block text-xs opacity-80 mt-2">Settings</label>
    <select class="input-dark mb-2">
      <option>MP3</option><option>WAV</option>
    </select>
  `,
  music: `
    <label class="upload-box" id="dropZone">
      <span>📤 Upload Reference Audio</span>
      <input type="file" accept="audio/*" id="musicInput" />
    </label>
    <label class="block text-xs opacity-80 mt-2">Music Style</label>
    <select class="input-dark mb-2">
      <option>Pop</option><option>Jazz</option><option>Classical</option>
    </select>
  `,
  "3d": `
    <label class="upload-box" id="dropZone">
      <span>📤 Upload Reference Image</span>
      <input type="file" accept="image/*" id="modelInput" />
    </label>
    <label class="block text-xs opacity-80 mt-2">Settings</label>
    <select class="input-dark mb-2">
      <option>OBJ</option><option>GLB</option>
    </select>
    <label class="block text-xs opacity-80 mt-2">3D Model Prompt</label>
    <textarea rows="3" class="input-dark resize-none" placeholder="Describe 3D object…"></textarea>
  `
};

// 🟦 لوگوهای مدل
const previewIcons = {
  image: [
    { name: "Nano Banana", logo: "./logo/nano-banana.png" },
    { name: "Seedream", logo: "./logo/seedance.png" },
    { name: "4o Image", logo: "./logo/ChatGPT_logo.svg.png" },
    { name: "Flux.1 Kontext", logo: "./logo/flux-kontext.webp" },
    { name: "Midjourney", logo: "./logo/midjourney.png" },
    { name: "Imagen 4", logo: "./logo/imagen4.png" },
    { name: "Ideogram V3", logo: "./logo/Ideogram-Logo.png" },
    { name: "Qwen Image Edit", logo: "./logo/qwen-color.png" }
  ],
  video: [
    { name: "Sora 2", logo: "./logo/ChatGPT_logo.svg.png" },
    { name: "Veo 3", logo: "./logo/Google.webp" },
    { name: "Runway", logo: "./logo/runway_app.png" },
    { name: "Seedance", logo: "./logo/seedance.png" },
    { name: "Kling", logo: "./logo/kling-color.png" },
    { name: "Wan 2.2", logo: "./logo/qwen-color.png" },
    { name: "Luma", logo: "./logo/luma-color.png" }
  ],
  music: [
    { name: "MusicGPT", logo: "./logo/musicgpt.png" },
    { name: "Suno", logo: "./logo/suno.png" }
  ],
  "3d": [
    { name: "Meshy", logo: "./logo/meshy.png" },
    { name: "Luma 3D", logo: "./logo/luma-color.png" }
  ]
};

// 🟦 اسلایدر
let scrollX = 0, direction = 1, sliderTimer = null, selectedCard = null;
const slider = previewContent, step = 180, interval = 2000;

function autoSlide() {
  if (direction === 1) {
    if (scrollX + slider.clientWidth >= slider.scrollWidth) direction = -1;
    else scrollX += step;
  } else {
    if (scrollX <= 0) direction = 1;
    else scrollX -= step;
  }
  slider.scrollTo({ left: scrollX, behavior: 'smooth' });
}

function startSlider() {
  if (selectedCard) return;
  clearInterval(sliderTimer);
  sliderTimer = setInterval(autoSlide, interval);
}

function stopSlider() {
  clearInterval(sliderTimer);
  sliderTimer = null;
}

// 🟦 رندر کارت‌ها
function renderPreview(cat) {
  previewContent.innerHTML = "";
  previewIcons[cat].forEach(item => {
    const card = document.createElement('div');
    card.className = "preview-card";
    card.innerHTML = `<img src="${item.logo}" alt="${item.name}"><span>${item.name}</span>`;
    card.addEventListener('click', () => {
      document.querySelectorAll('.preview-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedCard = card;
      logoEl.src = item.logo;
      logoEl.classList.remove('hidden');
      nameEl.textContent = item.name;
      stopSlider();
    });
    previewContent.appendChild(card);
  });
  initDragAndDrop();
  selectedCard = null;
  startSlider();
}

// 🟦 تغییر دسته
function setCategory(cat) {
  buttons.forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-cat="${cat}"]`).classList.add('active');
  logoEl.classList.add('hidden');
  nameEl.textContent = "";
  document.getElementById('panelContent').innerHTML = contents[cat];
  renderPreview(cat);
  if (cat === 'image') initImageTabs();
}

// 🟦 Event Listeners دسته‌بندی
buttons.forEach(btn => btn.addEventListener('click', () => setCategory(btn.dataset.cat)));
setCategory('image');

// 🟦 Drag & Drop
function initDragAndDrop() {
  const dropZone = document.getElementById('dropZone') || document.getElementById('imgUploadBox');
  const fileInput = dropZone ? dropZone.querySelector('input[type="file"]') : null;
  if (!dropZone) return;

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) {
      fileInput.files = e.dataTransfer.files;
      alert("File Selected: " + file.name);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) alert("File Selected: " + fileInput.files[0].name);
  });
}

// 🟦 تب‌های Image
function initImageTabs() {
  const tabs = document.querySelectorAll('.img-tab');
  const uploadBox = document.getElementById('imgUploadBox');
  tabs.forEach(t => {
    t.addEventListener('click', () => {
      tabs.forEach(x => x.classList.remove('active', 'bg-sky-500'));
      t.classList.add('active', 'bg-sky-500');
      if (t.dataset.mode === "text2img") uploadBox.classList.add('hidden');
      else uploadBox.classList.remove('hidden');
    });
  });
}

// 🟦 کنترل اسلایدر دستی
slider.addEventListener('mouseenter', startSlider);
slider.addEventListener('mouseleave', startSlider);
leftBtn.addEventListener('click', () => slider.scrollBy({ left: -step, behavior: 'smooth' }));
rightBtn.addEventListener('click', () => slider.scrollBy({ left: step, behavior: 'smooth' }));

// 🟦 ارسال به بک‌اند هنگام Generate برای مدل‌های ویدیو
const generateBtn = document.getElementById('generateBtn');
generateBtn.addEventListener('click', async () => {
  const selectedModel = nameEl.textContent;
  const fileInput = document.getElementById('videoInput');
  const prompt = document.getElementById('videoPrompt')?.value || '';
  if (!selectedModel || !fileInput || !fileInput.files[0]) {
    alert('Select a video model and upload a file!');
    return;
  }

  const formData = new FormData();
  formData.append('service', selectedModel.toLowerCase());
  formData.append('prompt', prompt);
  formData.append('file', fileInput.files[0]);

  try {
    const resp = await fetch('/api/universal/create', { method: 'POST', body: formData });
    const data = await resp.json();
    console.log('Task Created:', data);
    alert('Task Created: ' + data.taskId);
  } catch (err) {
    console.error('Error creating task:', err);
    alert('Error creating task');
  }
});
