const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { general } = require("./middleware/rateLimiter");
const app = express();
require("dotenv").config();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(general); // Apply rate limiting to all routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
const authRoutes = require("./routes/auth");
const walletRoutes = require("./routes/walletRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const blockchainRoutes = require("./routes/blockchain");

app.use("/api/auth", authRoutes);
app.use("/api", walletRoutes);
app.use("/api", transactionRoutes);
app.use("/api/blockchain", blockchainRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Wallet API with Blockchain Integration is running" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
