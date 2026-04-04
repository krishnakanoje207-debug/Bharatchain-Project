require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const express = require("express");
const cors = require("cors");
const { initDatabase } = require("./database/init");

const app = express();
const PORT = process.env.PORT || process.env.BACKEND_PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize database
let db;

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/verify", require("./routes/verify"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/blockchain", require("./routes/blockchain"));
app.use("/api/ledger", require("./routes/ledger"));

app.get("/", (req, res) => {
    res.json({
        name: "BharatChain Backend API",
        version: "3.0",
        status: "running",
        endpoints: {
        auth: "POST /api/auth/signup, /login, /send-otp, /verify-otp",
        verify: "POST /api/verify/citizen, GET /api/verify/schemes",
        admin: "GET /api/admin/stats, /vendors, /citizens, /schemes, /event-triggers",
        blockchain: "POST /api/blockchain/pay-vendor, GET /api/blockchain/wallet-info",
        health: "GET /api/health"
        }
    });
});

app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
    console.error("Server error:", err);
    res.status(500).json({ error: "Internal server error" });
});

async function start() {
    app.listen(PORT, () => {
        console.log(`🚀 BharatChain Backend Server bound to port ${PORT}...`);
        console.log(`⏳ Waiting for database initialization and seeding (this may take 1-2 minutes on first deploy)...`);
    });

    db = await initDatabase();
    app.locals.db = db;
    

    try {
        const { bootstrap } = require("../scripts/bootstrap");
        await bootstrap(db);
    } catch (e) {
        console.warn("⚠️  Bootstrap skipped:", e.message);
    }

    //CHAIN RESET DETECTOR

    try {
        const { resetSignerCache, getCitizenRegistry, getDeployerSigner } = require("./utils/contractSigner");
        resetSignerCache(); // Always clear address cache on startup

        const { signer, addresses } = getDeployerSigner();
        const code = await signer.provider.getCode(addresses.CitizenRegistry);

        if (code && code !== "0x") {
        const { contract } = getCitizenRegistry();
        const onChainCount = Number(await contract.getTotalCitizens());
        const dbSynced = await db.prepare("SELECT COUNT(*) as count FROM citizen_applications WHERE on_chain_citizen_id IS NOT NULL").get();

        if (dbSynced.count > 0 && onChainCount === 0) {
            // Chain was reset — clear all stale on-chain IDs
            const cleared = await db.prepare("UPDATE citizen_applications SET on_chain_citizen_id = NULL, on_chain_tx_hash = NULL WHERE on_chain_citizen_id IS NOT NULL").run();
            console.log(`🔄 [CHAIN RESET DETECTED] Cleared ${cleared.changes} stale on-chain IDs. Sync scheduler will re-register them.`);
        } else if (dbSynced.count > onChainCount && onChainCount > 0) {
            // Partial reset — clear IDs for citizens beyond what's on-chain
            const stale = await db.prepare(`
            UPDATE citizen_applications SET on_chain_citizen_id = NULL, on_chain_tx_hash = NULL
            WHERE on_chain_citizen_id > ?
            `).run(onChainCount);
            if (stale.changes > 0) {
            console.log(`🔄 [CHAIN PARTIAL RESET] Cleared ${stale.changes} stale on-chain IDs above on-chain count ${onChainCount}`);
            }
        }
        }
    } catch (chainCheckErr) {
        console.warn(`⚠️  Chain reset check skipped: ${chainCheckErr.message}`);
    }

    console.log(` Server initialization complete! Frontend can now connect.`);
    console.log("   Admin:  phone 9000000001 / admin123");
    console.log("   RBI:    phone 9000000002 / rbi123");
    console.log("   Auto-trigger scheduler: every 60s");
    console.log("   On-chain sync scheduler: every 120s\n");

        // AUTO-TRIGGER SCHEDULER
        setInterval(async () => {
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000; // 5h 30m in ms
        const istNow = new Date(now.getTime() + istOffset);
        const currentDate = istNow.toISOString().split("T")[0];
        const currentTime = istNow.toISOString().split("T")[1].slice(0, 5);

        let dueTriggers;
        try {
            dueTriggers = await db.prepare(`
            SELECT et.*, s.per_citizen_amount, s.name as scheme_name
            FROM event_triggers et
            LEFT JOIN schemes s ON et.scheme_id = s.id
            WHERE et.status = 'Scheduled'
                AND (et.scheduled_date < ? OR (et.scheduled_date = ? AND et.scheduled_time <= ?))
            `).all(currentDate, currentDate, currentTime);
        } catch (e) { return; }

        if (dueTriggers.length === 0) return;

        console.log(`\n [SCHEDULER] Found ${dueTriggers.length} due trigger(s) at ${currentDate} ${currentTime}`);

        const { withTxLock } = require("./utils/contractSigner");
        withTxLock(async () => {
            for (const trigger of dueTriggers) {
            try {
                const { ethers } = require("ethers");
                const { getTokenDistributor } = require("./utils/contractSigner");

                const amountPerCitizen = trigger.per_citizen_amount || 6000;
                const amountWei = ethers.parseEther(String(amountPerCitizen));

                console.log(`    [AUTO-EXECUTING] Trigger #${trigger.id} — "${trigger.scheme_name}" — ₹${amountPerCitizen} lump-sum`);

                // Step 0: Ensure ALL approved citizens are on-chain before distribution
                const unsynced = await db.prepare(`
                SELECT ca.*, u.wallet_address
                FROM citizen_applications ca
                JOIN users u ON ca.user_id = u.id
                WHERE ca.status = 'Approved' AND ca.scheme_id = ?
                    AND ca.on_chain_citizen_id IS NULL AND u.wallet_address IS NOT NULL
                `).all(trigger.scheme_id);

                if (unsynced.length > 0) {
                console.log(`    Syncing ${unsynced.length} unregistered citizen(s) before distribution...`);
                const { getCitizenRegistry } = require("./utils/contractSigner");
                for (const c of unsynced) {
                    try {
                    const { contract: cr } = getCitizenRegistry();
                    const zkCommitment = ethers.keccak256(ethers.toUtf8Bytes(`${c.pan}:${c.phone}`));
                    const mobileHash = ethers.keccak256(ethers.toUtf8Bytes(c.phone));
                    const regTx = await cr.registerCitizenByAdmin(c.wallet_address, zkCommitment, mobileHash, c.scheme_id);
                    await regTx.wait();

                    const { contract: cr2 } = getCitizenRegistry();
                    const totalCitizens = await cr2.getTotalCitizens();
                    await db.prepare("UPDATE citizen_applications SET on_chain_citizen_id = ?, on_chain_tx_hash = 'pre-dist-sync' WHERE id = ?")
                        .run(Number(totalCitizens), c.id);
                    // Fund wallet with small gas ETH if needed
                    try {
                        const { getDeployerSigner } = require("./utils/contractSigner");
                        const { signer: fundSigner } = getDeployerSigner();
                        const ethBal = await fundSigner.provider.getBalance(c.wallet_address);
                        if (ethBal < ethers.parseEther("0.001")) {
                        const deployerBal = await fundSigner.provider.getBalance(await fundSigner.getAddress());
                        if (deployerBal > ethers.parseEther("0.01")) {
                            const fundTx = await fundSigner.sendTransaction({ to: c.wallet_address, value: ethers.parseEther("0.005") });
                            await fundTx.wait();
                        }
                        }
                    } catch (fundErr) { /* skip gas funding on error */ }

                    console.log(`   ✅ ${c.citizen_name}: synced to chain (ID ${Number(totalCitizens)})`);
                    } catch (syncErr) {
                    if (syncErr.reason?.includes("already registered")) {
                        try {
                        const { contract: crLookup } = getCitizenRegistry();
                        const data = await crLookup.getCitizenByWallet(c.wallet_address);
                        await db.prepare("UPDATE citizen_applications SET on_chain_citizen_id = ?, on_chain_tx_hash = 'pre-dist-sync' WHERE id = ?")
                            .run(Number(data.id), c.id);
                        } catch { /* ignore */ }
                    } else {
                        console.warn(`   ⚠️ ${c.citizen_name}: ${syncErr.reason || syncErr.message}`);
                    }
                    }
                }
                }

                // Step 1: Configure (fresh signer)
                const { contract: td1 } = getTokenDistributor();
                const configTx = await td1.configureDistribution(trigger.scheme_id, amountWei);
                await configTx.wait();

                // Step 2: Distribute (fresh signer)
                const { contract: td2 } = getTokenDistributor();
                const distTx = await td2.manualDistribute();
                const receipt = await distTx.wait();

                // Step 3: Mark trigger executed
                await db.prepare("UPDATE event_triggers SET status = 'Executed', executed_at = NOW(), error_message = NULL WHERE id = ?")
                .run(trigger.id);

                // Step 4: Mark ONLY on-chain citizens as Funded (prevents marking unsynced citizens)
                const fundedCount = await db.prepare(`
                UPDATE citizen_applications SET status = 'Funded'
                WHERE scheme_id = ? AND status = 'Approved' AND on_chain_citizen_id IS NOT NULL
                `).run(trigger.scheme_id);

                // Step 5: Notify
                const fundedApps = await db.prepare("SELECT user_id, citizen_name, phone FROM citizen_applications WHERE scheme_id = ? AND status = 'Funded'")
                .all(trigger.scheme_id);
                for (const a of fundedApps) {
                await db.prepare("INSERT INTO notifications (user_id, type, recipient, message) VALUES (?, ?, ?, ?)")
                    .run(a.user_id, "sms", a.phone,
                    `Dear ${a.citizen_name}, ₹${amountPerCitizen} Digital Rupees have been deposited to your wallet for "${trigger.scheme_name}".`);
                }

                console.log(`   ✅ [EXECUTED] TX: ${receipt.hash.slice(0,14)}... — ${fundedCount.changes} citizen(s) funded\n`);
            } catch (triggerErr) {
                const errMsg = triggerErr.reason || triggerErr.message || "Unknown error";
                const retryCount = (trigger.retry_count || 0) + 1;

                if (retryCount >= 3) {
                await db.prepare("UPDATE event_triggers SET status = 'Failed', retry_count = ?, error_message = ? WHERE id = ?")
                    .run(retryCount, errMsg, trigger.id);
                console.error(`   ❌ [FAILED] Trigger #${trigger.id} failed after ${retryCount} attempts: ${errMsg}`);
                } else {
                await db.prepare("UPDATE event_triggers SET retry_count = ?, error_message = ? WHERE id = ?")
                    .run(retryCount, errMsg, trigger.id);
                console.warn(`   ⚠️ [RETRY ${retryCount}/3] Trigger #${trigger.id}: ${errMsg}`);
                }
            }
            }
        }).catch(err => {
            if (!err.message?.includes("deployed-addresses")) {
            console.error("❌ [SCHEDULER ERROR]", err.message);
            }
        });
        }, 60_000);