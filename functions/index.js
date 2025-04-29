// index.js

// -------------------- Imports & Initialization --------------------
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
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

      // Write the session URL back
      await snap.ref.update({ url: session.url });

      // ✅ If customer ID is already available, store it
      if (session.customer) {
        await db.ref(`customers/${uid}/stripeCustomerId`).set(session.customer);
        console.log(`✅ Wrote customer ID (${session.customer}) for UID: ${uid}`);
      } else {
        console.log(`ℹ️ Session created, but customer ID not yet available. Will be handled in webhook.`);
      }

    } catch (err) {
      console.error("❌ Stripe session failed:", err);
      await snap.ref.update({ error: { message: err.message } });
    }

    return null;
  }
);

// 5️⃣ Create Backup Checkout Session (Callable)
exports.createBackupCheckoutSession = onCall(
  { region: "us-central1" },
  async (req) => {
    const { data, auth } = req;
    const price       = data.price;
    const success_url = data.success_url;
    const cancel_url  = data.cancel_url;

    // 1. Require auth
    if (!auth || !auth.uid) {
      // v2 onCall: throw an HttpsError
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in to subscribe."
      );
    }
    const uid = auth.uid;

    // 2. Load Stripe
    const stripeSecret = process.env.STRIPE_SECRET;
    if (!stripeSecret) {
      throw new HttpsError(
        "failed-precondition",
        "Stripe secret key not configured."
      );
    }
    const stripe = stripeLib(stripeSecret);

    try {
      // 3. Create checkout session
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price, quantity: 1 }],
        success_url,
        cancel_url,
        subscription_data: {
          metadata: { firebaseUid: uid }
        },
      });

      return { url: session.url };
    } catch (err) {
      console.error("❌ Backup session error:", err);
      throw new HttpsError("internal", err.message);
    }
  }
);
// 6️⃣ Check Usage Count and Role (Callable)
exports.checkUsageLimit = onCall(
  { region: "us-central1" },
  async (req) => {
    const { auth } = req;

    if (!auth || !auth.uid) {
      throw new HttpsError("unauthenticated", "User must be signed in.");
    }

    const uid = auth.uid;
    const userSnap = await db.ref(`users/${uid}/role`).once("value");
    const role = userSnap.exists() ? userSnap.val() : null;

    // If user is real ("basic" or "premium") → allow unlimited access
    if (role === "basic" || role === "premium") {
      return { allowed: true };
    }

    // Else, anonymous guest → check usage
    const usageSnap = await db.ref(`usageCounts/${uid}/count`).once("value");
    const usageCount = usageSnap.exists() ? usageSnap.val() : 0;

    if (usageCount >= 10) {
      return { allowed: false }; // ❌ Exceeded
    }

    // Otherwise still allowed
    return { allowed: true };
  }
);
/******************************************************************
 * 7️⃣  Purge ALL anonymous Auth accounts  +  truncate usageCounts/
 ******************************************************************/

/* --------------- helper --------------------------------------- */
async function purgeAnonymousAndUsage() {
  const auth   = admin.auth();
  const PAGE   = 1000;          // listUsers page size
  let   next   = undefined;
  let   stats  = { scanned: 0, deleted: 0 };

  do {
    const page = await auth.listUsers(PAGE, next);
    next       = page.pageToken || undefined;
    stats.scanned += page.users.length;

    // “(anonymous)” ⇒ providerData = []
    const anon = page.users.filter(u => u.providerData.length === 0);
    if (anon.length === 0) continue;

    // delete accounts in parallel (ignore 404 just in case)
    await Promise.all(
      anon.map(u => auth.deleteUser(u.uid).catch(() => null))
    );
    stats.deleted += anon.length;
  } while (next);

  /* Wipe the whole usageCounts subtree */
  await db.ref("usageCounts").remove().catch(() => null);

  console.log(`🧹 purge finished – scanned ${stats.scanned}, deleted ${stats.deleted}, usageCounts branch removed`);
  return stats;
}

/* --------------- scheduled every 10 minutes ------------------- */
exports.purgeAnonymousEvery10min = onSchedule(
  {
    schedule : "every 10 minutes",
    timeZone : "Etc/UTC",
    region   : "us-central1",
    memory   : "256MiB",
  },
  () => purgeAnonymousAndUsage()
);
