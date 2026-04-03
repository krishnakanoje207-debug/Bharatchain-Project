const { db } = require("./pg-wrapper");
const bcrypt = require("bcryptjs");

async function initDatabase() {
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

    try {
        await db.exec(`CREATE UNIQUE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL`);
    } catch(e) {}
    try {
        await db.exec(`CREATE UNIQUE INDEX idx_citizen_apps_pan ON citizen_applications(pan) WHERE pan IS NOT NULL`);
    } catch(e) {}
    try {
        await db.exec(`CREATE UNIQUE INDEX idx_citizen_apps_phone ON citizen_applications(phone) WHERE phone IS NOT NULL`);
    } catch(e) {}
    try {
        await db.exec(`CREATE UNIQUE INDEX idx_vendor_apps_bank ON vendor_applications(bank_account) WHERE bank_account IS NOT NULL`);
    } catch(e) {}
    try {
        await db.exec(`CREATE UNIQUE INDEX idx_vendor_apps_mobile ON vendor_applications(mobile) WHERE mobile IS NOT NULL`);
    } catch(e) {}
    try {
        await db.exec(`CREATE UNIQUE INDEX idx_citizens_gov_mobile ON citizens_gov_db(mobile)`);
    } catch(e) {}
    try {
        await db.exec(`CREATE UNIQUE INDEX idx_citizens_gov_kisan ON citizens_gov_db(kisan_card) WHERE kisan_card IS NOT NULL`);
    } catch(e) {}

    try { await db.exec(`ALTER TABLE citizen_applications ADD COLUMN on_chain_citizen_id INTEGER`);} catch(e) {}
    try { await db.exec(`ALTER TABLE citizen_applications ADD COLUMN on_chain_tx_hash TEXT`); } catch(e) {}
    try { await db.exec('ALTER TABLE event_triggers ADD COLUMN retry_count INTEGER DEFAULT 0'); } catch(e) {}
    try { await db.exec('ALTER TABLE event_triggers ADD COLUMN error_message TEXT'); } catch(e) {}
    try { await db.exec('ALTER TABLE vendor_applications ADD COLUMN on_chain_vendor_id INTEGER'); } catch(e) {}

    //admin seedings - checking
    const userCountRes = await db.query("SELECT COUNT(*) as count FROM users").get();
    if (number(userCountRes.count) === 0) {
        console.log("🌱 Seeding admin users...");
        const adminHash = bcrypt.hashSync("admin123", 10);
        const rbiAdminHash = bcrypt.hashSync("rbi123", 10);
        await db.prepare('INSERT INTO users (phone, email, password_hash, name, role, phone_verified) VALUES (?, ?, ?, ?, ?, ?)')
            .run("9000000001", "admin@bharatchain.gov.in", adminHash, "System Administrator", "admin", 1);
        await db.prepare(`INSERT INTO users (phone, email, password_hash, name, role, phone_verified) VALUES (?, ?, ?, ?, ?, ?)`)
            .run("9000000002", "admin@rbi.gov.in", rbiHash, "RBI Administrator", "rbi_admin", 1);
        console.log("   ✅ Admin: phone 9000000001 / admin123");
        console.log("   ✅ RBI:   phone 9000000002 / rbi123");
    }

    //seed citizens 
    const citizenCountRes = await db.prepare("SELECT COUNT(*) as count FROM citizens_gov_db").get();
    if (Number(citizenCountRes.count) === 0) {
        console.log("🌱 Seeding 1050 citizens (this may take 1-2 minutes on first deploy)...");
        await seedCitizens(db);
    }

    //seeding schemes
    const schemeCountRes = await db.prepare("SELECT COUNT(*) as count FROM schemes").get();
    if (Number(schemeCountRes.count) === 0) {
        console.log("🌱 Seeding PM Kisan scheme...");
        await db.prepare(`INSERT INTO schemes (name, description, total_fund, per_citizen_amount, instalment_count, instalment_amount, target_occupation) VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run("PM Kisan Agriculture Welfare Scheme", "Direct benefit transfer of ₹6,000 Digital Rupees to farmers for purchasing farming supplies and selling crops at fair prices through government-verified vendors. Only eligible for citizens with occupation: Farmer.", 10000000000, 6000, 1, 6000, "Farmer");
        console.log("   ✅ PM Kisan scheme (₹1000 crores, lump-sum ₹6000)");
    }
    console.log("✅ Database ready.");
    return db;
}

//creating dummy citizens
async function seedCitizens(db) {

    const firstNames = [
        "Rajesh","Sunil","Mohan","Deepak","Anil","Ramesh","Suresh","Kamlesh","Dinesh","Mahesh",
        "Vivek","Ajay","Pramod","Sanjay","Ravi","Ashok","Manoj","Bhagwan","Gopal","Shyam",
        "Lakshmi","Sunita","Kamla","Savitri","Geeta","Rekha","Anita","Meena","Pushpa","Sita",
        "Harish","Vijay","Santosh","Balram","Keshav","Tulsi","Janki","Hariom","Devendra","Narendra",
        "Umesh","Pankaj","Alok","Brij","Chandra","Murli","Govind","Shiv","Ram","Jagdish",
        "Priya","Neha","Pooja","Sneha","Ritu","Kavita","Nisha","Aarti","Swati","Manisha",
        "Amit","Rohit","Vikas","Nitin","Sachin","Gaurav","Arun","Varun","Tarun","Karan"
    ];
    const lastNames = [
        "Kumar","Patel","Sharma","Yadav","Verma","Gupta","Tiwari","Sahu","Rajput","Jain",
        "Singh","Mishra","Kushwaha","Malviya","Chouhan","Thakur","Lodhi","Das","Ahirwar","Prajapati",
        "Pandey","Dubey","Shukla","Tripathi","Dwivedi","Pal","Nigam","Prasad","Chauhan","Rao"
    ];
    const states = ["Madhya Pradesh","Uttar Pradesh","Rajasthan","Maharashtra","Bihar","Gujarat","Karnataka","Tamil Nadu","Punjab","Haryana","Chhattisgarh","Jharkhand","Odisha","Andhra Pradesh","Telangana"];
    const districts = ["Bhopal","Indore","Lucknow","Jaipur","Patna","Ahmedabad","Pune","Nagpur","Jabalpur","Gwalior","Varanasi","Rewa","Satna","Vidisha","Ranchi","Raipur","Bhubaneswar","Hyderabad","Chennai","Bengaluru"];
    const occupations = ["Farmer","Farmer","Farmer","Farmer","Shopkeeper","Teacher","Labourer","Driver","Tailor","Carpenter"];

    // Insert 1050 citizens in a transaction
    const tx = db.transaction(async (txDb) => {
        for (let i = 0; i < 1050; i++) {
        const firstName = firstNames[i % firstNames.length];
        const lastName = lastNames[Math.floor(i / firstNames.length) % lastNames.length];
        const suffix = Math.floor(i / (firstNames.length * lastNames.length));
        const name = suffix > 0 ? `${firstName} ${lastName} ${suffix}` : `${firstName} ${lastName}`;
        const pan = `${String.fromCharCode(65+(i%26))}${String.fromCharCode(65+((i+3)%26))}${String.fromCharCode(65+((i+7)%26))}${String.fromCharCode(65+((i+11)%26))}${String.fromCharCode(65+((i+15)%26))}${String(1000+i).padStart(4,"0")}${String.fromCharCode(65+(i%26))}`;
        const occupation = occupations[i % occupations.length];
        const isFarmer = occupation === "Farmer" ? 1 : 0;
        const kisanCard = isFarmer ? `KCC${String(2024000 + i)}` : null;
        const landAcres = isFarmer ? parseFloat((0.5 + Math.random() * 12).toFixed(2)) : 0;
        const income = Math.floor(30000 + Math.random() * 250000);
        const mobile = `${7 + (i % 3)}${String(100000000 + i).slice(0, 9)}`;
        const email = i % 3 === 0 ? `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com` : null;
        await txDb.prepare(`INSERT INTO citizens_gov_db (pan, kisan_card, name, is_farmer, occupation, land_acres, annual_income, mobile, email, district, state) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(pan, kisanCard, name, isFarmer, occupation, landAcres, income, mobile, email, districts[i%districts.length], states[i%states.length]);
        }
    });

    await tx();
    console.log("   ✅ 1050 citizens seeded into gov reference DB (700 farmers + 350 non-farmers)");
    }



    module.exports = { initDatabase, db };

