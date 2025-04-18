// api/downgrade-expired-trials.js

const admin = require("firebase-admin");

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIAL);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://persuasive-net-456607-g8-default-rtdb.firebaseio.com"
  });
}

const db = admin.database();

export default async function handler(req, res) {
  // Only allow GET (triggered by Vercel Cron)
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // 24 hours ago
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;

    // Get all users whose trialStart ≤ cutoff
    const snap = await db
      .ref("users")
      .orderByChild("trialStart")
      .endAt(cutoff)
      .once("value");

    const updates = {};
    snap.forEach(userSnap => {
      const u = userSnap.val();
      // only downgrade if they used trial and still premium
      if (u.trialUsed && u.role === "premium") {
        updates[`${userSnap.key}/role`] = "basic";
      }
    });

    if (Object.keys(updates).length) {
      await db.ref("users").update(updates);
      console.log(`Downgraded ${Object.keys(updates).length} users`);
    }

    return res.status(200).json({ downgraded: Object.keys(updates).length });
  } catch (err) {
    console.error("Error downgrading trials:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
