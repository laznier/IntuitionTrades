// api/verify‑google.js
const admin = require('firebase-admin')

if (!admin.apps.length) {
  const svc = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIAL)
  admin.initializeApp({
    credential: admin.credential.cert(svc),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  })
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end('Method Not Allowed')
  }

  const { token, requirePremium = false } = req.body || {}
  if (!token) {
    return res.status(400).json({ error: 'Missing ID token' })
  }

  try {
    // 1) verify token
    const { uid } = await admin.auth().verifyIdToken(token)

    // 2) look up role
    const snap = await admin.database().ref(`users/${uid}/role`).once('value')
    const role = snap.val() || 'basic'

    // 3) if they only need to be signed in, return their role
    if (!requirePremium) {
      return res.status(200).json({
        isSignedIn: true,
        isPremium: role === 'premium',
        role
      })
    }

    // 4) enforce premium
    if (role !== 'premium') {
      return res.status(403).json({
        isSignedIn: true,
        isPremium: false,
        error: 'Premium access required'
      })
    }

    // 5) success
    return res.status(200).json({
      isSignedIn: true,
      isPremium: true,
      role: 'premium'
    })

  } catch (err) {
    console.error('verify‑google error:', err)
    return res.status(401).json({ error: 'Unauthorized' })
  }
}
