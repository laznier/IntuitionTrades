export default async function handler(req, res) {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }
  
    const { token } = req.body;
    if (typeof token !== "string" || !token) {
      return res.status(400).json({ error: "Invalid or missing token" });
    }
  
    try {
      const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
      const data = await response.json();
  
      // Check if token is valid and the email is verified
      if (!data || !data.email_verified) {
        return res.status(401).json({ authorized: false, error: "Token not valid or email not verified" });
      }
  
      const email = data.email;
      const premiumUsers = ["@yahoo.com"]; // Replace with a dynamic check if needed
  
      if (premiumUsers.includes(email)) {
        return res.status(200).json({ authorized: true });
      } else {
        return res.status(403).json({ authorized: false, error: "Access denied" });
      }
    } catch (error) {
      console.error("Error during token verification:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
  