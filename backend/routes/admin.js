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