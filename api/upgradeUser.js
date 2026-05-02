module.exports = async (req, res) => {
  res.setHeader("Allow", "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  return res.status(410).json({
    error: "Accounts, billing, and premium upgrades have been retired.",
  });
};