// functions/index.js
// functions/index.js
const functions = require('firebase-functions');
const admin     = require('firebase‑admin');

admin.initializeApp();   // ← now defined again
const db = admin.database();




exports.downgradeExpiredTrials = functions
  .pubsub
  .schedule('every 1 hours')
  .timeZone('Etc/UTC')
  .onRun(async (context) => {
    const now      = Date.now();
    const usersRef = db.ref('users');
    const snap     = await usersRef.once('value');
    const updates  = {};

    snap.forEach(childSnap => {
      const data = childSnap.val();
      const uid  = childSnap.key;

      // if they were on trial and 24h passed, downgrade
      if (
        data.role === 'premium' &&
        data.trialStart &&
        now > data.trialStart + 24 * 60 * 60 * 1000
      ) {
        updates[`${uid}/role`] = 'basic';
      }

      // if they had a paid subscription that’s now past expiry, downgrade
      if (
        data.role === 'premium' &&
        data.subscriptionExpiry &&
        now > data.subscriptionExpiry
      ) {
        updates[`${uid}/role`] = 'basic';
      }
    });

    if (Object.keys(updates).length) {
      await usersRef.update(updates);
    }

    return null;
  });
