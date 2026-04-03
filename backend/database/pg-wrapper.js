const { pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/bharatchain",
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

function convertsql(sqlitequery) {
    let counter = 1;
    return sqlite.replace(/\?/g, () => `$${counter++}`);
}

class pgstatement {
    constructor(sql, poolclient) {
        this.sql = convertsql(sql);
        this.poolclient = poolclient;
    }

    async get(...args) {
        const res = await this.poolclient.query(this.sql, args);
        return res.rows[0];
    }

    async all(...args) {
        const res = await this.poolclient.query(this.sql, args);
        return res.rows;
    }

    async run(...args) {
        let finalsql = this.sql;
        if (finalsql.trim().toUpperCase().startsWith("INSERT")) && !finalsql.trim().toUpperCase().includes("RETURNING") {
            finalsql += " RETURNING *";
        }
        try {
        const res = await this.poolClient.query(finalSql, args);
        return {
            changes: res.rowCount,
            lastInsertRowid: res.rows[0]?.id
        };
        } catch (e) {
        // If the RETURNING id fails because the table has no id column, retry without it
        if (e.code === '42703' && finalSql.includes("RETURNING id")) {
            const fallbackSql = finalSql.replace(" RETURNING id", "");
            const res2 = await this.poolClient.query(fallbackSql, args);
            return { changes: res2.rowCount };
        }
        throw e;
        }
    }
    }

    class PgDatabase {
    constructor(client = pool) {
        this.client = client;
    }

    pragma(str) {
        // Ignore SQLite pragmas
    }

    prepare(sql) {
        return new PgStatement(sql, this.client);
    }

    async exec(sql) {
        // pg supports executing multiple statements separated by ';'
        return await this.client.query(sql);
    }

    transaction(fn) {
        return async (...args) => {
        const txClient = await pool.connect();
        try {
            await txClient.query("BEGIN");
            const txDb = new PgDatabase(txClient);
            const result = await fn(txDb, ...args);
            await txClient.query("COMMIT");
            return result;
        } catch (e) {
            await txClient.query("ROLLBACK");
            throw e;
        } finally {
            txClient.release();
        }
        };
    }
    }

    module.exports = { db: new PgDatabase(), pool };

    }
}