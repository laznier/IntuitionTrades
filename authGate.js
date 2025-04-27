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
const firebaseConfig = {
  apiKey: "AIzaSyCw3AOOCQhYz1gn5-R8xxqdXFYMMEoPPH8",
  authDomain: "persuasive-net-456607-g8.firebaseapp.com",
  projectId: "persuasive-net-456607-g8",
  storageBucket: "persuasive-net-456607-g8.appspot.com",
  messagingSenderId: "1019332250475",
  appId: "1:1019332250475:web:3b931ad7fd0a72e1949a2e",
  databaseURL: "https://persuasive-net-456607-g8-default-rtdb.firebaseio.com"
};

// Init Firebase
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
    current => (current || 0) + 1
  );
}

// 1) Sign in anonymously, then …
signInAnonymously(auth)
  .then(() => {
    // 2) … only after anon-auth succeeds, subscribe to state changes
    onAuthStateChanged(auth, async user => {
      // user is always non-null here
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
      // access granted — your page scripts can now run
    });
  })
  .catch(err => {
    console.error("Anonymous sign-in failed:", err);
  });

// Expose to global scope for unmodified pages
window.app                = app;
window.getAuth            = getAuth;
window.onAuthStateChanged = onAuthStateChanged;
