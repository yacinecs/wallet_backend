const express = require("express");
const router = express.Router();
const walletController = require("../controllers/walletController");
const { authenticateToken } = require("../middleware/auth");
const { transaction } = require("../middleware/rateLimiter");

// All wallet routes require authentication
router.use(authenticateToken);

router.post("/wallet", walletController.createWallet);
router.get("/wallet", walletController.getWallet);
router.get("/wallet/balance", walletController.getBalance);
router.post("/wallet/add", transaction, walletController.addMoney);
router.post("/wallet/subtract", transaction, walletController.subtractMoney);

module.exports = router;
