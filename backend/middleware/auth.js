const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || "bharatchain_default_secret";

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Access Token Required" });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        return res.status(403).json({ error: "Invalid or expired Token" });
    }
}

function requireAdmin(req, res, next) {
    if (!req.user || !["admin", "rbi_admin"].includes(req.user.role)) {
        return res.status(403).json({ error: "Admin access required" });
    }
    next();
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ error: `Required role: ${roles.join(" or ")}` });
        }
        next();
    };
}

module.exports = { authenticateToken, requireAdmin, requireRole, JWT_SECRET };
