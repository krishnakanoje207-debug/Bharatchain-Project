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