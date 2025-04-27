// /public/authGate.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  get,
  runTransaction
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

// ← your existing web config
const firebaseConfig = { /* … */ };

// Init Firebase
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getDatabase(app);

// Ensure every visitor is at least signed in anonymously
signInAnonymously(auth).catch(err => {
  if (err.code !== 'auth/operation-not-allowed') console.error(err);
});

// Helpers
async function getUsageCount(uid) {
  const snap = await get(ref(db, `usageCounts/${uid}/count`));
  return snap.exists() ? snap.val() : 0;
}
async function recordUsage(uid) {
  await runTransaction(ref(db, `usageCounts/${uid}/count`),
                       current => (current || 0) + 1);
}

// Gate: if anon and over 5 runs, kick to login
onAuthStateChanged(auth, async user => {
  if (!user) {
    alert("Please sign in to use this tool.");
    return location.href = "/login.html";
  }
  if (user.isAnonymous) {
    const used = await getUsageCount(user.uid);
    if (used >= 5) {
      alert(
        "You’ve hit your 5-free-use limit. Please sign in or sign up for unlimited access."
      );
      return location.href =
        "/login.html?next=" + encodeURIComponent(location.pathname);
    }
    await recordUsage(user.uid);
  }
  // if we get here, access is granted — page-specific code runs normally
});
