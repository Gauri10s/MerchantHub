function makeCode(prefix) {
  return `${prefix}_${require("crypto").randomBytes(8).toString("hex").toUpperCase()}`;
}

function parseAmountToPaise(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10000000) return null;
  return Math.round(amount * 100);
}

module.exports = { makeCode, parseAmountToPaise };
