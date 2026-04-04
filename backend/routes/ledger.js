const express = require("express");
const router = express.Router();

/**
 * GET /api/ledger/transactions
 * Returns all transactions from the DB transaction_log table.
 * This is a fallback/supplement to the on-chain TransactionLedger.
 * No authentication required — this is public data.
 */
router.get("/transactions", async (req, res) => {
  const db = req.app.locals.db;
  const limit = Math.min(parseInt(req.query.limit) || 100, 500);
  const offset = parseInt(req.query.offset) || 0;

  const transactions = await db.prepare(`
    SELECT * FROM transaction_log
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  const totalRow = await db.prepare("SELECT COUNT(*) as count FROM transaction_log").get();
  const total = Number(totalRow.count);

  // Count by type
  const typeCounts = await db.prepare(`
    SELECT tx_type, COUNT(*) as count FROM transaction_log GROUP BY tx_type
  `).all();

  const countMap = {};
  for (const t of typeCounts) countMap[t.tx_type] = Number(t.count);

  res.json({
    transactions,
    total,
    limit,
    offset,
    counts: {
      TokenMint: countMap.TokenMint || 0,
      TokenAllocation: countMap.TokenAllocation || 0,
      CitizenToVendor: countMap.CitizenToVendor || 0,
      VendorExchange: countMap.VendorExchange || 0,
      TokenRevocation: countMap.TokenRevocation || 0
    }
  });
});