const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
router.post("/register", async (req, res, next) => {
  try {
    const { businessName, ownerName, email, password } = req.body;
    if (![businessName, ownerName, email, password].every(v => typeof v === "string" && v.trim())) {
      return res.status(400).json({ error: "All fields are required." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
      return res.status(400).json({ error: "Enter a valid email and a password of at least 8 characters." });
    }
    const hash = await bcrypt.hash(password, 12);
    const result = await req.app.locals.pool.query(
      `INSERT INTO merchants (business_name, owner_name, email, password_hash)
       VALUES ($1, $2, LOWER($3), $4)
       RETURNING id, business_name, owner_name, email`,
      [businessName.trim(), ownerName.trim(), email.trim(), hash]
    );
    const merchant = result.rows[0];
    const token = jwt.sign({ id: merchant.id, email: merchant.email }, process.env.JWT_SECRET, { expiresIn: "8h" });
    res.status(201).json({ token, merchant });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "An account with this email already exists." });
    next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required." });
    const result = await req.app.locals.pool.query(
      "SELECT id, business_name, owner_name, email, password_hash FROM merchants WHERE email = LOWER($1)",
      [email.trim()]
    );
    const merchant = result.rows[0];
    if (!merchant || !(await bcrypt.compare(password, merchant.password_hash))) {
      return res.status(401).json({ error: "Invalid email or password." });
    }
    const token = jwt.sign({ id: merchant.id, email: merchant.email }, process.env.JWT_SECRET, { expiresIn: "8h" });
    delete merchant.password_hash;
    res.json({ token, merchant });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
