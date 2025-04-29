export default async function handler(req, res) {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }
  
    const { uid, message } = req.body;
  
    if (!uid || !message) {
      return res.status(400).json({ error: "Missing uid or message" });
    }
  
    console.log(`📩 [LOG] UID: ${uid} | Message: ${message}`);
    res.status(200).json({ success: true });
  }
  