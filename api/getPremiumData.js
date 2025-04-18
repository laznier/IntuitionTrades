// pages/api/getPremiumData.js
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIAL)
    ),
    databaseURL: "https://persuasive-net-456607-g8-default-rtdb.firebaseio.com"
  });
}

export default async function handler(req, res) {
  // 1) grab Bearer token
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authorized' });
  }

  const idToken = await auth.currentUser.getIdToken();
  const res = await fetch('/api/getPremiumData', {
    headers: {
      'Authorization': `Bearer ${idToken}`
    }
  });
  const { premiumData } = await res.json();
  
  try {
    // 2) verify token & get uid
    const { uid } = await admin.auth().verifyIdToken(idToken);

    // 3) fetch their profile
    const snap = await admin
      .database()
      .ref(`users/${uid}/role`)
      .once('value');
    const role = snap.val();

    // 4) enforce premium
    if (role !== 'premium') {
      return res.status(401).json({ error: 'Premium access required' });
    }

    // 5) serve your premium payload
    const premiumData = {
      /* …whatever this tool needs… */
    };
    return res.status(200).json({ premiumData });
  } catch (e) {
    console.error('Auth error in getPremiumData:', e);
    return res.status(401).json({ error: 'Not authorized' });
  }
}
