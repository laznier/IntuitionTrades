// client.js
// ────────────────────────────────────────────────────────────────────────────
// Handles:
//  1) Web Speech Recognition → local transcript/translation
//  2) Emitting “translateMessage” to the server (with room, text, fromLang, toLang)
//  3) Receiving “translatedMessage” from server (for Partner) → display & speak aloud
//  4) Room join logic via “Connect to Room”
// ────────────────────────────────────────────────────────────────────────────

const socket = io(); // connects to the same host that served index.html

// ─── DOM Elements ───────────────────────────────────────────────────────────
const roomIdInput    = document.getElementById('roomId');
const connectBtn     = document.getElementById('connectBtn');
const srcLangLocal   = document.getElementById('srcLangLocal');
const tgtLangLocal   = document.getElementById('tgtLangLocal');
const toggleLocal    = document.getElementById('toggleLocal');

const localTransEl   = document.getElementById('localTrans');
const localOrigEl    = document.getElementById('localOrig');
const remoteTransEl  = document.getElementById('remoteTrans');
const remoteOrigEl   = document.getElementById('remoteOrig');

// ─── State Variables ─────────────────────────────────────────────────────────
let recognitionLocal, listeningLocal = false;
let bufferLocal = '', debounceLocal = null;
let currentRoom = null;

// Utility: pick a TTS voice matching the code (“en”, “es”, “ru”)
function getVoiceForLang(code) {
  const voices = speechSynthesis.getVoices();
  if (code === 'ru') return voices.find(v => v.lang.startsWith('ru'))  || null;
  if (code === 'es') return voices.find(v => v.lang.startsWith('es'))  || null;
  return voices.find(v => v.lang.startsWith('en')) || null;
}

// Speak a piece of text in the chosen language
function speakText(text, langCode) {
  if (!text) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = langCode === 'ru' ? 'ru-RU'
            : langCode === 'es' ? 'es-ES'
            : 'en-US';
  const voice = getVoiceForLang(langCode);
  if (voice) utter.voice = voice;
  speechSynthesis.speak(utter);
}

// ─── Room Join Logic ─────────────────────────────────────────────────────────
connectBtn.addEventListener('click', () => {
  const room = roomIdInput.value.trim() || 'main';
  currentRoom = room;
  socket.emit('joinRoom', room);
  connectBtn.disabled = true;
  roomIdInput.disabled = true;
  connectBtn.textContent = `Joined: ${room}`;
  // Now that we’re in a room, enable the “Start Speaking” button
  toggleLocal.disabled = false;
});

// ─── Local Speech Recognition ────────────────────────────────────────────────
function initRecognitionLocal() {
  recognitionLocal = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognitionLocal.interimResults = true;
  recognitionLocal.continuous     = true;
  updateRecognitionLocal();

  recognitionLocal.onresult = (e) => {
    let interim = '';
    let final   = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const w = e.results[i][0].transcript;
      if (e.results[i].isFinal) final += w + ' ';
      else interim += w;
    }
    bufferLocal += final;
    localOrigEl.textContent = bufferLocal + interim;

    clearTimeout(debounceLocal);
    debounceLocal = setTimeout(() => {
      const textToSend = bufferLocal + interim;
      if (textToSend.trim()) {
        // Show local translation immediately (optimistic UI)
        translateLocally(textToSend);

        // Emit to server so partner(s) in this room also get it
        socket.emit('translateMessage', {
          room:     currentRoom,
          text:     textToSend,
          fromLang: srcLangLocal.value,
          toLang:   tgtLangLocal.value
        });
      }
    }, 300);
  };

  recognitionLocal.onend = () => {
    if (listeningLocal) recognitionLocal.start();
  };
  recognitionLocal.onerror = (err) => console.warn('[LocalRecog error]', err);
}

function updateRecognitionLocal() {
  if (!recognitionLocal) return;
  const src = srcLangLocal.value;
  recognitionLocal.lang = src === 'ru' ? 'ru-RU'
                            : src === 'es' ? 'es-ES'
                            : 'en-US';
  // Clear local buffers when language changes
  bufferLocal = '';
  localOrigEl.textContent = '';
  localTransEl.textContent = '';
}

// Perform a local translation for “Local” UI, so user sees their own translation
async function translateLocally(text) {
  const fromLang = srcLangLocal.value;
  const toLang   = tgtLangLocal.value;
  const ENDPOINTS = [
    'https://translate.terraprint.co/translate',
    'https://lt.vern.cc/translate',
    'https://libretranslate.de/translate'
  ];
  let translated = '';
  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q:      text,
          source: fromLang,
          target: toLang,
          format: 'text'
        })
      });
      if (!res.ok) continue;
      const data = await res.json();
      translated = data.translatedText || '';
      if (translated) break;
    } catch (err) {
      console.warn(`[Local translate] ${url} error:`, err);
    }
  }
  localTransEl.textContent = translated;
  speakText(translated, toLang);
}

// Start/Stop local recognition
toggleLocal.addEventListener('click', () => {
  if (!recognitionLocal) initRecognitionLocal();
  if (listeningLocal) {
    recognitionLocal.stop();
    listeningLocal = false;
    toggleLocal.textContent = 'Start Speaking';
    toggleLocal.classList.remove('listening');
  } else {
    recognitionLocal.start();
    listeningLocal = true;
    toggleLocal.textContent = 'Stop Speaking';
    toggleLocal.classList.add('listening');
  }
});

// If user changes “I speak” dropdown, reset local recognition
srcLangLocal.addEventListener('change', () => {
  if (listeningLocal) {
    recognitionLocal.stop();
    listeningLocal = false;
    toggleLocal.textContent = 'Start Speaking';
    toggleLocal.classList.remove('listening');
  }
  updateRecognitionLocal();
});

// ─── Handle messages from the server (Partner’s speech) ────────────────────
socket.on('translatedMessage', ({ original, translated, from }) => {
  // We don’t show messages we ourselves sent (Socket.IO echo is only for others).
  // So whenever ANY other client in this room speaks, we land here:
  remoteOrigEl.textContent = original;
  remoteTransEl.textContent = translated;
  // Speak it aloud in the local “hearing” language that *this* client expects:
  speakText(translated, tgtLangLocal.value);
});

// ─── Enable “Start Speaking” only after TTS voices load ─────────────────────
window.speechSynthesis.onvoiceschanged = () => {
  // Now that voices are ready, user can connect or speak
  connectBtn.disabled = false;
  toggleLocal.disabled = false;
};
