const jwt = require("jsonwebtoken");

module.exports = function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Please log in first." });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.merchant = { id: payload.id, email: payload.email };
    next();
  } catch {
    return res.status(401).json({ error: "Session expired. Please log in again." });
  }
};
