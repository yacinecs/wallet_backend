const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { generalLimiter } = require("./middleware/rateLimiter");
const { initializeDatabase } = require("../scripts/init-db");
const app = express();
require("dotenv").config();

// Trust proxy for Railway deployment (fixes rate limiting issues)
app.set('trust proxy', 1);

// Initialize database on startup
initializeDatabase().catch(console.error);

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
