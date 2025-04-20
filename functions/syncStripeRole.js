const {onDocumentWritten} = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

const db = admin.database();

exports.syncStripeRole = onDocumentWritten("customers/{uid}", async (event) => {
  const uid = event.params.uid;

  if (!event.data.after.exists) {
    console.log(`Customer document for ${uid} deleted.`);
    return;
  }

  const data = event.data.after.data();

  if (!data.stripeRole) {
    console.log(`No stripeRole for ${uid}, skipping.`);
    return;
  }

  const userRef = db.ref(`users/${uid}`);
  await userRef.update({role: data.stripeRole});

  console.log(`Synced stripeRole (${data.stripeRole}) for ${uid}`);
});
