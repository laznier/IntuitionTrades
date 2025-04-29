// logger.js  – place this file in /public next to authGate.js
async function logToolUse() {
    // 1️⃣ make sure Firebase Auth is ready
    const auth = window.firebaseAuth || window.getAuth(window.app);
  
    if (!auth.currentUser) {
      // these two helpers are exported / exposed by authGate.js (see step 2)
      await window.signInAnonymously(auth);
    }
  
    const { uid } = auth.currentUser;
    const pageTitle = document.title || "Unknown tool";
    const pagePath  = window.location.pathname || "Unknown URL";
  
    // 2️⃣ send the log to your Vercel edge-function
    await fetch("/api/log", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ uid, pageTitle, pagePath })
    }).catch(err => console.error("log error", err));
  }
  
  /* 3️⃣ run once DOM is ready */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", logToolUse);
  } else {
    logToolUse();
  }
  