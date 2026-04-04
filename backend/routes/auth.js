const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { authenticateToken, JWT_SECRET } = require("../middleware/auth");

const router = express.Router();

// Generate 6-digit OTP
function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * POST /api/auth/send-otp
 * Send OTP to phone number (simulated — prints to console)
 */
router.post("/send-otp", async (req, res) => {
  const { phone } = req.body;
  const db = req.app.locals.db;
  if (!phone || phone.length < 10) return res.status(400).json({ error: "Valid phone number required" });

  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min

  // Store OTP temporarily (upsert if user exists, or store in a temp table)
  const existing = await db.prepare("SELECT id FROM users WHERE phone = ?").get(phone);
  if (existing) {
    await db.prepare("UPDATE users SET otp = ?, otp_expires_at = ? WHERE phone = ?").run(otp, expiresAt, phone);
  } else {
    // Store in a temp way — we'll create user on signup
    // For now, use a simple key-value approach (PostgreSQL UPSERT)
    await db.prepare("INSERT INTO otp_store (phone, otp, expires_at) VALUES (?, ?, ?) ON CONFLICT (phone) DO UPDATE SET otp = EXCLUDED.otp, expires_at = EXCLUDED.expires_at")
      .run(phone, otp, expiresAt);
  }

  console.log(`\n📱 [OTP] Phone: ${phone} → OTP: ${otp} (expires in 5 min)\n`);

  res.json({ sent: true, message: "OTP sent to your phone (check backend console)", phone });
});

/**
 * POST /api/auth/verify-otp
 * Verify OTP for phone number
 */
router.post("/verify-otp", async (req, res) => {
  const { phone, otp } = req.body;
  const db = req.app.locals.db;
  if (!phone || !otp) return res.status(400).json({ error: "Phone and OTP required" });

  // Check user table first
  const user = await db.prepare("SELECT otp, otp_expires_at FROM users WHERE phone = ?").get(phone);
  let storedOtp, expiresAt;

  if (user && user.otp) {
    storedOtp = user.otp;
    expiresAt = user.otp_expires_at;
  } else {
    // Check temp store
    const temp = await db.prepare("SELECT otp, expires_at FROM otp_store WHERE phone = ?").get(phone);
    if (temp) { storedOtp = temp.otp; expiresAt = temp.expires_at; }
  }

  if (!storedOtp) return res.status(400).json({ error: "No OTP found. Request a new one." });
  if (new Date(expiresAt) < new Date()) return res.status(400).json({ error: "OTP expired. Request a new one." });
  if (storedOtp !== otp) return res.status(400).json({ error: "Invalid OTP" });

  // Clear OTP
  if (user) await db.prepare("UPDATE users SET otp = NULL, otp_expires_at = NULL, phone_verified = 1 WHERE phone = ?").run(phone);
  else await db.prepare("DELETE FROM otp_store WHERE phone = ?").run(phone);

  res.json({ verified: true, message: "Phone verified successfully" });
});

/**
 * POST /api/auth/signup
 * Create account with phone + password (email optional)
 */
router.post("/signup", async (req, res) => {
  const { phone, password, name, role, email, walletAddress } = req.body;
  const db = req.app.locals.db;

  if (!phone || !password || !name || !role) {
    return res.status(400).json({ error: "Phone, password, name, and role are required" });
  }
  if (!["citizen", "vendor"].includes(role)) {
    return res.status(400).json({ error: "Role must be 'citizen' or 'vendor'" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }
  if (phone.length < 10) {
    return res.status(400).json({ error: "Valid 10-digit phone number required" });
  }

  const existing = await db.prepare("SELECT id FROM users WHERE phone = ?").get(phone);
  if (existing) {
    return res.status(409).json({ error: "Phone number already registered" });
  }

  // Check email uniqueness (if provided)
  if (email) {
    const emailExists = await db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (emailExists) {
      return res.status(409).json({ error: "Email address already registered" });
    }
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const result = await db.prepare(
    "INSERT INTO users (phone, email, password_hash, name, role, wallet_address, phone_verified) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(phone, email || null, passwordHash, name, role, walletAddress || null, 1);

  const token = jwt.sign(
    { userId: result.lastInsertRowid, phone, name, role, walletAddress },
    JWT_SECRET,
    { expiresIn: "24h" }
  );

  res.status(201).json({
    message: "Account created successfully",
    token,
    user: { id: result.lastInsertRowid, phone, email, name, role, walletAddress }
  });
});

/**
 * POST /api/auth/login
 * Login with phone + password
 */
router.post("/login", async (req, res) => {
  const { phone, password } = req.body;
  const db = req.app.locals.db;

  if (!phone || !password) {
    return res.status(400).json({ error: "Phone and password are required" });
  }

  const user = await db.prepare("SELECT * FROM users WHERE phone = ?").get(phone);
  if (!user) {
    return res.status(401).json({ error: "Invalid phone number or password" });
  }

  const validPassword = bcrypt.compareSync(password, user.password_hash);
  if (!validPassword) {
    return res.status(401).json({ error: "Invalid phone number or password" });
  }

  const token = jwt.sign(
    { userId: user.id, phone: user.phone, name: user.name, role: user.role, walletAddress: user.wallet_address },
    JWT_SECRET,
    { expiresIn: "24h" }
  );

  res.json({
    message: "Login successful",
    token,
    user: { id: user.id, phone: user.phone, email: user.email, name: user.name, role: user.role, walletAddress: user.wallet_address }
  });
});

/**
 * POST /api/auth/forgot-password
 * Send OTP for password reset
 */
router.post("/forgot-password", async (req, res) => {
  const { phone } = req.body;
  const db = req.app.locals.db;
  if (!phone) return res.status(400).json({ error: "Phone number required" });

  const user = await db.prepare("SELECT id FROM users WHERE phone = ?").get(phone);
  if (!user) return res.status(404).json({ error: "No account found with this phone number" });

  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  await db.prepare("UPDATE users SET otp = ?, otp_expires_at = ? WHERE phone = ?").run(otp, expiresAt, phone);

  console.log(`\n🔑 [PASSWORD RESET] Phone: ${phone} → OTP: ${otp}\n`);
  res.json({ sent: true, message: "Reset OTP sent (check backend console)" });
});

/**
 * POST /api/auth/reset-password
 * Reset password using OTP
 */
router.post("/reset-password", async (req, res) => {
  const { phone, otp, newPassword } = req.body;
  const db = req.app.locals.db;
  if (!phone || !otp || !newPassword) return res.status(400).json({ error: "Phone, OTP, and new password required" });
  if (newPassword.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });

  const user = await db.prepare("SELECT otp, otp_expires_at FROM users WHERE phone = ?").get(phone);
  if (!user || !user.otp) return res.status(400).json({ error: "No reset request found" });
  if (new Date(user.otp_expires_at) < new Date()) return res.status(400).json({ error: "OTP expired" });
  if (user.otp !== otp) return res.status(400).json({ error: "Invalid OTP" });

  const hash = bcrypt.hashSync(newPassword, 10);
  await db.prepare("UPDATE users SET password_hash = ?, otp = NULL, otp_expires_at = NULL WHERE phone = ?").run(hash, phone);
  res.json({ success: true, message: "Password reset successfully. You can now login." });
});

/**
 * GET /api/auth/me
 */
router.get("/me", authenticateToken, async (req, res) => {
  const db = req.app.locals.db;
  const user = await db.prepare("SELECT id, phone, email, name, role, wallet_address, created_at FROM users WHERE id = ?").get(req.user.userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user });
});

/**
 * PUT /api/auth/wallet
 */
router.put("/wallet", authenticateToken, async (req, res) => {
  const { walletAddress } = req.body;
  const db = req.app.locals.db;
  if (!walletAddress) return res.status(400).json({ error: "Wallet address required" });
  await db.prepare("UPDATE users SET wallet_address = ? WHERE id = ?").run(walletAddress, req.user.userId);
  res.json({ message: "Wallet address updated", walletAddress });
});

module.exports = router;
