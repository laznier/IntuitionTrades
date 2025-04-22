// index.js

// -------------------- Imports & Initialization --------------------
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest, onCall } = require("firebase-functions/v2/https");
const { onValueWritten, onValueCreated } = require("firebase-functions/v2/database");
const functions = require("firebase-functions");

const admin = require("firebase-admin");
const stripeLib = require("stripe");

admin.initializeApp();
const db = admin.database();





// 1️⃣ Scheduled downgradeExpiredTrials
exports.downgradeExpiredTrials = onSchedule(
  {
    schedule:   "every 1 hours",
    timeZone:   "Etc/UTC",
    region:     "us-central1",
    memory:     "256MiB",
  },
  async () => {
    const now      = Date.now();
    const usersRef = db.ref("users");
    const snap     = await usersRef.once("value");
    const updates  = {};

    snap.forEach(child => {
      const data = child.val(), uid = child.key;
      if (
        data.role === "premium" &&
        (
          // Scenario A: subscription expired and trial expired or never existed
          (data.subscriptionExpiry && now > data.subscriptionExpiry &&
           (!data.trialStart || now > data.trialStart + 86400000))
          
          ||
      
          // Scenario B: never subscribed, but trial expired
          (!data.subscriptionExpiry &&
           data.trialStart &&
           now > data.trialStart + 86400000)
        )
      )
       {
        updates[`${uid}/role`] = "basic";
      }
      
    });

    if (Object.keys(updates).length) {
      await usersRef.update(updates);
    }
    return null;
  }
);


// 2️⃣ Stripe Webhook via Express
exports.stripeWebhook = onRequest({ region: "us-central1" }, async (req, res) => {
  const stripeSecret = process.env.STRIPE_SECRET;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecret || !webhookSecret) {
    console.error("❌ Missing Stripe env vars");
    return res.status(500).send("Missing Stripe configuration");
  }

  const stripe = stripeLib(stripeSecret);
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("❌ Stripe signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const eventType = event.type;
  const object = event.data.object;
  const uid = object.metadata?.firebaseUid;

  const userRef = uid ? db.ref(`users/${uid}`) : null;

  try {
    switch (eventType) {

      // ✅ New: store Stripe customer ID for later use
      case "checkout.session.completed": {
        const customerId = object.customer;
        const sessionUid = object.metadata?.firebaseUid;

        if (sessionUid && customerId) {
          await db.ref(`customers/${sessionUid}/stripeCustomerId`).set(customerId);
          console.log(`✅ Stored Stripe customer ID (${customerId}) for UID: ${sessionUid}`);
        } else {
          console.error("❌ Missing firebaseUid or customer ID in checkout.session.completed");
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        if (!uid || !userRef) {
          console.error("❌ UID missing for subscription update");
          return res.status(400).send("Missing UID");
        }

        const subscriptionItem = object.items?.data?.[0];
        const expiry = Number(subscriptionItem?.current_period_end) * 1000;

        if (!Number.isFinite(expiry) || expiry <= 0) {
          console.error("❌ Invalid subscription expiry timestamp");
          return res.status(400).send("Invalid expiry");
        }

        await db.ref("serviceMarker").set(true); // ✅ bypass rules
        await userRef.update({
          role: "premium",
          subscriptionExpiry: expiry
        });
        await db.ref("serviceMarker").remove(); // ✅ cleanup
        break;
      }

      case "customer.subscription.deleted": {
        if (uid && userRef) {
          await userRef.update({ role: "basic" });
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error("❌ Webhook processing error:", err.message);
    res.status(500).send("Internal Error");
  }
});



// 3️⃣ Sync stripeRole → users.role
exports.syncStripeRole = onValueWritten(
  "/customers/{uid}/stripeRole",
  async event => {
    const newRole = event.data.after.val();
    if (!newRole) return null;
    const uid = event.params.uid;
    await db.ref(`users/${uid}`).update({ role: newRole });
    return null;
  }
);


// 4️⃣ Create Checkout Session on new child (v2)
exports.createCheckoutSession = onValueCreated(
  "/customers/{uid}/checkout_sessions/{sessionId}",
  async event => {
    const snap = event.data;      // the new DataSnapshot
    const data = snap.val();
    const uid  = event.params.uid;

    if (!data?.price || !data?.success_url || !data?.cancel_url) {
      console.error("❌ Invalid payload:", data);
      return null;
    }

    const stripeSecret = process.env.STRIPE_SECRET;
    if (!stripeSecret) {
      console.error("❌ Missing STRIPE_SECRET env var");
      await snap.ref.update({ error: { message: "Configuration error" } });
      return null;
    }
    const stripe = require("stripe")(stripeSecret);

    try {
      const session = await stripe.checkout.sessions.create({
        mode:                 "subscription",
        payment_method_types: ["card"],
        line_items:           [{ price: data.price, quantity: 1 }],
        success_url:          data.success_url,
        cancel_url:           data.cancel_url,
        subscription_data: {
          metadata: { firebaseUid: uid }
        },
      });
      await snap.ref.update({ url: session.url });
    } catch (err) {
      console.error("❌ Stripe session failed:", err);
      await snap.ref.update({ error: { message: err.message } });
    }
    return null;
  }
);
// 5️⃣ Create Billing Portal Session (Callable)
exports.getBillingPortalUrl = onCall({ region: "us-central1" }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new functions.https.HttpsError("unauthenticated", "You must be signed in.");
  }

  const stripeSecret = process.env.STRIPE_SECRET;
  if (!stripeSecret) {
    console.error("❌ STRIPE_SECRET is not set.");
    throw new functions.https.HttpsError("internal", "Stripe secret is missing.");
  }

  const stripe = stripeLib(stripeSecret);
  const db = admin.database();

  const customerSnap = await db.ref(`customers/${uid}/stripeCustomerId`).once("value");
  const customerId = customerSnap.val();

  if (!customerId) {
    console.error(`❌ No Stripe customer ID found for UID: ${uid}`);
    throw new functions.https.HttpsError("not-found", "Stripe customer ID not found.");
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: "https://www.intuitiontrades.com/manage.html"
    });

    console.log(`✅ Billing portal session created for UID: ${uid}`);
    return { url: session.url };
  } catch (err) {
    console.error("❌ Stripe session creation failed:", err.message);
    throw new functions.https.HttpsError("internal", "Stripe session creation failed.");
  }
});


// 6️⃣ Repair Missing Stripe Data (Scheduled)
exports.repairSubscriptionSync = onSchedule(
  {
    schedule: "every 3 hours",
    timeZone: "Etc/UTC",
    region: "us-central1",
    memory: "256MiB",
  },
  async () => {
    const stripeSecret = process.env.STRIPE_SECRET;
    if (!stripeSecret) {
      console.error("❌ STRIPE_SECRET not found in environment");
      return null;
    }

    const stripe = stripeLib(stripeSecret);
    const customerSnap = await db.ref("customers").once("value");
    const customers = customerSnap.val() || {};
    const updates = {};

    for (const uid in customers) {
      const stripeId = customers[uid]?.stripeCustomerId;
      if (!stripeId) continue;

      try {
        const subs = await stripe.subscriptions.list({
          customer: stripeId,
          status: "all",
          limit: 1,
        });

        const sub = subs.data[0];
        if (!sub) continue;

        const expiry = sub.current_period_end * 1000;
        const role = sub.status === "active" ? "premium" : "basic";

        updates[`users/${uid}/role`] = role;
        updates[`users/${uid}/subscriptionExpiry`] = expiry;
        updates[`customers/${uid}/stripeRole`] = role;

        console.log(`🔁 Synced UID: ${uid} → ${role} (expires: ${new Date(expiry).toISOString()})`);
      } catch (err) {
        console.error(`❌ Failed to sync UID: ${uid} →`, err.message);
      }
    }

    if (Object.keys(updates).length) {
      await db.ref().update(updates);
      console.log("✅ Repaired subscriptions for", Object.keys(updates).length / 3, "users");
    } else {
      console.log("⚠️ No updates made.");
    }

    return null;
  }
);

