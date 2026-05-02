// /api/log.js         (Vercel Serverless Function – no env vars needed)

export default function handler(req, res) {
  res.setHeader("Allow", "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).end("Method Not Allowed");
  }

  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const {
      uid = "unknown-uid",
      pageTitle = "unknown-title",
      pagePath = "unknown-path",
      event = "event",
      extra = {},
    } = body;
    const safeExtra = extra && typeof extra === "object" && !Array.isArray(extra) ? extra : {};

    console.log(
      JSON.stringify({
        ts: Date.now(),
        ip:
          req.headers["x-real-ip"] ||
          req.headers["x-forwarded-for"] ||
          req.socket?.remoteAddress,
        uid,
        event,
        pageTitle,
        pagePath,
        ...safeExtra,
      }),
    );

    return res.status(204).end();
  } catch (err) {
    console.error("log-api error:", err);
    return res.status(500).end("log error");
  }
}
  