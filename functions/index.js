const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onValueWritten } = require("firebase-functions/v2/database");
const { onRequest } = require("firebase-functions/v2/https");
const functions = require("firebase-functions"); // For config only
const admin = require("firebase-admin");
const express = require("express");


// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.database();

// 1️⃣ Scheduled Function
exports.downgradeExpiredTrials = onSchedule(
  {
    schedule: "every 1 hours",
    timeZone: "Etc/UTC",
    region: "us-central1",
    memory: "256MiB",
  },
  async () => {
    const now = Date.now();
    const usersRef = db.ref("users");
    const snap = await usersRef.once("value");
    const updates = {};

    snap.forEach((child) => {
      const data = child.val();
      const uid = child.key;

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
  }
);

// 2️⃣ Stripe Webhook (v2-safe Express with lazy stripe init)
const app = express();

app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    let stripe;
    try {
      const stripeSecret = functions.config().stripe.secret;
      if (!stripeSecret) {
        throw new Error("Stripe secret missing from config");
      }

      stripe = require("stripe")(stripeSecret);
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        functions.config().stripe.webhook_secret
      );
    } catch (err) {
      console.error("⚠️ Webhook signature error:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const sub = event.data.object;
    const uid = sub.metadata.firebaseUid;
    const custRef = db.ref(`customers/${uid}`);

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const newRole = sub.status === "active" ? "premium" : "basic";
        custRef.update({
          stripeRole: newRole,
          subscriptionExpiry: sub.current_period_end * 1000,
        });
        break;
      }

      case "customer.subscription.deleted": {
        custRef.update({ stripeRole: "basic" });
        break;
      }

      default:
        break;
    }

    res.json({ received: true });
  }
);

exports.stripeWebhook = onRequest(
  {
    region: "us-central1",
    memory: "256MiB",
  },
  app
);

// 3️⃣ Realtime DB Trigger via Eventarc (v2)
exports.syncStripeRole = onValueWritten(
  "/customers/{uid}/stripeRole",
  async (event) => {
    const uid = event.params.uid;
    const stripeRole = event.data.after.value;

    if (!stripeRole) return null;

    await db.ref(`users/${uid}`).update({ role: stripeRole });
  }
);

