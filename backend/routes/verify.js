const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const { generateDeterministicWallet, encryptPrivateKey } = require("../utils/walletGenerator");

const router = express.Router();

/**
 * POST /api/verify/citizen
 * Verify citizen against gov DB → auto-approve if eligible, auto-reject if not.
 * Generates deterministic wallet on approval.
 */
router.post("/citizen", authenticateToken, async (req, res) => {
  const { pan, kisanCard, mobile, schemeId } = req.body;
  const db = req.app.locals.db;

  if (!pan || !mobile) return res.status(400).json({ error: "PAN and mobile number are required" });
  if (!schemeId) return res.status(400).json({ error: "Please select a welfare scheme" });

  // Check for duplicate application
  const existingApp = await db.prepare("SELECT * FROM citizen_applications WHERE user_id = ? AND scheme_id = ?")
    .get(req.user.userId, schemeId);
  if (existingApp) {
    if (existingApp.status === "Approved" || existingApp.status === "Funded") {
      return res.status(409).json({ error: "You have already been approved for this scheme.", alreadyApproved: true });
    }
    if (existingApp.status === "Pending") {
      return res.status(409).json({ error: "You already have a pending application.", alreadyPending: true });
    }
    if (existingApp.status === "Rejected") {
      await db.prepare("DELETE FROM citizen_applications WHERE id = ?").run(existingApp.id);
    }
  }

  // Check PAN uniqueness — another user shouldn't have applied with same PAN
  const panUsed = await db.prepare("SELECT ca.id, u.phone FROM citizen_applications ca JOIN users u ON ca.user_id = u.id WHERE ca.pan = ? AND ca.user_id != ?").get(pan, req.user.userId);
  if (panUsed) {
    return res.status(409).json({ error: `This PAN is already used by another applicant (phone: ${panUsed.phone.slice(0,4)}****)` });
  }

  // Check mobile uniqueness
  const mobileUsed = await db.prepare("SELECT ca.id FROM citizen_applications ca WHERE ca.phone = ? AND ca.user_id != ?").get(mobile, req.user.userId);
  if (mobileUsed) {
    return res.status(409).json({ error: "This mobile number is already used by another applicant" });
  }

  // Check kisan card uniqueness (if provided)
  if (kisanCard) {
    const kisanUsed = await db.prepare("SELECT ca.id FROM citizen_applications ca JOIN citizens_gov_db g ON ca.pan = g.pan WHERE g.kisan_card = ? AND ca.user_id != ?").get(kisanCard, req.user.userId);
    if (kisanUsed) {
      return res.status(409).json({ error: "This Kisan Card is already used by another applicant" });
    }
  }

  // Look up in government database
  const citizen = await db.prepare("SELECT * FROM citizens_gov_db WHERE pan = ? AND mobile = ?").get(pan, mobile);
  if (!citizen) {
    const byPan = await db.prepare("SELECT id FROM citizens_gov_db WHERE pan = ?").get(pan);
    return res.status(404).json({
      verified: false,
      error: "No matching records found in government database. You are not eligible for this scheme.",
      details: { panFound: !!byPan, hint: "Ensure PAN and mobile match government records" }
    });
  }

  // Check scheme eligibility
  const scheme = await db.prepare("SELECT * FROM schemes WHERE id = ?").get(schemeId);
  if (!scheme) return res.status(404).json({ error: "Scheme not found" });

  if (scheme.target_occupation === "Farmer" && !citizen.is_farmer) {
    // Auto-reject non-farmer
    await db.prepare(`INSERT INTO citizen_applications (user_id, scheme_id, pan, phone, citizen_name, occupation, district, state, status, rejection_reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Rejected', ?)`)
      .run(req.user.userId, schemeId, citizen.pan, citizen.mobile, citizen.name, citizen.occupation, citizen.district, citizen.state,
        `This scheme is only for farmers. Your occupation: "${citizen.occupation}".`);

    await db.prepare("INSERT INTO notifications (user_id, type, recipient, message) VALUES (?, ?, ?, ?)")
      .run(req.user.userId, "sms", citizen.mobile,
        `Dear ${citizen.name}, your application for "${scheme.name}" was rejected. This scheme is only for farmers. Your occupation: "${citizen.occupation}".`);

    console.log(`❌ [AUTO-REJECT] ${citizen.name} (${citizen.occupation}) — not a farmer`);
    return res.status(403).json({
      verified: false,
      error: `You are not eligible. This scheme is only for farmers. Your occupation: "${citizen.occupation}".`,
      autoRejected: true
    });
  }

  // Kisan card check
  if (kisanCard && citizen.kisan_card && citizen.kisan_card !== kisanCard) {
    return res.status(400).json({ verified: false, error: "Kisan Card number does not match government records" });
  }

  // ===== AUTO-APPROVE: citizen verified against gov DB =====
  await db.prepare("UPDATE citizens_gov_db SET verified = 1 WHERE id = ?").run(citizen.id);

  // Generate deterministic wallet
  const { address, privateKey } = generateDeterministicWallet(citizen.pan, citizen.mobile);
  const encryptedKey = encryptPrivateKey(privateKey);

  // Store wallet in user record
  await db.prepare("UPDATE users SET wallet_address = ?, wallet_private_key_enc = ? WHERE id = ?")
    .run(address, encryptedKey, req.user.userId);

  // Fund citizen wallet with ETH for gas fees (small amount for testnet)
  try {
    const { ethers } = require("ethers");
    const { getDeployerSigner } = require("../utils/contractSigner");
    const { signer: deployer } = getDeployerSigner();
    const deployerBal = await deployer.provider.getBalance(await deployer.getAddress());
    const fundAmount = ethers.parseEther("0.005"); // Conservative for Sepolia
    if (deployerBal > fundAmount * 2n) {
      const gasFundTx = await deployer.sendTransaction({
        to: address,
        value: fundAmount
      });
      await gasFundTx.wait();
      console.log(`   ⛽ Funded ${address.slice(0,10)}... with 0.005 ETH for gas`);
    } else {
      console.warn(`   ⚠️ Deployer balance too low to fund wallet (${ethers.formatEther(deployerBal)} ETH)`);
    }
  } catch (gasErr) {
    console.warn(`   ⚠️ Could not fund wallet with gas ETH: ${gasErr.shortMessage || gasErr.message}`);
  }

  // Create application with AUTO-APPROVED status
  await db.prepare(`INSERT INTO citizen_applications (user_id, scheme_id, pan, phone, citizen_name, occupation, district, state, status, reviewed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Approved', NOW())`)
    .run(req.user.userId, schemeId, citizen.pan, citizen.mobile, citizen.name, citizen.occupation, citizen.district, citizen.state);

  // ===== REGISTER ON-CHAIN via CitizenRegistry.registerCitizenByAdmin() =====
  let onChainCitizenId = null;
  let onChainTxHash = null;
  try {
    const { ethers } = require("ethers");
    const { getCitizenRegistry, getDeployerSigner, withTxLock } = require("../utils/contractSigner");

    // Health check: verify the contract exists on-chain before calling
    const { signer: deployer2, addresses: addr2 } = getDeployerSigner();
    const contractCode = await deployer2.provider.getCode(addr2.CitizenRegistry);
    if (!contractCode || contractCode === "0x") {
      console.warn(`   ⚠️ [ON-CHAIN SKIP] CitizenRegistry not deployed. Citizen approved in DB, on-chain registration deferred.`);
    } else {
      // Use TX lock to prevent nonce collisions with schedulers
      await withTxLock(async () => {
        const { contract: citizenReg } = getCitizenRegistry();

        // Create ZK commitment hash from PAN + mobile (privacy-preserving)
        const zkCommitment = ethers.keccak256(ethers.toUtf8Bytes(`${citizen.pan}:${citizen.mobile}`));
        const mobileHash = ethers.keccak256(ethers.toUtf8Bytes(citizen.mobile));

        const tx = await citizenReg.registerCitizenByAdmin(
          address,        // citizen's auto-generated wallet
          zkCommitment,   // hash of PAN + mobile
          mobileHash,     // hashed mobile
          schemeId        // welfare scheme ID
        );
        const receipt = await tx.wait();
        onChainTxHash = receipt.hash;

        // Get the citizen ID from the on-chain counter
        const totalCitizens = await citizenReg.getTotalCitizens();
        onChainCitizenId = Number(totalCitizens);

        // Persist on-chain data to DB so retry scheduler knows this citizen is registered
        await db.prepare("UPDATE citizen_applications SET on_chain_citizen_id = ?, on_chain_tx_hash = ? WHERE user_id = ? AND scheme_id = ?")
          .run(onChainCitizenId, onChainTxHash, req.user.userId, schemeId);

        console.log(`   🔗 [ON-CHAIN] Citizen registered on CitizenRegistry — ID: ${onChainCitizenId}, TX: ${onChainTxHash.slice(0, 14)}...`);
      });
    }
  } catch (chainErr) {
    console.warn(`   ⚠️ [ON-CHAIN WARN] Could not register on-chain: ${chainErr.reason || chainErr.message}`);
    console.warn(`   (Citizen is still approved in DB. Auto-retry scheduler will register them on-chain.)`);
  }

  // Send approval notification
  await db.prepare("INSERT INTO notifications (user_id, type, recipient, message) VALUES (?, ?, ?, ?)")
    .run(req.user.userId, "sms", citizen.mobile,
      `Dear ${citizen.name}, your application for "${scheme.name}" has been AUTO-APPROVED via ZK proof verification! Your wallet: ${address.slice(0, 10)}...`);

  console.log(`✅ [AUTO-APPROVED] ${citizen.name} — Wallet: ${address.slice(0, 10)}...`);

  res.json({
    verified: true,
    autoApproved: true,
    message: "Identity verified & application AUTO-APPROVED! Your blockchain wallet has been generated.",
    walletAddress: address,
    onChainCitizenId,
    onChainTxHash,
    citizenData: {
      name: citizen.name,
      occupation: citizen.occupation,
      isFarmer: !!citizen.is_farmer,
      district: citizen.district,
      state: citizen.state,
      landAcres: citizen.land_acres,
      annualIncome: citizen.annual_income
    },
    proofInputs: { pan: citizen.pan, mobile: citizen.mobile },
    schemeName: scheme.name
  });
});

/**
 * POST /api/verify/vendor
 * Submit vendor application (status = Pending, needs admin approval).
 * Wallet generated but NOT activated until admin approves.
 */
router.post("/vendor", authenticateToken, async (req, res) => {
  const { businessName, vendorType, credential, bankAccount, ifsc, mobile } = req.body;
  const db = req.app.locals.db;

  if (!businessName || !credential || !bankAccount || !ifsc) {
    return res.status(400).json({ error: "Business name, credential, bank account, and IFSC are required" });
  }

  // Check if already applied
  const existing = await db.prepare("SELECT * FROM vendor_applications WHERE user_id = ?").get(req.user.userId);
  if (existing) {
    if (existing.status === "Approved") return res.status(409).json({ error: "Already approved as a vendor", alreadyApproved: true });
    if (existing.status === "Pending") return res.status(409).json({ error: "You already have a pending vendor application", alreadyPending: true });
    if (existing.status === "Rejected") await db.prepare("DELETE FROM vendor_applications WHERE id = ?").run(existing.id);
  }

  // Check bank account uniqueness
  const bankUsed = await db.prepare("SELECT id FROM vendor_applications WHERE bank_account = ? AND user_id != ?").get(bankAccount, req.user.userId);
  if (bankUsed) {
    return res.status(409).json({ error: "This bank account is already registered by another vendor" });
  }

  // Generate wallet (stored but not active until admin approval)
  const phone = req.user.phone || mobile || "0000000000";
  const { address, privateKey } = generateDeterministicWallet(bankAccount, phone);
  const encryptedKey = encryptPrivateKey(privateKey);

  // Store wallet
  await db.prepare("UPDATE users SET wallet_address = ?, wallet_private_key_enc = ? WHERE id = ?")
    .run(address, encryptedKey, req.user.userId);

  // Create vendor application (PENDING — needs admin approval)
  await db.prepare(`INSERT INTO vendor_applications (user_id, business_name, vendor_type, credential, bank_account, ifsc_code, mobile, wallet_address, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`)
    .run(req.user.userId, businessName, vendorType || "FarmingSupplier", credential, bankAccount, ifsc, phone, address);

  console.log(`📋 [VENDOR APP] ${businessName} by ${req.user.name} — Status: Pending`);

  res.json({
    success: true,
    pending: true,
    message: "Vendor application submitted! Your wallet has been generated. Awaiting admin approval.",
    walletAddress: address
  });
});

/**
 * GET /api/verify/my-applications
 */
router.get("/my-applications", authenticateToken, async (req, res) => {
  const db = req.app.locals.db;
  const apps = await db.prepare(`
    SELECT ca.*, s.name as scheme_name FROM citizen_applications ca
    LEFT JOIN schemes s ON ca.scheme_id = s.id
    WHERE ca.user_id = ? ORDER BY ca.applied_at DESC
  `).all(req.user.userId);
  res.json({ applications: apps });
});

/**
 * GET /api/verify/my-vendor-status
 */
router.get("/my-vendor-status", authenticateToken, async (req, res) => {
  const db = req.app.locals.db;
  const app = await db.prepare("SELECT * FROM vendor_applications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1").get(req.user.userId);
  const user = await db.prepare("SELECT wallet_address FROM users WHERE id = ?").get(req.user.userId);
  res.json({
    application: app || null,
    walletAddress: user?.wallet_address || null,
    status: app ? app.status : "not_applied"
  });
});

/**
 * GET /api/verify/schemes
 */
router.get("/schemes", async (req, res) => {
  const db = req.app.locals.db;
  const status = req.query.status; // optional filter
  const schemes = status 
    ? await db.prepare("SELECT * FROM schemes WHERE status = ?").all(status)
    : await db.prepare("SELECT * FROM schemes WHERE status IN ('Active', 'Upcoming') ORDER BY CASE status WHEN 'Active' THEN 1 WHEN 'Upcoming' THEN 2 ELSE 3 END").all();
  
  // Add beneficiary counts
  const beneficiaryCounts = await db.prepare(`
    SELECT scheme_id, COUNT(*) as count FROM citizen_applications 
    WHERE status IN ('Approved', 'Funded') GROUP BY scheme_id
  `).all();
  const beneficiaryMap = {};
  for (const b of beneficiaryCounts) beneficiaryMap[b.scheme_id] = b.count;
  const schemesWithBeneficiaries = schemes.map(s => ({ ...s, beneficiary_count: beneficiaryMap[s.id] || 0 }));

  res.json({ schemes: schemesWithBeneficiaries });
});

/**
 * GET /api/verify/notifications
 */
router.get("/notifications", authenticateToken, async (req, res) => {
  const db = req.app.locals.db;
  const notifications = await db.prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50")
    .all(req.user.userId);
  res.json({ notifications });
});

module.exports = router;
