import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

let auth, db;

try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIAL);
  const databaseURL = process.env.FIREBASE_DATABASE_URL;

  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccount),
      databaseURL,
    });
  }

  auth = getAuth();
  db = getFirestore();
} catch (err) {
  console.error("🔥 Firebase Admin Init Error:", err.message);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { token, requirePremium } = req.body;

  if (!token) {
    return res.status(400).json({ error: "Missing token" });
  }

  try {
    if (!auth || !db) {
      throw new Error("Firebase Admin SDK failed to initialize.");
    }

    const decoded = await auth.verifyIdToken(token);
    const uid = decoded.uid;

    const userRef = db.collection("users").doc(uid);
    const doc = await userRef.get();

    if (!doc.exists) {
      return res.status(403).json({ error: "User record not found" });
    }

    const user = doc.data();

    if (requirePremium && user.role !== "premium") {
      return res.status(402).json({ error: "Premium access required" });
    }

    return res.status(200).json({ message: "Access granted", uid });
  } catch (error) {
    console.error("verify-google error:", error);
    return res.status(401).json({ error: "Unauthorized", details: error.message });
  }
}
