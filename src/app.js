const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { generalLimiter } = require("./middleware/rateLimiter");
const app = express();
require("dotenv").config();

// Trust proxy for Railway deployment (fixes rate limiting issues)
app.set('trust proxy', 1);

// Don't initialize database on startup - do it lazily when needed

// Security middleware
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(generalLimiter); // Apply rate limiting to all routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoints (no authentication required) - MUST be before other routes
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Wallet API is running" });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Wallet API is running" });
});

// Database test endpoint (for debugging Railway deployment)
app.get("/test-db", async (req, res) => {
  const pool = require("./config/db");
  let client;
  try {
    client = await pool.connect();
    
    // Test basic connection
    const result = await client.query('SELECT NOW() as current_time');
    
    // Check if our tables exist
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    const tables = await client.query(tablesQuery);
    
    res.json({
      status: "success",
      message: "Database connection successful",
      currentTime: result.rows[0].current_time,
      existingTables: tables.rows.map(r => r.table_name),
      tablesCount: tables.rows.length
    });
    
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Database connection failed",
      error: error.message,
      code: error.code
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Database setup endpoint (for Railway deployment)
app.post("/setup-db", async (req, res) => {
  const pool = require("./config/db");
  let client;
  try {
    client = await pool.connect();
    
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT now()
      );
    `);
    
    // Create wallets table
    await client.query(`
      CREATE TABLE IF NOT EXISTS wallets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        balance DECIMAL(10,2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      );
    `);
    
    // Create transactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        wallet_id INTEGER NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'transfer_in', 'transfer_out')),
        amount DECIMAL(10,2) NOT NULL,
        balance_before DECIMAL(10,2) NOT NULL,
        balance_after DECIMAL(10,2) NOT NULL,
        recipient_id INTEGER REFERENCES users(id),
        description TEXT,
        transaction_hash VARCHAR(255),
        status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
        created_at TIMESTAMP DEFAULT now()
      );
    `);
    
    // Create indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);`);
    
    res.json({
      status: "success",
      message: "Database tables created successfully"
    });
    
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Database setup failed",
      error: error.message
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Routes
const authRoutes = require("./routes/auth");
const walletRoutes = require("./routes/walletRoutes");
const transactionRoutes = require("./routes/transactionRoutes");

// Auth routes (no conflicting paths)
app.use("/api/auth", authRoutes);

// Wallet and transaction routes (now only apply auth per endpoint)
app.use("/api", walletRoutes);
app.use("/api", transactionRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
