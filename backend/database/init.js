const { db } = require("./pg-wrapper");
const bcrypt = require("bcryptjs");

asyn function initDatabase() {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        phone TEXT UNIQUE NOT NULL,
        email TEXT,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('citizen', 'vendor', 'admin', 'rbi_admin')),
        wallet_address TEXT,
        wallet_private_key_enc TEXT,
        otp TEXT,
        otp_expires_at TIMESTAMP,
        phone_verified INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS citizens_gov_db (
        id SERIAL PRIMARY KEY,
        pan TEXT UNIQUE NOT NULL,
        kisan_card TEXT,
        name TEXT NOT NULL,
        is_farmer INTEGER DEFAULT 0,
        occupation TEXT DEFAULT 'Other',
        land_acres REAL,
        annual_income REAL,
        mobile TEXT NOT NULL,
        email TEXT,
        district TEXT,
        state TEXT DEFAULT 'India',
        verified INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS vendors_gov_db (
        id SERIAL PRIMARY KEY,
        business_name TEXT NOT NULL,
        vendor_type TEXT CHECK(vendor_type IN ('FarmingSupplier', 'CropBuyer')),
        owner_name TEXT NOT NULL,
        degree TEXT,
        license_number TEXT,
        itr_status TEXT DEFAULT 'Filed',
        bank_account TEXT,
        ifsc_code TEXT,
        mobile TEXT,
        district TEXT,
        state TEXT DEFAULT 'India'
        );

        CREATE TABLE IF NOT EXISTS schemes (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        total_fund REAL,
        per_citizen_amount REAL,
        instalment_count INTEGER DEFAULT 1,
        instalment_amount REAL,
        current_instalment INTEGER DEFAULT 0,
        target_occupation TEXT DEFAULT 'Farmer',
        status TEXT DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS activity_log (
        is SERIAL PROMARY KEY,
        activity_type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        actor_id INTEGER,
        scheme_id INTEGER,
        amount REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS citizen_applications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        scheme_id INTEGER NOT NULL,
        pan TEXT ,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS vendor_applications (