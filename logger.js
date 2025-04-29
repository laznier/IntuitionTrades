/* public/logger.js  – keeps RTDB logging, also echoes to Vercel logs */

import {
  getDatabase,
  ref,
  push,
  set
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

async function logToolUse() {
  /* 1️⃣  wait until Firebase Auth is ready */
  const auth = window.firebaseAuth || window.getAuth(window.app);
  if (!auth.currentUser) {
    await window.signInAnonymously(auth);       // exported by authGate.js
  }

  /* 2️⃣  build the payload we’ll log */
  const { uid } = auth.currentUser || {};
  const payload = {
    uid,                                    // handy in Vercel logs too
    pageTitle : document.title      || "Unknown tool",
    pagePath  : location.pathname    || "Unknown URL",
    timestamp : Date.now()
  };

  /* 3️⃣  ── Realtime-DB log (unchanged) ───────────────────────────── */
  try {
    const db     = getDatabase(window.app);
    const logRef = push(ref(db, `usageCounts/${uid}/logs`));
    await set(logRef, payload);
  } catch (err) {
    console.error("RTDB log error:", err);
  }

  /* 4️⃣  ── Echo to Vercel so you can watch live ─────────────────── */
  fetch("/api/log", {
    method : "POST",
    headers: { "Content-Type": "application/json" },
    body   : JSON.stringify(payload)
  }).catch(err => console.warn("Vercel log error:", err));
}

/* Run once the DOM is ready */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", logToolUse);
} else {
  logToolUse();
}
