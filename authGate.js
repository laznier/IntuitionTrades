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

import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-functions.js";
const functions = getFunctions(app);
const checkUsageLimit = httpsCallable(functions, "checkUsageLimit");


// Video popup creation
function showSignupVideoPopup() {
    if (document.getElementById("signup-video-popup")) return;
  
    const overlay = document.createElement("div");
    overlay.id = "signup-video-popup";
    overlay.innerHTML = `
  <div class="floating-close">&times;</div>
  <div class="video-popup-inner">
    <video id="signup-video" src="/videos/signup.mp4" autoplay muted playsinline controls preload="auto" style="max-width:90%; border-radius:12px;"></video>
    <div style="margin-top:10px; font-size:1.1rem;">Create your free account to unlock unlimited access!</div>
  </div>
`;
    document.body.appendChild(overlay);
  
    document.querySelector(".floating-close").addEventListener("click", (e) => {
        e.stopPropagation(); // prevent weird bubbling
        document.getElementById("signup-video-popup")?.remove();
        window.location.href = "/login.html?next=" + encodeURIComponent(location.pathname);
      });
      
      
  
      overlay.addEventListener("click", e => {
        if (e.target.id === "signup-video-popup") {
          overlay.remove();
          window.location.href = "/login.html?next=" + encodeURIComponent(location.pathname);
        }
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

    .floating-close {
  position: fixed; /* Important: NOT relative to video */
  top: 10px;
  right: 10px;
  font-size: 2rem;
  color: white;
  background: rgba(0,0,0,0.6);
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  text-align: center;
  line-height: 40px;
  cursor: pointer;
  z-index: 10000;
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
    try {
      await runTransaction(ref(db, `usageCounts/${uid}/count`), current => {
        const newCount = (current || 0) + 1;
        console.log(`🧮 Recorded free run usage for UID: ${uid}. New count: ${newCount}`);
        return newCount;
      });
      console.log("✅ Successfully recorded usage for", uid);
    } catch (error) {
      console.error("❌ Failed to record usage for", uid, error.message);
    }
  }
  

// Handle user state changes properly
onAuthStateChanged(auth, user => {
    if (!user) {                       // 🔒 guard against the first null event
            console.log("🔄 no user yet – signing-in anonymously");
            signInAnonymously(auth).catch(console.error);
            return;                          // wait for the next event
          }
        
          currentUser = user;
          console.log("👤 Firebase user ready:", user.uid);
        
          if (user.isAnonymous) {
    // Initialize usage count if not yet set
    const usageRef = ref(db, `usageCounts/${user.uid}/count`);
    get(usageRef).then(snap => {
      if (!snap.exists()) {
        // Also create a /users/{uid} entry with role: "anon"
        runTransaction(usageRef, () => 0);
        runTransaction(ref(db, `users/${user.uid}`), current => current || { role: "anon", createdAt: Date.now() });
      }
    });
  }
  

  // Now that we know user is ready → set up the click listeners
  setupToolClicks();
});

function setupToolClicks() {
    document.addEventListener("click", async e => {
      const btn = e.target.closest(".tool-free-run");
      if (!btn) return; // not a tool trigger
  
      if (!currentUser) {
        console.error("User not ready yet.");
        return;
      }
  
      // 1️⃣ If logged in with a real account, allow unlimited
      if (!currentUser.isAnonymous) {
        const snap = await get(ref(db, `users/${currentUser.uid}/role`));
        const role = snap.exists() ? snap.val() : "basic";
        if (role === "basic" || role === "premium") {
          return; // unlimited access
        }
      }
  
      // 2️⃣ Otherwise (anonymous), check usage limit
      try {
        const usageCheck = await checkUsageLimit();
        if (!usageCheck.data.allowed) {
            console.warn(`❌ Usage limit reached for UID: ${currentUser.uid}`);
          showSignupVideoPopup();
          return; // Block action, don't proceed
        }
      } catch (err) {
        console.error("Usage check failed:", err.message);
        showSignupVideoPopup(); // Block just in case
        return;
      }
  
      // 3️⃣ Locally record usage too
      await recordUsage(currentUser.uid);
    });
  }
  
  // make them available to logger.js without an import-cycle
window.firebaseAuth      = auth;
window.signInAnonymously = signInAnonymously;


// Expose globals if needed
window.app = app;
window.getAuth = getAuth;
window.onAuthStateChanged = onAuthStateChanged;
