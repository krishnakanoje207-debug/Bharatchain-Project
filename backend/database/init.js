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
            id SERIAL PRIMARY KEY,
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
            phone TEXT,
            citizen_name TEXT,
            occupation TEXT,
            district TEXT,
            state TEXT,
            status TEXT DEFAULT 'Pending' CHECK(status IN ('Pending', 'Approved', 'Rejected', 'Funded')),
            rejection_reason TEXT,
            on_chain_citizen_id INTEGER,
            on_chain_tx_hash TEXT,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            reviewed_at TIMESTAMP,
            UNIQUE(user_id, scheme_id)
        );

        CREATE TABLE IF NOT EXISTS event-triggers (
            id SERIAL PRIMARY KEY,
            scheme_id INTEGER NOT NULL,
            instalment_number INTEGER NOT NULL DEFAULT 1,
            scheduled_date TEXT NOT NULL,
            scheduled_time TEXT NOT NULL,
            status TEXT DEFAULT 'Scheduled' CHECK(status IN ('Scheduled', 'Executed', 'Cancelled', 'Failed')),
            retry_count INTEGER DEFAULT 0,
            error_message TEXT,
            created_by INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            executed_at TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS vendor_applications (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            business_name TEXT NOT NULL,
            venodr_type TEXT DEFAULT 'FarmingSupplier',
            credential TEXT,
            bank_account TEXT,
            ifsc_code TEXT,
            mobile TEXT,
            wallet_address TEXT,
            status TEXT DEFAULT 'Pending' CHECK(status IN ('Pending', 'Approved', 'Rejected')),
            rejection_reason TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            reviewed_at TIMESTAMP,
            UNIQUE(user_id)
        );

        CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            type TEXT CHECK(type IN ('sms', 'email', 'system')),
            recipient TEXT NOT NULL,
            message TEXT NOT NULL,
            status TEXT DEFAULT 'sent',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS otp_store (
            id SERIAL PRIMARY KEY,
            tx_type TEXT NOT NULL CHECK(tx_type IN ('TokenMint','TokenAllocation','CitizenToVendor','VendorExchange','TokenRevocation')),
            from_address TEXT,
            to_address TEXT,
            amount REAL NOT NULL,
            description TEXT,
            tx_hash TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);




}
