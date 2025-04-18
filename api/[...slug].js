// pages/api/[...slug].js

import admin from 'firebase-admin'

// Initialize Firebase Admin only once
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIAL)
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://persuasive-net-456607-g8-default-rtdb.firebaseio.com"
  })
}
const db = admin.database()

export default async function handler(req, res) {
  // slug will be like 'verify-google', 'upgradeUser', etc.
  const slug = Array.isArray(req.query.slug)
    ? req.query.slug[0]
    : req.query.slug

  try {
    // 1) POST /api/verify-google
    if (slug === 'verify-google' && req.method === 'POST') {
      const { token } = req.body || {}
      if (!token) {
        return res.status(400).json({ error: 'Missing ID token' })
      }
      const decoded = await admin.auth().verifyIdToken(token)
      const uid = decoded.uid
      const snap = await db.ref(`users/${uid}/role`).once('value')
      return res.status(200).json({ isPremium: snap.val() === 'premium' })
    }

    // 2) GET /api/downgrade-expired-trials
    if (slug === 'downgrade-expired-trials' && req.method === 'GET') {
      const cutoff = Date.now() - 24 * 60 * 60 * 1000
      const snap = await db
        .ref('users')
        .orderByChild('trialStart')
        .endAt(cutoff)
        .once('value')

      const updates = {}
      snap.forEach(child => {
        const u = child.val()
        if (u.trialUsed && u.role === 'premium') {
          updates[`${child.key}/role`] = 'basic'
        }
      })

      const count = Object.keys(updates).length
      if (count) {
        await db.ref('users').update(updates)
      }
      return res.status(200).json({ downgraded: count })
    }

    // 3) POST /api/upgradeUser
    if (slug === 'upgradeUser' && req.method === 'POST') {
      const { idToken } = req.body || {}
      if (!idToken) {
        return res.status(400).json({ error: 'Missing ID token' })
      }
      const decoded = await admin.auth().verifyIdToken(idToken)
      const uid = decoded.uid
      await db.ref(`users/${uid}`).update({
        role:       'premium',
        trialStart: admin.database.ServerValue.TIMESTAMP,
        trialUsed:  true
      })
      return res
        .status(200)
        .json({ success: true, message: '24 h trial started.' })
    }

    // 4) GET /api/getPremiumData
    if (slug === 'getPremiumData' && req.method === 'GET') {
      // 4.1) Grab Bearer token
      const authHeader = req.headers.authorization || ''
      if (!authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Not authorized' })
      }
      const idToken = authHeader.split(' ')[1]

      // 4.2) Verify
      const decoded = await admin.auth().verifyIdToken(idToken)
      const uid = decoded.uid

      // 4.3) Check role
      const snap = await db.ref(`users/${uid}/role`).once('value')
      if (snap.val() !== 'premium') {
        return res.status(401).json({ error: 'Premium access required' })
      }

      // 4.4) Return your premium payload
      const premiumData = {
        // … your premium tool’s data here …
      }
      return res.status(200).json({ premiumData })
    }

    // Nothing matched
    return res.status(404).json({ error: 'Not Found' })
  } catch (err) {
    console.error('API error:', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}
