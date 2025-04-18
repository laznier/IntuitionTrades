// pages/api/verify-google.js

import admin from 'firebase-admin'

// Only initialize once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:     process.env.FIREBASE_PROJECT_ID,
      clientEmail:   process.env.FIREBASE_CLIENT_EMAIL,
      // replace literal "\n" with actual line breaks
      privateKey:    process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { token } = req.body
  if (!token) {
    return res.status(400).json({ error: 'Missing ID token' })
  }

  try {
    // Verify the ID token and get the UID
    const decoded = await admin.auth().verifyIdToken(token)
    const uid = decoded.uid

    // Lookup the user's role in RTDB
    const snap = await admin.database().ref(`users/${uid}/role`).once('value')
    const role = snap.val()

    // Return whether they're premium
    return res.status(200).json({ isPremium: role === 'premium' })
  } catch (err) {
    console.error('Error verifying token:', err)
    return res.status(401).json({ error: 'Unauthorized' })
  }
}
