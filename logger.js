/* public/logger.js  – NO server key needed */
import {
    getDatabase,
    ref,
    push,
    set
  } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";
  
  async function logToolUse() {
    /* 1️⃣  wait until Auth is ready */
    const auth = window.firebaseAuth || window.getAuth(window.app);
    if (!auth.currentUser) {
      await window.signInAnonymously(auth);     // exported by authGate.js
    }
  
    /* 2️⃣  build the log entry */
    const { uid }  = auth.currentUser;
    const payload  = {
      pageTitle : document.title  || "Unknown tool",
      pagePath  : location.pathname || "Unknown URL",
      timestamp : Date.now()
    };
  
    /* 3️⃣  write straight to Realtime-DB */
    const db      = getDatabase(window.app);          // <- use the same app
    const logRef  = push(ref(db, `usageCounts/${uid}/logs`));
    await set(logRef, payload)
          .catch(err => console.error("log error", err));
  }
  
  /* Run once DOM is ready */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", logToolUse);
  } else {
    logToolUse();
  }
  