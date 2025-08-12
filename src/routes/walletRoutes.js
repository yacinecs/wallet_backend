const express = require("express");
const router = express.Router();
const walletController = require("../controllers/walletController");
const { authenticateToken } = require("../middleware/auth");
const { transactionLimiter } = require("../middleware/rateLimiter");

// Wallet routes (authentication applied per route)
router.post("/wallet", authenticateToken, walletController.createWallet);
router.get("/wallet", authenticateToken, walletController.getWallet);
router.get("/wallet/balance", authenticateToken, walletController.getBalance);
router.post("/wallet/add", authenticateToken, transactionLimiter, walletController.addMoney);
router.post("/wallet/subtract", authenticateToken, transactionLimiter, walletController.subtractMoney);

module.exports = router;
