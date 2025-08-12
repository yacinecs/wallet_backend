const { Pool } = require("pg");
require("dotenv").config();

// Use Railway's PostgreSQL URL if available, otherwise use individual env vars
// Railway provides DATABASE_URL for postgres connections
const pool = process.env.DATABASE_URL || process.env.RAILWAY_SERVICE_POSTGRES_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL || process.env.RAILWAY_SERVICE_POSTGRES_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    })
  : new Pool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 5432,
    });

pool.connect()
  .then(() => console.log("✅ Connected to PostgreSQL"))
  .catch(err => console.error("❌ DB Connection Error:", err));

module.exports = pool;
