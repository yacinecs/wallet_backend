const { Pool } = require("pg");
require("dotenv").config();

// Use Railway's PostgreSQL URL if available, otherwise use individual env vars
// Railway provides DATABASE_URL for postgres connections
let pool;

if (process.env.DATABASE_URL || process.env.RAILWAY_SERVICE_POSTGRES_URL) {
  const connectionString = process.env.DATABASE_URL || process.env.RAILWAY_SERVICE_POSTGRES_URL;
  console.log("🔗 Using database connection string:", connectionString.replace(/:[^:@]*@/, ':***@'));
  
  pool = new Pool({
    connectionString: connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 30000, // 30 seconds (increased from 10)
    idleTimeoutMillis: 60000,       // 60 seconds (increased from 30)
    max: 20,                        // Maximum pool size (increased from 10)
    keepAlive: true,
    keepAliveInitialDelayMillis: 0,
  });
} else {
  console.log("🔗 Using individual database environment variables");
  pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 5432,
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 60000,
    max: 20,
    keepAlive: true,
    keepAliveInitialDelayMillis: 0,
  });
}

pool.connect()
  .then((client) => {
    console.log("✅ Connected to PostgreSQL");
    client.release();
  })
  .catch(err => {
    console.error("❌ DB Connection Error:", err.message);
    console.error("Connection details:", {
      host: err.address || 'unknown',
      port: err.port || 'unknown',
      code: err.code,
      syscall: err.syscall
    });
  });

module.exports = pool;
