const router = require("express").Router();
const authenticate = require("../middleware/auth");
router.use(authenticate);

router.get("/analytics", async (req, res, next) => {
  try {
    const id = req.merchant.id;
    const summary = await req.app.locals.pool.query(
      `SELECT
        COALESCE(SUM(amount_paise) FILTER (WHERE status IN ('SUCCESS','PARTIALLY_REFUNDED','REFUNDED')),0)::bigint AS gross_collected,
        COUNT(*) FILTER (WHERE status IN ('SUCCESS','PARTIALLY_REFUNDED','REFUNDED'))::int AS successful,
        COUNT(*) FILTER (WHERE status='PENDING')::int AS pending,
        COUNT(*) FILTER (WHERE status='FAILED')::int AS failed,
        (SELECT COALESCE(SUM(amount_paise),0)::bigint FROM refunds WHERE merchant_id=$1) AS refunded,
        COUNT(*)::int AS total
       FROM payments WHERE merchant_id=$1`,
      [id]
    );
    const daily = await req.app.locals.pool.query(
      `SELECT TO_CHAR(day,'DD Mon') AS day,
        COALESCE(SUM(amount_paise),0)::bigint AS amount_paise
       FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') day
       LEFT JOIN payments p ON DATE(p.created_at)=DATE(day) AND p.merchant_id=$1
         AND p.status IN ('SUCCESS','PARTIALLY_REFUNDED','REFUNDED')
       GROUP BY day ORDER BY day`,
      [id]
    );
    res.json({ summary: summary.rows[0], daily: daily.rows });
  } catch (e) { next(e); }
});

router.get("/export/payments.csv", async (req, res, next) => {
  try {
    const r = await req.app.locals.pool.query(
      `SELECT payment_code, customer_name, customer_email, description,
       amount_paise, status, created_at FROM payments
       WHERE merchant_id=$1 ORDER BY created_at DESC`,
      [req.merchant.id]
    );
    const escape = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const lines = ["Payment ID,Customer,Customer Email,Description,Amount INR,Status,Created At"];
    for (const p of r.rows) {
      lines.push([p.payment_code,p.customer_name,p.customer_email,p.description,(Number(p.amount_paise)/100).toFixed(2),p.status,p.created_at.toISOString()].map(escape).join(","));
    }
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="merchanthub-payments.csv"');
    res.send(lines.join("\n"));
  } catch (e) { next(e); }
});

module.exports = router;
