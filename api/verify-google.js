// api/verify‑google.js
const admin = require('firebase-admin');

if (!admin.apps.length) {
  const svc = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIAL);
  admin.initializeApp({
    credential: admin.credential.cert(svc),
    databaseURL:    process.env.FIREBASE_DATABASE_URL.replace(/\/$/, '')
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  const { token, requirePremium = false } = req.body || {};

  if (!token) {
    console.log("⚠️ Missing ID token");
    return res.status(400).json({ error: 'Missing ID token' });
  }

  try {
    // 1) Verify Firebase ID token
    const decoded = await admin.auth().verifyIdToken(token);
    console.log("🔑 decoded token:", decoded);
    const uid = decoded.uid;

    // 2) Fetch the user's role
    const snap = await admin
      .database()
      .ref(`users/${uid}/role`)
      .once('value');
    const role = snap.val();
    console.log(`👤 user ${uid} role in DB:`, role);

    // 3) If only sign‑in is required, return it
    if (!requirePremium) {
      return res.status(200).json({
        isSignedIn: true,
        isPremium:  role === 'premium',
        role
      });
    }

    // 4) Enforce premium
    if (role !== 'premium') {
      console.log("🚫 user is not premium:", role);
      return res.status(403).json({
        isSignedIn: true,
        isPremium:  false,
        error:      'Premium access required'
      });
    }

    // 5) Success
    console.log("✅ user is premium, granting access");
    return res.status(200).json({
      isSignedIn: true,
      isPremium:  true,
      role:       'premium'
    });

  } catch (err) {
    console.error("❌ verify‑google error:", err);
    return res.status(401).json({ error: 'Unauthorized' });
  }
};
