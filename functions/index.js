// index.js

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");

const RETIRED_MESSAGE = "Accounts, billing, subscriptions, and usage-gating have been retired.";

exports.downgradeExpiredTrials = onSchedule(
  {
    schedule: "every 24 hours",
    timeZone: "Etc/UTC",
    region: "us-central1",
    memory: "256MiB",
  },
  async () => {
    console.info("downgradeExpiredTrials skipped: account system retired.");
    return null;
  }
);

exports.stripeWebhook = onRequest({ region: "us-central1" }, async (_req, res) => {
  return res.status(410).json({ error: RETIRED_MESSAGE });
});

exports.createBackupCheckoutSession = onCall({ region: "us-central1" }, async () => {
  throw new HttpsError("failed-precondition", RETIRED_MESSAGE);
});

exports.checkUsageLimit = onCall({ region: "us-central1" }, async () => {
  return {
    allowed: true,
    retired: true,
    message: RETIRED_MESSAGE,
  };
});

exports.purgeAnonymousEvery24hours = onSchedule(
  {
    schedule: "every 24 hours",
    timeZone: "Etc/UTC",
    region: "us-central1",
    memory: "256MiB",
  },
  async () => {
    console.info("purgeAnonymousEvery24hours skipped: anonymous account storage retired.");
    return null;
  }
);
