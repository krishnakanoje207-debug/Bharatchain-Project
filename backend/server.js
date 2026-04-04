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