import { firebaseAuth, signInAnonymously } from '/authGate.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const auth = firebaseAuth;

    if (!auth.currentUser) {
      await signInAnonymously(auth);
      console.log("Signed in anonymously");
    }

    if (auth.currentUser) {
      const pageTitle = document.title || "Unknown Tool";
      const pagePath = window.location.pathname || "Unknown URL";

      await fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: auth.currentUser.uid,
          message: `Used tool: ${pageTitle} (${pagePath})`
        })
      });

      console.log("Logged tool usage successfully.");
    }
  } catch (error) {
    console.error("Auth or log error:", error);
  }
});
