const { Pool } = require("pg");
require("dotenv").config();

// Railway Database Configuration - Prefer external URL over internal
let pool;
let connectionConfig;

// Try external DATABASE_PUBLIC_URL first (better for Railway), then internal DATABASE_URL
const databaseUrl = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;

if (databaseUrl) {
  // Parse Railway DATABASE_URL for better connection handling
  const dbUrl = new URL(databaseUrl);
  
  connectionConfig = {
    host: dbUrl.hostname,
    port: parseInt(dbUrl.port) || 5432,
    user: dbUrl.username,
    password: dbUrl.password,
    database: dbUrl.pathname.slice(1), // Remove leading '/'
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    
    // Railway-optimized connection settings
    connectionTimeoutMillis: 60000,  // 60 seconds
    idleTimeoutMillis: 30000,        // 30 seconds  
    query_timeout: 60000,            // 60 seconds
    statement_timeout: 60000,        // 60 seconds
    max: 10,                         // Max connections
    min: 2,                          // Min connections
    
    // Keep alive settings for Railway
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    
    // Application name for debugging
    application_name: 'wallet_backend_railway'
  };
  
  const dbType = process.env.DATABASE_PUBLIC_URL ? 'Railway External PostgreSQL' : 'Railway Internal PostgreSQL';
  console.log(`🔗 Using ${dbType}:`, `${dbUrl.hostname}:${dbUrl.port}/${dbUrl.pathname.slice(1)}`);
  
} else {
  // Fallback to individual environment variables
  connectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS,
    database: process.env.DB_NAME || 'wallet_app',
    port: process.env.DB_PORT || 5432,
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    max: 10,
  };
  
  console.log("🔗 Using individual database environment variables");
}

pool = new Pool(connectionConfig);

// Test connection with retry logic
async function testConnection(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      console.log(`✅ Connected to PostgreSQL (attempt ${i + 1})`);
      
      // Test basic query
      await client.query('SELECT NOW()');
      console.log("✅ Database query test successful");
      
      client.release();
      return true;
    } catch (err) {
      console.error(`❌ DB Connection Error (attempt ${i + 1}/${retries}):`, err.message);
      
      if (i === retries - 1) {
        console.error("❌ All connection attempts failed");
        console.error("Connection config:", {
          host: connectionConfig.host,
          port: connectionConfig.port,
          database: connectionConfig.database,
          user: connectionConfig.user,
          ssl: connectionConfig.ssl
        });
      } else {
        console.log(`⏳ Retrying in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  return false;
}

// Test connection on startup
testConnection();

module.exports = pool;
