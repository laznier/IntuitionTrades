
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

// 1) Sign in anonymously (or reuse existing)
// 2) Only after that, wire up the click‐gate in capture‐phase
signInAnonymously(auth)
  .then(() => {
    onAuthStateChanged(auth, user => {
      // user is never null here (anon or real)
      document.addEventListener("click", async e => {
        const btn = e.target.closest(".tool-free-run");
        if (!btn) return;             // only care about our tagged buttons

        // fully signed‐in users are unlimited
        if (user && !user.isAnonymous) {
          return;
        }

        // anonymous users get 5 total
        const used = await getUsageCount(user.uid);
        if (used >= 5) {
          // block the normal click handler from ever firing
          e.preventDefault();
          e.stopImmediatePropagation();

          alert(
            "You've reached your 5-use limit. To prevent spam and ensure the best experience, please sign up or confirm your account for free unlimited access."
          );
          return window.location.href =
            "/login.html?next=" + encodeURIComponent(location.pathname);
        }

        // otherwise count this click and allow the tool to run
        await recordUsage(user.uid);
      }, /* <- capture phase: */ true);
    });
  })
  .catch(err => {
    // if anon auth is disabled, you can fallback or just log
    console.error("Anonymous sign-in failed:", err);
  });

// expose these so your existing tool code can still do:
//   const auth = getAuth(app);
//   onAuthStateChanged(auth, user => { /* init tool… */ });
window.app                  = app;
window.getAuth              = getAuth;
window.onAuthStateChanged   = onAuthStateChanged;
