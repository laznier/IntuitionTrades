// /public/authGate.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  get,
  runTransaction
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCw3AOOCQhYz1gn5-R8xxqdXFYMMEoPPH8",
  authDomain: "persuasive-net-456607-g8.firebaseapp.com",
  projectId: "persuasive-net-456607-g8",
  storageBucket: "persuasive-net-456607-g8.appspot.com",
  messagingSenderId: "1019332250475",
  appId: "1:1019332250475:web:3b931ad7fd0a72e1949a2e",
  databaseURL: "https://persuasive-net-456607-g8-default-rtdb.firebaseio.com"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getDatabase(app);

setPersistence(auth, browserLocalPersistence);

let currentUser = null;

// Video popup creation
function showSignupVideoPopup() {
  // If it already exists, don't recreate
  if (document.getElementById("signup-video-popup")) return;

  const overlay = document.createElement("div");
  overlay.id = "signup-video-popup";
  overlay.innerHTML = `
    <div class="video-popup-inner">
      <button class="close-popup">&times;</button>
      <video src="/your_video.mp4" autoplay muted controls playsinline style="max-width:90%; border-radius:12px;"></video>
      <div style="margin-top:10px; font-size:1.1rem;">Create your free account to unlock unlimited access!</div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.querySelector(".close-popup").addEventListener("click", () => {
    overlay.remove();
  });

  // Optional: Clicking outside closes it too
  overlay.addEventListener("click", e => {
    if (e.target.id === "signup-video-popup") overlay.remove();
  });
}

// Create minimal CSS dynamically
const style = document.createElement("style");
style.textContent = `
  #signup-video-popup {
    position: fixed;
    top:0; left:0; width:100%; height:100%;
    background: rgba(0,0,0,0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    animation: fadeIn 0.3s ease-out forwards;
  }
  .video-popup-inner {
    background: #111;
    padding: 20px;
    border-radius: 12px;
    text-align: center;
    max-width: 500px;
    width: 90%;
    animation: slideUp 0.4s ease-out forwards;
  }
  .close-popup {
    position: absolute;
    top:15px; right:20px;
    background: transparent;
    border: none;
    font-size: 2rem;
    color: #fff;
    cursor: pointer;
  }
  @keyframes fadeIn {
    from { opacity:0; }
    to   { opacity:1; }
  }
  @keyframes slideUp {
    from { transform: translateY(20px); opacity:0; }
    to   { transform: translateY(0); opacity:1; }
  }
`;
document.head.appendChild(style);

// Helpers
async function getUsageCount(uid) {
  const snap = await get(ref(db, `usageCounts/${uid}/count`));
  return snap.exists() ? snap.val() : 0;
}

async function recordUsage(uid) {
  await runTransaction(ref(db, `usageCounts/${uid}/count`), current => (current || 0) + 1);
}

// Handle user state changes properly
onAuthStateChanged(auth, user => {
  currentUser = user;

  if (!user) {
    signInAnonymously(auth).catch(err => console.error(err));
  }

  // Now that we know user is ready → set up the click listeners
  setupToolClicks();
});

function setupToolClicks() {
  document.addEventListener("click", async e => {
    const btn = e.target.closest(".tool-free-run");
    if (!btn) return; // not a tool trigger

    if (!currentUser.isAnonymous) {
      const snap = await get(ref(db, `users/${currentUser.uid}/role`));
      const role = snap.exists() ? snap.val() : "basic";
      if (role === "basic" || role === "premium") {
        return; // unlimited access
      }
    }

    if (currentUser.isAnonymous) {
      const used = await getUsageCount(currentUser.uid);

      if (used >= 5) {
        showSignupVideoPopup(); // 👈 show video instead of alert
        return;
      }

      await recordUsage(currentUser.uid);
    }
  });
}

// Expose globals if needed
window.app = app;
window.getAuth = getAuth;
window.onAuthStateChanged = onAuthStateChanged;
