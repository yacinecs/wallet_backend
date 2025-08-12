const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { generalLimiter } = require("./middleware/rateLimiter");
const app = express();
require("dotenv").config();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(generalLimiter); // Apply rate limiting to all routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoints (no authentication required)
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

app.use("/api/auth", authRoutes);
app.use("/api", walletRoutes);
app.use("/api", transactionRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
