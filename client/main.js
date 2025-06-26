console.log('main.js loaded');

const chatContainer = document.getElementById('chat-container');
const input = document.getElementById('questionInput');
const sendBtn = document.getElementById('sendBtn');
const resetBtn = document.getElementById('resetBtn');

let history = [];
let isResponding = false;
let typingInterval;
let controller;

function scrollToBottom() {
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function detectDirection(text) {
  return /[\u0600-\u06FF]/.test(text) ? 'rtl' : 'ltr';
}


function addMessage(text, role) {
  const msg = document.createElement('div');
  msg.className = `message ${role} ${detectDirection(text)}`;
  msg.innerHTML = text;
  chatContainer.appendChild(msg);
  scrollToBottom();
}


function simulateTyping(text, role) {
  const msg = document.createElement('div');
  msg.className = `message ${role} ${detectDirection(text)}`;
  chatContainer.appendChild(msg);
  isResponding = true;
  sendBtn.textContent = '⏹ توقف';

  let i = 0;
  typingInterval = setInterval(() => {
    msg.innerHTML += text.charAt(i++);
    scrollToBottom();
    if (i >= text.length) {
      clearInterval(typingInterval);
      isResponding = false;
      sendBtn.textContent = 'ارسال';
    }
  }, 20);
}


function resetChat() {
  history = [];
  chatContainer.innerHTML = '';
  input.value = '';
  scrollToBottom();
}


async function handleSend() {
  if (isResponding) {
    clearInterval(typingInterval);
    controller?.abort();
    isResponding = false;
    sendBtn.textContent = 'ارسال';
    return;
  }

  const question = input.value.trim();
  if (!question) return;

  input.value = '';
  addMessage(question, 'user');
  history.push({ role: 'user', text: question });

  controller = new AbortController();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history }),
      signal: controller.signal
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || `Status ${res.status}`);
    }
    const data = await res.json();
    simulateTyping(data.reply, 'assistant');
    history.push({ role: 'assistant', text: data.reply });
  } catch (err) {
    console.error('Fetch error:', err.message);
    addMessage(`⚠ خطا در اتصال به سرور: ${err.message}`, 'assistant');
  }
}

sendBtn.addEventListener('click', handleSend);
input.addEventListener('keydown', e => { if (e.key === 'Enter') handleSend(); });
resetBtn.addEventListener('click', resetChat);


window.addEventListener('DOMContentLoaded', () => {
  const welcome = `سلام! 😊  من چت‌بات تخصصی تریدیفای هستم . 
 هر سوالی درباره خدمات و امکانات وبسایت تریدیفای و همچنین ابزارها و نرم افزارهای طراحی سه‌بعدی دارید، بپرسید.`   
  simulateTyping(welcome, 'assistant');
  history.push({ role: 'assistant', text: welcome });
});

