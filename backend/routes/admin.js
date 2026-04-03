const express = require("express");
const { authenticateToken, requireRole } = require("../middleware/auth");

const router = express.Router();
router.use(authenticateToken);


router.get("/stats", requireRole("admin", "rbi_admin"), async (req, res) => {
    const db = req.app.locals.db;
    const totalCitizensRow = await db.prepare("SELECT COUNT(*) as c FROM citizens_gov_db").get();
    const totalCitizens = Number(totalCitizensRow.c);
    const farmersRow = await db.prepare("SELECT COUNT(*) as c FROM citizens_gov_db WHERE is_farmer = 1").get();
    const farmers = Number(farmersRow.c);
    const totalVendorsGovRow = await db.prepare("SELECT COUNT(*) as c FROM vendors_gov_db").get();
    const totalVendorsGov = Number(totalVendorsGovRow.c);
    const totalUsersRow = await db.prepare("SELECT COUNT(*) as c FROM users").get();
    const totalUsers = Number(totalUsersRow.c);
    const citizenUsersRow = await db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'citizen'").get();
    const citizenUsers = Number(citizenUsersRow.c);
    const vendorUsersRow = await db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'vendor'").get();
    const vendorUsers = Number(vendorUsersRow.c);
    const pendingAppsRow = await db.prepare("SELECT COUNT(*) as c FROM citizen_applications WHERE status = 'Pending'").get();
    const pendingApps = Number(pendingAppsRow.c);
    const approvedAppsRow = await db.prepare("SELECT COUNT(*) as c FROM citizen_applications WHERE status = 'Approved'").get();
    const approvedApps = Number(approvedAppsRow.c);
    const schemes = await db.prepare("SELECT * FROM schemes").all();
    const triggersRow = await db.prepare("SELECT COUNT(*) as c FROM event_triggers WHERE status = 'Scheduled'").get();
    const triggers = Number(triggersRow.c);

    // Beneficiary counts per scheme
    const beneficiaryCounts = await db.prepare(`
        SELECT scheme_id, COUNT(*) as count FROM citizen_applications 
        WHERE status IN ('Approved', 'Funded') GROUP BY scheme_id
    `).all();
    const beneficiaryMap = {};
    for (const b of beneficiaryCounts) beneficiaryMap[b.scheme_id] = Number(b.count);
    const schemesWithBeneficiaries = schemes.map(s => ({ ...s, beneficiary_count: beneficiaryMap[s.id] || 0 }));

    res.json({ stats: {
        govDB: { totalCitizens, farmers, nonFarmers: totalCitizens - farmers, totalVendorsGov },
        platform: { totalUsers, citizenUsers, vendorUsers },
        applications: { pending: pendingApps, approved: approvedApps },
        schemes: schemesWithBeneficiaries, scheduledTriggers: triggers
    }});
});

//vendor management endpoint (GET)
router.get("/vendors", requireRole("admin", "rbi_admin"), async (req, res) => {
    const db = req.app.locals.db;
    const vendors = await db.prepare("SELECT * FROM vendors_gov_db").all();
    // Also get vendor applications
    const applications = await db.prepare(`
        SELECT va.*, u.name as user_name, u.phone as user_phone
        FROM vendor_applications va
        LEFT JOIN users u ON va.user_id = u.id
        ORDER BY va.created_at DESC
    `).all();
    res.json({ vendors, applications, total: vendors.length });
    });

    router.post("/vendors/:id/approve", requireRole("admin"), async (req, res) => {
    const db = req.app.locals.db;
    const app = await db.prepare("SELECT * FROM vendor_applications WHERE id = ?").get(req.params.id);
    if (!app) return res.status(404).json({ error: "Vendor application not found" });
    if (app.status !== "Pending") return res.status(400).json({ error: `Cannot approve — status is ${app.status}` });

    await db.prepare("UPDATE vendor_applications SET status = 'Approved', reviewed_at = NOW() WHERE id = ?").run(req.params.id);

    const user = await db.prepare("SELECT phone, name, wallet_address FROM users WHERE id = ?").get(app.user_id);

    if (user && user.wallet_address) {
        try {
        const { ethers } = require("ethers");
        const { getDeployerSigner, getVendorRegistry, withTxLock } = require("../utils/contractSigner");

        await withTxLock(async () => {
            // 1. Fund vendor wallet with ETH for gas
            const { signer: deployer } = getDeployerSigner();
            const deployerBal = await deployer.provider.getBalance(await deployer.getAddress());
            const fundAmount = ethers.parseEther("0.005");
            if (deployerBal > fundAmount * 2n) {
            const fundTx = await deployer.sendTransaction({ to: user.wallet_address, value: fundAmount });
            await fundTx.wait();
            console.log(`   ⛽ Funded vendor ${user.wallet_address.slice(0,10)}... with 0.005 ETH for gas`);
            } else {
            console.warn(`   ⚠️ Deployer balance too low for vendor funding (${ethers.formatEther(deployerBal)} ETH)`);
            }

            // 2. Check if wallet is ALREADY registered on-chain (prevent "Wallet already registered" revert)
            const { contract: vendorReg } = getVendorRegistry();
            const existingVendorId = await vendorReg.walletToVendorId(user.wallet_address);

            if (Number(existingVendorId) !== 0) {
            // Wallet already on-chain — save existing vendor ID, skip re-registration
            console.log(`   ℹ️ Wallet ${user.wallet_address.slice(0,10)}... already on-chain as vendor #${Number(existingVendorId)}`);
            await db.prepare("UPDATE vendor_applications SET on_chain_vendor_id = ? WHERE id = ?")
                .run(Number(existingVendorId), req.params.id);
            } else {
            // 3. Register vendor on-chain (VendorRegistry.registerVendorByAdmin)
            const { contract: vendorReg2 } = getVendorRegistry();
            const vendorType = app.vendor_type === "CropBuyer" ? 1 : 0;
            const credentialHash = ethers.keccak256(ethers.toUtf8Bytes(app.credential || "none"));
            const bankAccountHash = ethers.keccak256(ethers.toUtf8Bytes(app.bank_account || "none"));
            const ifscHash = ethers.keccak256(ethers.toUtf8Bytes(app.ifsc_code || "none"));

            const regTx = await vendorReg2.registerVendorByAdmin(
                user.wallet_address, vendorType, app.business_name, credentialHash, bankAccountHash, ifscHash
            );
            const receipt = await regTx.wait();

            // Get the assigned on-chain vendor ID
            const { contract: vendorReg3 } = getVendorRegistry();
            const onChainVendorId = Number(await vendorReg3.walletToVendorId(user.wallet_address));
            await db.prepare("UPDATE vendor_applications SET on_chain_vendor_id = ? WHERE id = ?")
                .run(onChainVendorId, req.params.id);

            console.log(`   🔗 Vendor "${app.business_name}" registered on-chain — ID: ${onChainVendorId}, TX: ${receipt.hash.slice(0,14)}...`);

            // 4. Log to DB transaction log
            await db.prepare("INSERT INTO transaction_log (tx_type, from_address, to_address, amount, description, tx_hash) VALUES (?, ?, ?, ?, ?, ?)")
                .run("VendorExchange", "0x0000000000000000000000000000000000000000", user.wallet_address, 0,
                `Vendor "${app.business_name}" registered on-chain (ID: ${onChainVendorId})`, receipt.hash);
            }
        });
        } catch (e) {
        console.warn(`   ⚠️ Vendor on-chain registration error: ${e.reason || e.message}`);
        }
    }

    // Insert approved vendor into vendors_gov_db (government-approved vendor registry)
    try {
        await db.prepare(`INSERT INTO vendors_gov_db (business_name, vendor_type, owner_name, degree, bank_account, ifsc_code, mobile, district)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(app.business_name, app.vendor_type || 'FarmingSupplier', user ? user.name : 'Unknown', app.credential || '', app.bank_account || '', app.ifsc_code || '', app.mobile || (user ? user.phone : ''), 'N/A');
        console.log(`   📋 Vendor "${app.business_name}" added to vendors_gov_db`);
    } catch (govDbErr) {
        console.warn(`   ⚠️ Could not insert into vendors_gov_db: ${govDbErr.message}`);
    }

    if (user) {
        await db.prepare("INSERT INTO notifications (user_id, type, recipient, message) VALUES (?, ?, ?, ?)")
        .run(app.user_id, "sms", user.phone, `Dear ${user.name}, your vendor application for "${app.business_name}" has been APPROVED! Your wallet is ready.`);
        console.log(`✅ [VENDOR APPROVED] ${app.business_name} (${user.name})`);
    }
    res.json({ success: true, message: "Vendor approved" });
});

router.post("/vendors/:id/reject", requireRole("admin"), async (req, res) => {
    const db = req.app.locals.db;
    const { reason } = req.body;
    const app = await db.prepare("SELECT * FROM vendor_applications WHERE id = ?").get(req.params.id);
    if (!app) return res.status(404).json({ error: "Vendor application not found" });
    if (app.status !== "Pending") return res.status(400).json({ error: `Cannot reject — status is ${app.status}` });

    const rejectionReason = reason || "Application did not meet vendor criteria";
    await db.prepare("UPDATE vendor_applications SET status = 'Rejected', rejection_reason = ?, reviewed_at = NOW() WHERE id = ?")
        .run(rejectionReason, req.params.id);

    const user = await db.prepare("SELECT phone, name FROM users WHERE id = ?").get(app.user_id);
    if (user) {
        await db.prepare("INSERT INTO notifications (user_id, type, recipient, message) VALUES (?, ?, ?, ?)")
        .run(app.user_id, "sms", user.phone, `Dear ${user.name}, your vendor application was REJECTED. Reason: ${rejectionReason}`);
        console.log(`❌ [VENDOR REJECTED] ${app.business_name} — Reason: ${rejectionReason}`);
    }
    res.json({ success: true, message: "Vendor rejected", reason: rejectionReason });
    });

    router.post("/verify-itr/:vendorId", requireRole("admin", "rbi_admin"), async (req, res) => {
    const db = req.app.locals.db;
    const vendor = await db.prepare("SELECT * FROM vendors_gov_db WHERE id = ?").get(req.params.vendorId);
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });
    console.log(`📋 [ITR VERIFIED] ${vendor.business_name} — Status: ${vendor.itr_status}`);
    res.json({ verified: true, vendor: { id: vendor.id, businessName: vendor.business_name, itrStatus: vendor.itr_status } });
    });

    router.post("/confirm-transfer/:vendorId", requireRole("rbi_admin"), async (req, res) => {
    const db = req.app.locals.db;
    const { amount, transactionRef } = req.body;

    // Look up vendor APPLICATION (not gov DB) — the frontend sends vendor_applications.id
    const app = await db.prepare(`
        SELECT va.*, u.wallet_address, u.wallet_private_key_enc, u.name as user_name, u.phone as user_phone
        FROM vendor_applications va
        JOIN users u ON va.user_id = u.id
        WHERE va.id = ?
    `).get(req.params.vendorId);

    if (!app) return res.status(404).json({ error: "Vendor application not found" });
    if (app.status !== "Approved") return res.status(400).json({ error: `Vendor status is "${app.status}", not Approved` });
    if (!app.wallet_address) return res.status(400).json({ error: "Vendor has no wallet address" });

    const transferAmount = parseFloat(amount) || 0;
    if (transferAmount <= 0) return res.status(400).json({ error: "Transfer amount must be positive" });

    console.log(`\n🏦 [RBI TRANSFER] ${app.business_name} — ₹${transferAmount} — Ref: ${transactionRef || "N/A"}`);
    let tokensBurned = false;
    let burnTxHash = null;
    try {
        const { ethers } = require("ethers");
        const { getDigitalRupee, getVendorRegistry, getTransactionLedger, withTxLock } = require("../utils/contractSigner");

        await withTxLock(async () => {
        const amountWei = ethers.parseEther(String(transferAmount));

        // Step 1: Check vendor's token balance
        const { contract: dr1 } = getDigitalRupee(true);
        const vendorBalance = await dr1.balanceOf(app.wallet_address);
        const burnAmount = vendorBalance < amountWei ? vendorBalance : amountWei;

        if (burnAmount > 0n) {
            // Step 2: Burn (revoke) tokens from vendor's wallet
            const { contract: dr2 } = getDigitalRupee(true);
            const burnTx = await dr2.revokeTokens(app.wallet_address, burnAmount);
            const burnReceipt = await burnTx.wait();
            burnTxHash = burnReceipt.hash;
            console.log(`   🔥 Burned ₹${ethers.formatEther(burnAmount)} tokens from ${app.wallet_address.slice(0,10)}...`);

            // Step 3: Mark tokens revoked on VendorRegistry (if vendor is on-chain)
            try {
            const { contract: vendorReg } = getVendorRegistry();
            const vendorData = await vendorReg.getVendorByWallet(app.wallet_address);
            const onChainVendorId = Number(vendorData.id);
            const exchangeStatus = Number(vendorData.exchangeStatus);

            if (exchangeStatus === 0 || exchangeStatus === 4) {
                console.log(`   ℹ️ VendorRegistry exchangeStatus=${exchangeStatus} (None/Revoked) — ERC-20 burn completed, skipping VendorRegistry state update`);
            } else if (exchangeStatus === 1) {
                const { contract: vr1 } = getVendorRegistry();
                await (await vr1.verifyITR(onChainVendorId)).wait();
                const { contract: vr2 } = getVendorRegistry();
                await (await vr2.confirmRBITransfer(onChainVendorId)).wait();
                const { contract: vr3 } = getVendorRegistry();
                await (await vr3.markTokensRevoked(onChainVendorId, burnAmount)).wait();
                console.log(`   ✅ VendorRegistry updated — tokens revoked for vendor #${onChainVendorId}`);
            } else if (exchangeStatus === 2) {
                const { contract: vr2 } = getVendorRegistry();
                await (await vr2.confirmRBITransfer(onChainVendorId)).wait();
                const { contract: vr3 } = getVendorRegistry();
                await (await vr3.markTokensRevoked(onChainVendorId, burnAmount)).wait();
                console.log(`   ✅ VendorRegistry updated — tokens revoked for vendor #${onChainVendorId}`);
            } else if (exchangeStatus === 3) {
                const { contract: vr3 } = getVendorRegistry();
                await (await vr3.markTokensRevoked(onChainVendorId, burnAmount)).wait();
                console.log(`   ✅ VendorRegistry updated — tokens revoked for vendor #${onChainVendorId}`);
            }
            } catch (vrErr) {
            console.warn(`   ⚠️ VendorRegistry update skipped: ${vrErr.reason || vrErr.message}`);
            }

            // Step 4: Log to on-chain TransactionLedger
            try {
            const { contract: ledger } = getTransactionLedger();
            await (await ledger.logTransaction(
                4, // TokenRevocation
                app.wallet_address,
                "0x0000000000000000000000000000000000000000",
                burnAmount,
                `RBI transfer confirmed — ₹${transferAmount} revoked from "${app.business_name}"`
            )).wait();
            console.log(`   📒 Logged revocation to TransactionLedger`);
            } catch (logErr) {
            console.warn(`   ⚠️ TransactionLedger log skipped: ${logErr.reason || logErr.message}`);
            }

            tokensBurned = true;
        } else {
            console.log(`   ℹ️ Vendor has 0 token balance — no tokens to burn`);
        }
        });
    } catch (chainErr) {
        console.warn(`   ⚠️ On-chain token revocation error: ${chainErr.reason || chainErr.shortMessage || chainErr.message}`);
    }

    // Log to DB transaction_log
    await db.prepare("INSERT INTO transaction_log (tx_type, from_address, to_address, amount, description, tx_hash) VALUES (?, ?, ?, ?, ?, ?)")
        .run("TokenRevocation", app.wallet_address, "0x0000000000000000000000000000000000000000", transferAmount,
        `RBI transfer ₹${transferAmount} to "${app.business_name}" — Ref: ${transactionRef || "N/A"}. Tokens ${tokensBurned ? "revoked" : "not revoked"}.`,
        burnTxHash || null);

    // Log notification
    await db.prepare("INSERT INTO notifications (user_id, type, recipient, message) VALUES (?, ?, ?, ?)")
        .run(app.user_id, "system", app.user_phone,
        `RBI transferred ₹${transferAmount} to your bank account for "${app.business_name}". ${tokensBurned ? 'Tokens revoked.' : ''} Ref: ${transactionRef || 'N/A'}`);

    console.log(`   ✅ [RBI TRANSFER COMPLETE] ${app.business_name} — ₹${transferAmount} — Tokens ${tokensBurned ? 'REVOKED' : 'not revoked (0 balance or chain error)'}\n`);

    res.json({
        confirmed: true,
        tokensBurned,
        vendor: { id: app.id, businessName: app.business_name },
        message: `Transfer confirmed for "${app.business_name}". ${tokensBurned ? 'Tokens revoked on-chain.' : 'No tokens to revoke.'}`
    });
});

