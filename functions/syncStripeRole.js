const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.database();

/**
 * Syncs Firestore `stripeRole` to Realtime Database `users/{uid}/role`
 */
exports.syncStripeRole = functions.firestore
  .document("customers/{uid}")
  .onWrite(async (change, context) => {
    const uid = context.params.uid;

    // Safely get the latest stripeRole
    const afterData = change.after.exists ? change.after.data() : null;
    const stripeRole = afterData?.stripeRole;

    if (!stripeRole) {
      console.log(`⚠️ No stripeRole found for ${uid}, setting to 'basic'.`);
      // Default to "basic" if stripeRole is missing
      await db.ref(`users/${uid}`).update({ role: "basic" });
      return null;
    }

    try {
      await db.ref(`users/${uid}`).update({ role: stripeRole });
      console.log(`✅ Synced stripeRole (${stripeRole}) to RTDB for user ${uid}`);
    } catch (error) {
      console.error(`❌ Error syncing stripeRole for user ${uid}:`, error);
    }

    return null;
  });
