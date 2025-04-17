const admin = require("firebase-admin");

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIAL);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://persuasive-net-456607-g8-default-rtdb.firebaseio.com"
  });
}

const db = admin.database();

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { idToken } = req.body;
  if (!idToken) {
    return res.status(400).json({ error: "Missing ID token" });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    await db.ref(`users/${uid}/role`).set("premium");

    res.status(200).json({ success: true, message: "User upgraded to premium." });
  } catch (err) {
    console.error("Upgrade Error:", err);
    res.status(500).json({ error: "Failed to upgrade user." });
  }
};
