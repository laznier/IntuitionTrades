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

// 🔥 NEW: Ensure anonymous session persists across refreshes
setPersistence(auth, browserLocalPersistence);

// Helpers
async function getUsageCount(uid) {
  const snap = await get(ref(db, `usageCounts/${uid}/count`));
  return snap.exists() ? snap.val() : 0;
}

async function recordUsage(uid) {
  await runTransaction(ref(db, `usageCounts/${uid}/count`), current => (current || 0) + 1);
}

// Anonymous sign-in (reuses persisted sessions automatically)
signInAnonymously(auth).catch(err => {
  if (err.code !== 'auth/operation-not-allowed') console.error(err);
});

// Click gating logic
onAuthStateChanged(auth, user => {
  if (!user) return; // Shouldn't happen with anonymous auth enabled
  
  document.addEventListener("click", async e => {
    const btn = e.target.closest(".tool-free-run");
    if (!btn) return; // not a tool trigger

    if (!user.isAnonymous) return; // unlimited for logged-in users

    const used = await getUsageCount(user.uid);
    if (used >= 5) {
      alert(
        "You've reached your guest use limit. To prevent spam and ensure the best experience, please sign up or confirm your account for free unlimited access to this tool."
      );
      window.location.href = "/login.html?next=" + encodeURIComponent(location.pathname);
      return;
    }

    await recordUsage(user.uid);
  });
});

// Expose globals
window.app = app;
window.getAuth = getAuth;
window.onAuthStateChanged = onAuthStateChanged;
