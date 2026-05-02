/* public/logger.js  – lightweight public-only request logging */

async function logToolUse() {
  const payload = {
    event: "page-load",
    pageTitle: document.title || "Unknown tool",
    pagePath: location.pathname || "Unknown URL",
    timestamp: Date.now(),
  };

  fetch("/api/log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch((error) => console.warn("Vercel log error:", error));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", logToolUse);
} else {
  logToolUse();
}
