// index.js

// -------------- Imports & Init --------------
const { onSchedule }                         = require("firebase-functions/v2/scheduler");
const { onRequest }                          = require("firebase-functions/v2/https");
const { onValueWritten, onValueCreated }     = require("firebase-functions/v2/database");
const admin                                  = require("firebase-admin");
const express                                = require("express");

// Initialize Admin SDK
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
const app = express();
app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const stripeSecret  = process.env.STRIPE_SECRET;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!stripeSecret || !webhookSecret) {
      console.error("❌ Missing STRIPE_SECRET or STRIPE_WEBHOOK_SECRET env vars");
      return res.status(500).send("Configuration error");
    }
    const stripe = require("stripe")(stripeSecret);

    const sig = req.headers["stripe-signature"];
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        webhookSecret
      );
    } catch (err) {
      console.error("❌ Webhook signature error:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const sub     = event.data.object;
    const uid     = sub.metadata.firebaseUid;
    const custRef = db.ref(`customers/${uid}`);

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        custRef.update({
          stripeRole:        sub.status === "active" ? "premium" : "basic",
          subscriptionExpiry: sub.current_period_end * 1000
        });
        break;
      case "customer.subscription.deleted":
        custRef.update({ stripeRole: "basic" });
        break;
      default:
        break;
    }

    res.json({ received: true });
  }
);
exports.stripeWebhook = onRequest({ region: "us-central1", memory: "256MiB" }, app);


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
        metadata:             { firebaseUid: uid },
      });
      await snap.ref.update({ url: session.url });
    } catch (err) {
      console.error("❌ Stripe session failed:", err);
      await snap.ref.update({ error: { message: err.message } });
    }
    return null;
  }
);
