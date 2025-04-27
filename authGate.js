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

// Ensure anonymous session persists
setPersistence(auth, browserLocalPersistence);

// Helpers
async function getUsageCount(uid) {
  const snap = await get(ref(db, `usageCounts/${uid}/count`));
  return snap.exists() ? snap.val() : 0;
}

async function recordUsage(uid) {
  await runTransaction(ref(db, `usageCounts/${uid}/count`), current => (current || 0) + 1);
}

let currentUser = null;

// Handle user state changes properly
onAuthStateChanged(auth, user => {
  currentUser = user;

  if (!user) {
    // fallback in rare case no user exists
    signInAnonymously(auth).catch(err => console.error(err));
  }
});

// Click gating logic, always using fresh user state
document.addEventListener("click", async e => {
  const btn = e.target.closest(".tool-free-run");
  if (!btn) return; // not a tool trigger

  if (!currentUser) {
    alert("Please sign in to use this tool.");
    return window.location.href = "/login.html";
  }

  // Fetch user role if not anonymous
  if (!currentUser.isAnonymous) {
    const snap = await get(ref(db, `users/${currentUser.uid}/role`));
    const role = snap.exists() ? snap.val() : "basic";
    if (role === "basic" || role === "premium") {
      return; // unlimited access
    }
  }

  // If anonymous, enforce 5-use limit
  if (currentUser.isAnonymous) {
    const used = await getUsageCount(currentUser.uid);
    if (used >= 5) {
      alert(
        "You've reached your guest use limit. To prevent spam and ensure the best experience, please sign up or confirm your account for free unlimited access to this tool."
      );
      window.location.href = "/login.html?next=" + encodeURIComponent(location.pathname);
      return;
    }
    await recordUsage(currentUser.uid);
  }
});

// Expose globals for other scripts
window.app = app;
window.getAuth = getAuth;
window.onAuthStateChanged = onAuthStateChanged;
