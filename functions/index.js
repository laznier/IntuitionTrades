import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.database();

export const downgradeExpiredTrials = onSchedule(
    "every 1 hours",           // Cron-like schedule expression
    async (event) => {
      const now = Date.now();
      const usersRef = db.ref("users");
      const snap = await usersRef.once("value");
      const updates = {};
  
      snap.forEach(child => {
        const data = child.val();
        // Downgrade if trial expired
        if (
          data.role === "premium" &&
          data.trialStart &&
          now > data.trialStart + 86400000
        ) {
          updates[`${child.key}/role`] = "basic";
        }
        // Downgrade if subscription expired
        if (
          data.role === "premium" &&
          data.subscriptionExpiry &&
          now > data.subscriptionExpiry
        ) {
          updates[`${child.key}/role`] = "basic";
        }
      });
  
      if (Object.keys(updates).length > 0) {
        await usersRef.update(updates);
      }
      return null;
    },
    {
      // Optional v2 options: specify region or time zone
      timeZone: "Etc/UTC",
    }
  );
  