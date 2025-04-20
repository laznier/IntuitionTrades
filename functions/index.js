// functions/index.js

// 1) Use the v2 SDK for Pub/Sub scheduling:
const { pubsub } = require('firebase-functions/v2');
const admin     = require('firebase-admin');

admin.initializeApp();

// 2) Run every hour (you can tweak the interval as you like)
exports.downgradeExpiredTrials = pubsub
  .schedule('every 1 hours')
  .onRun(async (context) => {
    const db      = admin.database();
    const now     = Date.now();
    const usersRef= db.ref('users');
    const snap    = await usersRef.once('value');

    const updates = {};
    snap.forEach(child => {
      const u = child.val();
      // if role is premium but trialStart + 24h is past
      if (
        u.role === 'premium' &&
        typeof u.trialStart === 'number' &&
        u.trialStart + 86400000 <= now
      ) {
        updates[child.key + '/role'] = 'basic';
      }
    });

    if (Object.keys(updates).length) {
      await usersRef.update(updates);
      console.log(`Downgraded ${Object.keys(updates).length} users back to basic.`);
    } else {
      console.log('No expired trials to downgrade.');
    }
  });
