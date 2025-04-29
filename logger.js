// public/logger.js
async function logToolUse() {
    const auth = window.firebaseAuth || window.getAuth(window.app);
  
    if (!auth.currentUser) await window.signInAnonymously(auth);  // anon UID
  
    const { uid }   = auth.currentUser;
    const db        = window.appDb || window.getDatabase(window.app); // already in authGate
    const pushRef   = window.firebasePush || (await import(
                        "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js"
                      )).push;
    const ref       = (await import(
                        "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js"
                      )).ref;
  
    pushRef(ref(db, `usageCounts/${uid}/logs`), {
      pageTitle : document.title || "unknown tool",
      pagePath  : location.pathname,
      timestamp : Date.now()
    }).catch(console.error);
  }
  
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", logToolUse);
  } else {
    logToolUse();
  }
  