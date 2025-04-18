// pages/api/verify-google.js
import admin from 'firebase-admin'

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIAL)
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end('Method Not Allowed')
  }

  const { token, requirePremium = false } = req.body
  if (!token) {
    return res.status(400).json({ error: 'Missing ID token' })
  }

  try {
    // 1) Verify the Firebase ID token
    const decoded = await admin.auth().verifyIdToken(token)
    const uid = decoded.uid

    // 2) If they only need to be signed in, we’re done:
    if (!requirePremium) {
      // (optional) fetch their role so the client can show “Upgrade” if needed
      const snap = await admin.database().ref(`users/${uid}/role`).once('value')
      const role = snap.val() || 'basic'
      return res.status(200).json({
        isSignedIn: true,
        isPremium: role === 'premium',
        role
      })
    }

    // 3) Otherwise enforce premium access
    const snap = await admin.database().ref(`users/${uid}/role`).once('value')
    const role = snap.val()
    if (role !== 'premium') {
      return res.status(403).json({
        isSignedIn: true,
        isPremium: false,
        error: 'Premium access required'
      })
    }

    // 4) All good: they’re premium
    return res.status(200).json({
      isSignedIn: true,
      isPremium: true,
      role: 'premium'
    })

  } catch (err) {
    console.error('verify-google error:', err)
    return res.status(401).json({ error: 'Unauthorized' })
  }
}
