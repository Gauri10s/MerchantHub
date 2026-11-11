const router = require("express").Router();
const authenticate = require("../middleware/auth");
const { makeCode, parseAmountToPaise } = require("../utils/format");

// Public demo checkout endpoints intentionally do not require a merchant session.
router.use((req, res, next) => {
  if (req.path.startsWith("/public/checkout/")) return next();
  return authenticate(req, res, next);
});

router.get("/me", async (req, res, next) => {
  try {
    const r = await req.app.locals.pool.query(
      "SELECT id, business_name, owner_name, email, created_at FROM merchants WHERE id = $1",
      [req.merchant.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: "Merchant not found." });
    res.json({ merchant: r.rows[0] });
  } catch (e) { next(e); }
});

router.post("/payments", async (req, res, next) => {
  const { customerName, customerEmail = "", description, amount } = req.body;
  const amountPaise = parseAmountToPaise(amount);
  if (!customerName?.trim() || !description?.trim() || !amountPaise) {
    return res.status(400).json({ error: "Enter a customer name, description and a valid amount." });
  }
  const key = req.get("Idempotency-Key") || req.body.idempotencyKey || null;

  try {
    if (key) {
      const existing = await req.app.locals.pool.query(
        "SELECT * FROM payments WHERE merchant_id = $1 AND idempotency_key = $2",
        [req.merchant.id, key]
      );
      if (existing.rows[0]) return res.status(200).json({ payment: existing.rows[0], reused: true });
    }
    const result = await req.app.locals.pool.query(
      `INSERT INTO payments
       (merchant_id, payment_code, customer_name, customer_email, description, amount_paise, idempotency_key)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.merchant.id, makeCode("PAY"), customerName.trim(), customerEmail.trim(), description.trim(), amountPaise, key]
    );
    res.status(201).json({ payment: result.rows[0], checkoutUrl: `/checkout.html?code=${result.rows[0].payment_code}` });
  } catch (e) {
    if (e.code === "23505" && key) {
      const existing = await req.app.locals.pool.query(
        "SELECT * FROM payments WHERE merchant_id = $1 AND idempotency_key = $2",
        [req.merchant.id, key]
      );
      if (existing.rows[0]) return res.status(200).json({ payment: existing.rows[0], reused: true });
    }
    next(e);
  }
});

router.get("/payments", async (req, res, next) => {
  try {
    const { search = "", status = "", page = "1", limit = "10" } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * pageSize;
    const params = [req.merchant.id, `%${String(search).slice(0, 80)}%`];
    let statusSql = "";
    if (["PENDING", "SUCCESS", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"].includes(status)) {
      params.push(status);
      statusSql = ` AND status = $${params.length}`;
    }
    const count = await req.app.locals.pool.query(
      `SELECT COUNT(*)::int AS total FROM payments
       WHERE merchant_id = $1 AND (payment_code ILIKE $2 OR customer_name ILIKE $2 OR description ILIKE $2)${statusSql}`,
      params
    );
    const data = await req.app.locals.pool.query(
      `SELECT p.*, COALESCE((SELECT SUM(r.amount_paise) FROM refunds r WHERE r.payment_id=p.id),0)::bigint AS refunded_paise
       FROM payments p WHERE p.merchant_id = $1
       AND (p.payment_code ILIKE $2 OR p.customer_name ILIKE $2 OR p.description ILIKE $2)${statusSql}
       ORDER BY p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, offset]
    );
    res.json({ payments: data.rows, total: count.rows[0].total, page: pageNum, pages: Math.max(1, Math.ceil(count.rows[0].total / pageSize)) });
  } catch (e) { next(e); }
});

router.get("/payments/:code", async (req, res, next) => {
  try {
    const r = await req.app.locals.pool.query(
      `SELECT p.*, COALESCE((SELECT SUM(r.amount_paise) FROM refunds r WHERE r.payment_id=p.id),0)::bigint AS refunded_paise
       FROM payments p WHERE p.payment_code=$1 AND p.merchant_id=$2`,
      [req.params.code, req.merchant.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: "Payment not found." });
    res.json({ payment: r.rows[0] });
  } catch (e) { next(e); }
});

// Public demo checkout: no real card data is collected or processed.
router.get("/public/checkout/:code", async (req, res, next) => {
  try {
    const r = await req.app.locals.pool.query(
      `SELECT payment_code, customer_name, description, amount_paise, status
       FROM payments WHERE payment_code=$1`,
      [req.params.code]
    );
    if (!r.rows[0]) return res.status(404).json({ error: "Payment link not found." });
    res.json({ payment: r.rows[0] });
  } catch (e) { next(e); }
});

router.post("/public/checkout/:code/pay", async (req, res, next) => {
  const client = await req.app.locals.pool.connect();
  try {
    await client.query("BEGIN");
    const found = await client.query("SELECT * FROM payments WHERE payment_code=$1 FOR UPDATE", [req.params.code]);
    const payment = found.rows[0];
    if (!payment) { await client.query("ROLLBACK"); return res.status(404).json({ error: "Payment link not found." }); }
    if (payment.status !== "PENDING") { await client.query("ROLLBACK"); return res.status(409).json({ error: "This payment link has already been used." }); }

    const outcome = req.body.outcome === "fail" ? "FAILED" : "SUCCESS";
    const updated = await client.query(
      "UPDATE payments SET status=$1, updated_at=NOW() WHERE id=$2 AND status='PENDING' RETURNING payment_code,status",
      [outcome, payment.id]
    );
    await client.query("COMMIT");
    res.json({ payment: updated.rows[0], message: outcome === "SUCCESS" ? "Demo payment completed." : "Demo payment failed." });
  } catch (e) {
    await client.query("ROLLBACK");
    next(e);
  } finally { client.release(); }
});

router.post("/payments/:code/refunds", async (req, res, next) => {
  const amountPaise = req.body.amount == null ? null : parseAmountToPaise(req.body.amount);
  const reason = String(req.body.reason || "").trim();
  if (!reason) return res.status(400).json({ error: "A refund reason is required." });
  const client = await req.app.locals.pool.connect();
  try {
    await client.query("BEGIN");
    const found = await client.query(
      "SELECT * FROM payments WHERE payment_code=$1 AND merchant_id=$2 FOR UPDATE",
      [req.params.code, req.merchant.id]
    );
    const payment = found.rows[0];
    if (!payment) { await client.query("ROLLBACK"); return res.status(404).json({ error: "Payment not found." }); }
    if (!["SUCCESS", "PARTIALLY_REFUNDED"].includes(payment.status)) {
      await client.query("ROLLBACK"); return res.status(400).json({ error: "Only successful payments can be refunded." });
    }
    const sum = await client.query("SELECT COALESCE(SUM(amount_paise),0)::bigint AS total FROM refunds WHERE payment_id=$1", [payment.id]);
    const remaining = Number(payment.amount_paise) - Number(sum.rows[0].total);
    const refundAmount = amountPaise || remaining;
    if (!refundAmount || refundAmount > remaining) {
      await client.query("ROLLBACK"); return res.status(400).json({ error: "Refund amount exceeds the remaining refundable amount." });
    }
    await client.query(
      "INSERT INTO refunds (payment_id, merchant_id, refund_code, amount_paise, reason) VALUES ($1,$2,$3,$4,$5)",
      [payment.id, req.merchant.id, makeCode("REF"), refundAmount, reason]
    );
    const newTotal = Number(sum.rows[0].total) + refundAmount;
    const newStatus = newTotal === Number(payment.amount_paise) ? "REFUNDED" : "PARTIALLY_REFUNDED";
    await client.query("UPDATE payments SET status=$1, updated_at=NOW() WHERE id=$2", [newStatus, payment.id]);
    await client.query("COMMIT");
    res.status(201).json({ message: "Demo refund recorded.", status: newStatus, refundedAmount: refundAmount / 100, remainingAmount: (remaining - refundAmount) / 100 });
  } catch (e) {
    await client.query("ROLLBACK");
    next(e);
  } finally { client.release(); }
});

router.get("/refunds", async (req, res, next) => {
  try {
    const r = await req.app.locals.pool.query(
      `SELECT r.*, p.payment_code, p.customer_name, p.description
       FROM refunds r JOIN payments p ON p.id=r.payment_id
       WHERE r.merchant_id=$1 ORDER BY r.created_at DESC`,
      [req.merchant.id]
    );
    res.json({ refunds: r.rows });
  } catch (e) { next(e); }
});

module.exports = router;
