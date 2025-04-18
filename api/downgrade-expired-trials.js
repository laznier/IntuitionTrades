// api/downgrade-expired-trials.js

const admin = require("firebase-admin");

// Initialize Firebase Admin once
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
}

const db = admin.database();

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // 24 hours ago
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;

    // Find users whose trialStart ≤ cutoff
    const snap = await db
      .ref("users")
      .orderByChild("trialStart")
      .endAt(cutoff)
      .once("value");

    const updates = {};
    snap.forEach(child => {
      const u = child.val();
      if (u.trialUsed && u.role === "premium") {
        updates[`${child.key}/role`] = "basic";
      }
    });

    const count = Object.keys(updates).length;
    if (count) {
      await db.ref("users").update(updates);
      console.log(`Downgraded ${count} users`);
    }

    return res.status(200).json({ downgraded: count });
  } catch (err) {
    console.error("Error downgrading trials:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
