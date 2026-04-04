const express = require("express");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

/**
 * POST /api/notifications
 * Simulate sending SMS/email notification
 */
router.post("/", authenticateToken, async (req, res) => {
  const { type, recipient, message } = req.body;
  const db = req.app.locals.db;

  if (!type || !recipient || !message) {
    return res.status(400).json({ error: "type, recipient, and message are required" });
  }
  if (!["sms", "email"].includes(type)) {
    return res.status(400).json({ error: "type must be 'sms' or 'email'" });
  }

  const result = await db.prepare(
    "INSERT INTO notifications (user_id, type, recipient, message) VALUES (?, ?, ?, ?)"
  ).run(req.user.userId, type, recipient, message);

  console.log(`📱 [${type.toUpperCase()}] To: ${recipient}`);
  console.log(`   Message: ${message}`);

  res.status(201).json({
    sent: true,
    notificationId: result.lastInsertRowid,
    type,
    recipient,
    message: "Notification sent (simulated)"
  });
});

/**
 * GET /api/notifications/:userId
 * Get notification history for a user
 */
router.get("/:userId", authenticateToken, async (req, res) => {
  const db = req.app.locals.db;
  const { userId } = req.params;

  // Users can only see their own notifications (admins can see all)
  if (req.user.role !== "admin" && req.user.userId !== parseInt(userId)) {
    return res.status(403).json({ error: "Access denied" });
  }

  const notifications = await db.prepare(
    "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC"
  ).all(userId);

  res.json({ notifications });
});

module.exports = router;