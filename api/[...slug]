const admin = require("firebase-admin");

// Initialize Firebase Admin once
if (!admin.apps.length) {
  // Use the single Vercel env var FIREBASE_ADMIN_CREDENTIAL for service account
  const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIAL || '{}');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://persuasive-net-456607-g8-default-rtdb.firebaseio.com"
  });
}

const db = admin.database();

module.exports = async (req, res) => {
  const url = req.url.split("?")[0]; // e.g. '/api/downgrade-expired-trials' or '/api/upgradeUser'

  try {
    // Downgrade expired trials: GET /api/downgrade-expired-trials
    if (url === '/api/downgrade-expired-trials' && req.method === 'GET') {
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      const snap = await db
        .ref('users')
        .orderByChild('trialStart')
        .endAt(cutoff)
        .once('value');

      const updates = {};
      snap.forEach(child => {
        const u = child.val();
        if (u.trialUsed && u.role === 'premium') {
          updates[`${child.key}/role`] = 'basic';
        }
      });

      const count = Object.keys(updates).length;
      if (count) {
        await db.ref('users').update(updates);
      }

      return res.status(200).json({ downgraded: count });
    }

    // Upgrade user to premium trial: POST /api/upgradeUser
    if (url === '/api/upgradeUser' && req.method === 'POST') {
      const { idToken } = req.body || {};
      if (!idToken) {
        return res.status(400).json({ error: 'Missing ID token' });
      }

      const decoded = await admin.auth().verifyIdToken(idToken);
      const uid = decoded.uid;

      await db.ref(`users/${uid}`).update({
        role: 'premium',
        trialStart: admin.database.ServerValue.TIMESTAMP,
        trialUsed: true
      });

      return res.status(200).json({ success: true, message: '24 h trial started.' });
    }

    // No matching route
    return res.status(404).json({ error: 'Not Found' });
  } catch (err) {
    console.error('Error in catch-all handler:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
