// functions/index.js

const functions = require("firebase-functions");
const admin     = require("firebase-admin");
admin.initializeApp();

// every hour, check for expired trials
exports.downgradeExpiredTrials = functions.pubsub
  .schedule("every 60 minutes")
  .onRun(async (_context) => {
    const db   = admin.database();
    const now  = Date.now();
    const usersSnap = await db.ref("users").once("value");
    const updates   = {};

    usersSnap.forEach(userSnap => {
      const u = userSnap.val();
      // if they used a trial, are still marked 'premium', and 24h has passed:
      if (
        u.trialUsed === true &&
        u.role === "premium" &&
        typeof u.trialStart === "number" &&
        u.trialStart + 24 * 3600 * 1000 <= now
      ) {
        updates[`${userSnap.key}/role`] = "basic";
      }
    });

    if (Object.keys(updates).length) {
      await db.ref("users").update(updates);
      console.log(
        `Downgraded ${Object.keys(updates).length} user(s) from premium→basic.`
      );
    } else {
      console.log("No expired trials at this time.");
    }
    return null;
  });
