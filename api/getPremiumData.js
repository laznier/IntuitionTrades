// pages/api/getPremiumData.js (Next.js example)
import { verifyUser } from '../../lib/auth';

export default async function handler(req, res) {
  const user = await verifyUser(req);
  if (!user || !user.isPremium) {
    return res.status(401).json({ error: 'Not authorized' });
  }
  
  // Otherwise, serve premium data
  res.status(200).json({ /* premium data here */ });
}