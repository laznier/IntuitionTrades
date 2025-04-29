import { getDatabase } from "firebase-admin/database";
import { initializeApp, cert } from "firebase-admin/app";

// Only initialize once
const app = initializeApp({
  credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  try {
    const { uid, message } = req.body;
    if (!uid || !message) {
      return res.status(400).send("Missing uid or message");
    }

    const db = getDatabase(app);
    const logRef = db.ref(`/logs/${uid}`).push();

    await logRef.set({
      message,
      timestamp: Date.now()
    });

    return res.status(200).send("Log saved");
  } catch (error) {
    console.error("Error saving log:", error);
    return res.status(500).send("Internal Server Error");
  }
}
