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
  

/* ---------- Handle user-state changes ---------- */
onAuthStateChanged(auth, user => {
  if (!user) {
    // No UID yet – that’s fine; we’ll create one on first interaction.
    console.log("⌛ No Firebase user yet (lazy sign-in enabled)");
    return;
  }

  currentUser = user;
  console.log("👤 Firebase user ready:", user.uid);

  if (user.isAnonymous) {
    // Ensure DB nodes exist the first time we ever see this UID
    const usageRef = ref(db, `usageCounts/${user.uid}/count`);
    get(usageRef).then(snap => {
      if (!snap.exists()) {
        console.log("🆕 Initialising DB nodes for anon UID");
        runTransaction(usageRef, () => 0);
        runTransaction(
          ref(db, `users/${user.uid}`),
          cur => cur || { role: "anon", createdAt: Date.now() }
        );
      }
    });
  }
});

/* ---------- Click listener for “free-run” tools ---------- */
function setupToolClicks() {
  document.addEventListener("click", async e => {
    const btn = e.target.closest(".tool-free-run");
    if (!btn) return;                         // not a tool trigger

    /* 1️⃣ Lazy sign-in: create anon UID right now (first interaction) */
    if (!auth.currentUser) {
      console.log("⚡ First interaction — signing-in anonymously");
      await signInAnonymously(auth).catch(console.error);
      currentUser = auth.currentUser;

      // Create the DB nodes for this brand-new UID
      const usageRef = ref(db, `usageCounts/${currentUser.uid}/count`);
      const snap = await get(usageRef);
      if (!snap.exists()) {
        await runTransaction(usageRef, () => 0);
        await runTransaction(
          ref(db, `users/${currentUser.uid}`),
          cur => cur || { role: "anon", createdAt: Date.now() }
        );
      }
    }

    /* 2️⃣ If the user is now non-anonymous (i.e. real account), allow unlimited */
    if (!currentUser.isAnonymous) {
      const roleSnap = await get(ref(db, `users/${currentUser.uid}/role`));
      const role     = roleSnap.exists() ? roleSnap.val() : "basic";
      if (role === "basic" || role === "premium") {
        return;  // no limits for registered users
      }
    }

    /* 3️⃣ Anonymous user – server-side usage-limit check */
    try {
      const usageCheck = await checkUsageLimit();
      if (!usageCheck.data.allowed) {
        console.warn(`❌ Usage limit reached for UID: ${currentUser.uid}`);
        showSignupVideoPopup();               // block action
        return;
      }
    } catch (err) {
      console.error("Usage check failed:", err.message);
      showSignupVideoPopup();                 // block just in case
      return;
    }

    /* 4️⃣ Locally increment the counter */
    await recordUsage(currentUser.uid);
  });
}

/* Install the listener immediately (UID not required beforehand) */
setupToolClicks();

  
  // make them available to logger.js without an import-cycle
window.firebaseAuth      = auth;
window.signInAnonymously = signInAnonymously;


// Expose globals if needed
window.app = app;
window.getAuth = getAuth;
window.onAuthStateChanged = onAuthStateChanged;
