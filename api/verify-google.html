import fs from "fs";
import path from "path";

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
      return res
        .status(401)
        .json({ authorized: false, error: "Token not valid or email not verified" });
    }

    // Normalize the email: trim any whitespace and convert to lowercase
    const email = data.email.trim().toLowerCase();

    // Read the local premium.txt file for the list of premium users.
    // Make sure premium.txt is located at the project root (or adjust the path accordingly).
    const filePath = path.join(process.cwd(), "premium.txt");
    const fileContents = fs.readFileSync(filePath, "utf8");

    // Create a list of normalized premium emails
    const premiumUsers = fileContents
      .split("\n")
      .map(user => user.trim().toLowerCase())
      .filter(Boolean); // remove any empty lines

    // Check if the normalized email exists in the premium users list.
    const isPremium = premiumUsers.includes(email);

    // Return authorized true along with isPremium status
    return res.status(200).json({ authorized: true, isPremium });
  } catch (error) {
    console.error("Error during token verification:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
