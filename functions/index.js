const functions = require("firebase-functions");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.database();

// 🔁 Sync Stripe Role to RTDB
exports.syncStripeRole = require("./syncStripeRole").syncStripeRole;

// ⏰ Downgrade expired trials every hour
exports.downgradeExpiredTrials = onSchedule(
  {
    schedule: "every 1 hours",
    timeZone: "Etc/UTC",
  },
  async () => {
    const now = Date.now();
    const usersRef = db.ref("users");
    const snap = await usersRef.once("value");
    const updates = {};

    snap.forEach((childSnap) => {
      const data = childSnap.val();
      const uid = childSnap.key;

      if (
        data.role === "premium" &&
        data.trialStart &&
        now > data.trialStart + 24 * 60 * 60 * 1000
      ) {
        updates[`${uid}/role`] = "basic";
      }

      if (
        data.role === "premium" &&
        data.subscriptionExpiry &&
        now > data.subscriptionExpiry
      ) {
        updates[`${uid}/role`] = "basic";
      }
    });

    if (Object.keys(updates).length) {
      await usersRef.update(updates);
    }

    return null;
  },
);
