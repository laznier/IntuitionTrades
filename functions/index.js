const RETIRED_MESSAGE = "Accounts, billing, subscriptions, and usage-gating have been retired.";

function createRetiredError() {
  const error = new Error(RETIRED_MESSAGE);
  error.code = "failed-precondition";
  return error;
}

async function retiredScheduler(name) {
  console.info(`${name} skipped: legacy account automation is retired.`);
  return null;
}

async function retiredHttpHandler(_req, res) {
  if (res && typeof res.status === "function") {
    return res.status(410).json({ error: RETIRED_MESSAGE });
  }

  return {
    status: 410,
    error: RETIRED_MESSAGE,
  };
}

exports.retiredMetadata = {
  accounts: false,
  billing: false,
  subscriptions: false,
  payments: false,
  provider: "retired",
};

exports.downgradeExpiredTrials = async () => retiredScheduler("downgradeExpiredTrials");

exports.stripeWebhook = retiredHttpHandler;

exports.createBackupCheckoutSession = async () => {
  throw createRetiredError();
};

exports.checkUsageLimit = async () => ({
  allowed: true,
  retired: true,
  message: RETIRED_MESSAGE,
});

exports.purgeAnonymousEvery24hours = async () =>
  retiredScheduler("purgeAnonymousEvery24hours");
