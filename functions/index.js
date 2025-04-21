// index.js

// -------------- Imports & Init --------------
// -------------- Imports & Init --------------
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest } = require("firebase-functions/v2/https");
const { onValueWritten, onValueCreated } = require("firebase-functions/v2/database");

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
          (data.trialStart       && now > data.trialStart + 86400000) ||
          (data.subscriptionExpiry && now > data.subscriptionExpiry)
        )
      ) {
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

  // 🔥 Get raw body directly from req.rawBody (works in Gen 2 onRequest)
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("❌ Stripe signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const sub = event.data.object;
  const uid = sub.metadata?.firebaseUid;
  if (!uid) {
    console.error("❌ No Firebase UID in metadata");
    return res.status(400).send("Missing UID");
  }

  const userRef = db.ref(`users/${uid}`);

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscriptionItem = sub.items?.data?.[0];
        const expiry = Number(subscriptionItem?.current_period_end) * 1000;
        
        if (!Number.isFinite(expiry) || expiry <= 0) {
          console.error("❌ Invalid subscription expiry (NaN or missing):", subscriptionItem?.current_period_end);
          return res.status(400).send("Invalid expiry timestamp");
        }        
        
        await db.ref("serviceMarker").set(true); // ✅ temporary rules bypass
await userRef.update({
  role: "premium",
  subscriptionExpiry: expiry
});
await db.ref("serviceMarker").remove(); // ✅ cleanup after write

         
        break;
      }

      case "customer.subscription.deleted":
        await userRef.update({ role: "basic" });
        break;
    }

    res.json({ received: true });
  } catch (err) {
    console.error("❌ Firebase update failed:", err.message);
    res.status(500).send("DB Error");
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

      // ✅ Fetch full session (includes customer ID)
const fullSession = await stripe.checkout.sessions.retrieve(session.id);

// ✅ Save customer ID to database
await db.ref(`customers/${uid}/stripeCustomerId`).set(fullSession.customer);

// Save URL to DB for redirect
await snap.ref.update({ url: session.url });
      
      
    } catch (err) {
      console.error("❌ Stripe session failed:", err);
      await snap.ref.update({ error: { message: err.message } });
    }
    return null;
  }
);
// 5️⃣ Create Billing Portal Session
exports.createBillingPortal = onValueCreated(
  "/customers/{uid}/createPortal",
  async event => {
    const uid = event.params.uid;
    const stripeSecret = process.env.STRIPE_SECRET;
    if (!stripeSecret) return null;

    const stripe = require("stripe")(stripeSecret);
    const customerRootRef = db.ref(`customers/${uid}`);

    // 🔍 Look for most recent checkout session
    const sessionsSnap = await customerRootRef.child("checkout_sessions").once("value");
    const sessions = sessionsSnap.val();

    if (!sessions) {
      console.error("❌ No checkout sessions found for", uid);
      return null;
    }

    // 🧠 Find latest session by timestamp
    const latestSessionId = Object.keys(sessions)
      .map(k => ({ id: k, timestamp: sessions[k]?.created || 0 }))
      .sort((a, b) => b.timestamp - a.timestamp)[0]?.id;

    if (!latestSessionId) {
      console.error("❌ Could not determine latest session for", uid);
      return null;
    }

    const latestSessionRef = customerRootRef.child(`checkout_sessions/${latestSessionId}`);
    const sessionSnap = await latestSessionRef.once("value");
    const sessionData = sessionSnap.val();

    const stripeCustomerId = sessionData?.customer;
    if (!stripeCustomerId) {
      console.error("❌ No customer ID found in session", latestSessionId);
      return null;
    }

    try {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: "https://www.intuitiontrades.com/manage.html"
      });

      await customerRootRef.child("portal_url").set(portalSession.url);
    } catch (err) {
      console.error("❌ Failed to create billing portal session:", err);
    }

    return null;
  }
);

