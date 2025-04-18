// pages/api/verify-google.js
import admin from 'firebase-admin'

if (!admin.apps.length) {
  // your Vercel env var FIREBASE_ADMIN_CREDENTIAL should contain the entire
  // service account JSON as a string.
  const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIAL)

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL:  process.env.FIREBASE_DATABASE_URL
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end('Method Not Allowed')
  }

  const { token } = req.body
  if (!token) {
    return res.status(400).json({ error: 'Missing ID token' })
  }

  try {
    // Verify Firebase ID token
    const decoded = await admin.auth().verifyIdToken(token)
    const uid     = decoded.uid

    // Look up user role in Realtime Database
    const snap = await admin
      .database()
      .ref(`users/${uid}/role`)
      .once('value')

    const role = snap.val()
    return res.status(200).json({ isPremium: role === 'premium' })
  } catch (err) {
    console.error('verify-google error:', err)
    return res.status(401).json({ error: 'Unauthorized' })
  }
}
