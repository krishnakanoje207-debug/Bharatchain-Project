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