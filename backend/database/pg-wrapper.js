const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/bharatchain",
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

function convertSql(sqliteQuery) {
  let counter = 1;
  return sqliteQuery.replace(/\?/g, () => `$${counter++}`);
}

class PgStatement {
  constructor(sql, poolClient) {
    this.sql = convertSql(sql);
    this.poolClient = poolClient;
  }

  async get(...args) {
    const res = await this.poolClient.query(this.sql, args);
    return res.rows[0];
  }

  async all(...args) {
    const res = await this.poolClient.query(this.sql, args);
    return res.rows;
  }

  async run(...args) {
    let finalSql = this.sql;
    if (finalSql.trim().toUpperCase().startsWith("INSERT") && !finalSql.toUpperCase().includes("RETURNING")) {
      finalSql += " RETURNING id";
    }
    
    try {
      const res = await this.poolClient.query(finalSql, args);
      return {
        changes: res.rowCount,
        lastInsertRowid: res.rows[0]?.id
      };
    } catch (e) {
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
  }

  prepare(sql) {
    return new PgStatement(sql, this.client);
  }

  async exec(sql) {
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
