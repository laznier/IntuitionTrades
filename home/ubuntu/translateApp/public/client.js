// client.js
//  ──────────────────────────────────────────────────────────────────────────
//  Uses Web Speech Recognition → sends text + languages to server via Socket.IO
//  → receives translated text and uses Web Speech Synthesis to play it aloud
//  -------------------------------------------
//  Must be served over HTTPS (or http://localhost) for SpeechRecognition to work.

const socket = io();   // auto-connects to the same origin

// Automatically join “main” room (or generate a random room ID if you want private rooms)
socket.emit('joinRoom', 'main');

// -------------- Speaker A elements --------------
const srcLangA   = document.getElementById('srcLangA');
const tgtLangA   = document.getElementById('tgtLangA');
const toggleA    = document.getElementById('toggleA');
const origA      = document.getElementById('origA');
const transA     = document.getElementById('transA');

// -------------- Speaker B elements --------------
const srcLangB   = document.getElementById('srcLangB');
const tgtLangB   = document.getElementById('tgtLangB');
const toggleB    = document.getElementById('toggleB');
const origB      = document.getElementById('origB');
const transB     = document.getElementById('transB');

// -------------- Common helpers --------------

function supported() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition) && 'speechSynthesis' in window;
}

if (!supported()) {
  alert('Your browser does not support Web Speech APIs. Use Chrome or Edge on HTTPS/localhost.');
}

function codeToSpeechVoice(code) {
  // We’ll pick the first matching voice name from speechSynthesis.getVoices()
  const voices = speechSynthesis.getVoices();
  if (code === 'en') return voices.find(v => v.lang.startsWith('en'))  || null;
  if (code === 'es') return voices.find(v => v.lang.startsWith('es'))  || null;
  if (code === 'ru') return voices.find(v => v.lang.startsWith('ru'))  || null;
  return null;
}

function speakText(text, langCode) {
  if (!text) return;
  const utter = new SpeechSynthesisUtterance(text);
  // pick an appropriate voice
  const voice = codeToSpeechVoice(langCode);
  if (voice) utter.voice = voice;
  utter.lang = langCode === 'ru' ? 'ru-RU'
              : langCode === 'es' ? 'es-ES'
              : 'en-US';
  speechSynthesis.speak(utter);
}

// -------------- Recognition & Translation for A --------------
let recogA, listeningA = false, bufferA = '', debounceA = null;

function initRecogA() {
  recogA = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recogA.interimResults = true;
  recogA.continuous     = true;
  updateRecogA();

  recogA.onresult = (e) => {
    let interim = '', final = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const w = e.results[i][0].transcript;
      if (e.results[i].isFinal) final += w + ' ';
      else interim += w;
    }
    bufferA += final;
    origA.textContent = bufferA + interim;

    clearTimeout(debounceA);
    debounceA = setTimeout(() => {
      // send only finalized text to server
      const textToSend = bufferA + interim;
      if (textToSend.trim()) {
        socket.emit('translateMessage', {
          text:      textToSend,
          fromLang:  srcLangA.value,
          toLang:    tgtLangA.value
        });
      }
    }, 300);
  };

  recogA.onend = () => {
    if (listeningA) recogA.start();
  };
  recogA.onerror = (err) => console.warn('[recogA.error]', err);
}

function updateRecogA() {
  if (!recogA) return;
  // e.g. “en→en-US”, “es→es-ES”, “ru→ru-RU”
  recogA.lang = srcLangA.value === 'ru' ? 'ru-RU'
               : srcLangA.value === 'es' ? 'es-ES'
               : 'en-US';
  bufferA = '';
  origA.textContent = '';
  transA.textContent = '';
}

srcLangA.addEventListener('change', () => {
  if (listeningA) {
    recogA.stop();
    listeningA = false;
    toggleA.textContent = 'Start A';
    toggleA.classList.remove('listening');
  }
  updateRecogA();
});

toggleA.addEventListener('click', () => {
  if (!recogA) initRecogA();
  if (listeningA) {
    recogA.stop();
    listeningA = false;
    toggleA.textContent = 'Start A';
    toggleA.classList.remove('listening');
  } else {
    recogA.start();
    listeningA = true;
    toggleA.textContent = 'Stop A';
    toggleA.classList.add('listening');
  }
});

//  When A receives a translated message, show and speak it
socket.on('translatedMessage', ({ original, translated }) => {
  // Only show‐and‐play if this client is “A” AND the target language matches A’s chosen “hearing” language
  if (tgtLangA.value) {
    transA.textContent = translated;
    speakText(translated, tgtLangA.value);
  }
});

// -------------- Recognition & Translation for B --------------
let recogB, listeningB = false, bufferB = '', debounceB = null;

function initRecogB() {
  recogB = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recogB.interimResults = true;
  recogB.continuous     = true;
  updateRecogB();

  recogB.onresult = (e) => {
    let interim = '', final = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const w = e.results[i][0].transcript;
      if (e.results[i].isFinal) final += w + ' ';
      else interim += w;
    }
    bufferB += final;
    origB.textContent = bufferB + interim;

    clearTimeout(debounceB);
    debounceB = setTimeout(() => {
      const textToSend = bufferB + interim;
      if (textToSend.trim()) {
        socket.emit('translateMessage', {
          text:      textToSend,
          fromLang:  srcLangB.value,
          toLang:    tgtLangB.value
        });
      }
    }, 300);
  };

  recogB.onend = () => {
    if (listeningB) recogB.start();
  };
  recogB.onerror = (err) => console.warn('[recogB.error]', err);
}

function updateRecogB() {
  if (!recogB) return;
  recogB.lang = srcLangB.value === 'ru' ? 'ru-RU'
               : srcLangB.value === 'es' ? 'es-ES'
               : 'en-US';
  bufferB = '';
  origB.textContent = '';
  transB.textContent = '';
}

srcLangB.addEventListener('change', () => {
  if (listeningB) {
    recogB.stop();
    listeningB = false;
    toggleB.textContent = 'Start B';
    toggleB.classList.remove('listening');
  }
  updateRecogB();
});

toggleB.addEventListener('click', () => {
  if (!recogB) initRecogB();
  if (listeningB) {
    recogB.stop();
    listeningB = false;
    toggleB.textContent = 'Start B';
    toggleB.classList.remove('listening');
  } else {
    recogB.start();
    listeningB = true;
    toggleB.textContent = 'Stop B';
    toggleB.classList.add('listening');
  }
});

socket.on('translatedMessage', ({ original, translated }) => {
  // Only show‐and‐play if this client is “B” AND the target matches B’s “hearing” language
  if (tgtLangB.value) {
    transB.textContent = translated;
    speakText(translated, tgtLangB.value);
  }
});

// --------------- Enable buttons once voices populate ---------------
window.speechSynthesis.onvoiceschanged = () => {
  // We know voices are ready; now enable toggles
  toggleA.disabled = false;
  toggleB.disabled = false;
};
