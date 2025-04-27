// /public/authGate.js
import { initializeApp }  from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
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

// Helpers
async function getUsageCount(uid) {
  const snap = await get(ref(db, `usageCounts/${uid}/count`));
  return snap.exists() ? snap.val() : 0;
}
async function recordUsage(uid) {
  await runTransaction(
    ref(db, `usageCounts/${uid}/count`),
    cur => (cur || 0) + 1
  );
}

// 1) Sign in anonymously (or reuse existing anon session)
signInAnonymously(auth).catch(err => {
  if (err.code !== "auth/operation-not-allowed") console.error(err);
});

// 2) When auth state settles, wire up the click-gate
onAuthStateChanged(auth, user => {
  // no more “null” → either anon or real
  document.addEventListener("click", async e => {
    const btn = e.target.closest(".tool-free-run");
    if (!btn) return;             // not a tool trigger

    // if they’re fully signed in → no cap
    if (user && !user.isAnonymous) {
      return;  // unlimited for basic/premium
    }

    // they must be anonymous if we get here
    const used = await getUsageCount(user.uid);
    if (used >= 5) {
      alert(
        "You’ve hit your 5-free-use limit. Please sign in or sign up for unlimited access."
      );
      return window.location.href =
        "/login.html?next=" + encodeURIComponent(location.pathname);
    }

    // count this click and let the button’s default action proceed
    await recordUsage(user.uid);
  });
});

// expose globals so your pages can still do:
//   const auth = getAuth(app);
//   onAuthStateChanged(auth, user => { … init your tool … });
window.app                  = app;
window.getAuth              = getAuth;
window.onAuthStateChanged   = onAuthStateChanged;

