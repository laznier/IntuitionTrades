const compatibilityAuth = {
  currentUser: null,
  accountsEnabled: false,
};

function getAuth() {
  return compatibilityAuth;
}

async function signInAnonymously() {
  return { user: null };
}

function onAuthStateChanged(_auth, callback) {
  if (typeof callback === "function") {
    callback(null);
  }

  return () => {};
}

window.authGateState = {
  accountsEnabled: false,
  billingEnabled: false,
};
window.firebaseAuth = compatibilityAuth;
window.signInAnonymously = signInAnonymously;
window.app = { legacyAuthDisabled: true };
window.getAuth = getAuth;
window.onAuthStateChanged = onAuthStateChanged;

console.info("Legacy auth gate disabled: pages now run without Firebase sign-in or usage gating.");
