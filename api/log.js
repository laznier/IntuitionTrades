// /api/log.js         (Vercel Serverless Function – no env vars needed)

export default function handler(req, res) {
    /* Accept only POST ─ anything else returns 405 */
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).end("Method Not Allowed");
    }
  
    try {
      /* Grab whatever the client sent */
      const {
        uid          = "unknown-uid",
        pageTitle    = "unknown-title",
        pagePath     = "unknown-path",
        event        = "event",          // page-load, tool-run, etc.
        extra        = {}                // optional arbitraries
      } = req.body || {};
  
      /* A single line per hit → easy to grep in Vercel */
      console.log(
        JSON.stringify({
          ts   : Date.now(),                             // epoch ms
          ip   : req.headers["x-real-ip"] ||
                 req.headers["x-forwarded-for"] ||
                 req.socket?.remoteAddress,
          uid,
          event,
          pageTitle,
          pagePath,
          ...extra
        })
      );
  
      /* Nothing else to do */
      return res.status(204).end();          // 204 = No Content
    } catch (err) {
      console.error("log-api error:", err);
      return res.status(500).end("log error");
    }
  }
  