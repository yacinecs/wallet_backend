const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const walletController = require('../controllers/walletController');
const { authenticateToken } = require('../middleware/auth');
const { transferLimiter, transactionLimiter } = require('../middleware/rateLimiter');

// Transaction routes (authentication applied per route)
router.get('/transactions', authenticateToken, transactionController.getTransactionHistory);
router.get('/transactions/:transactionId', authenticateToken, transactionController.getTransactionById);
router.post('/transfer', authenticateToken, transferLimiter, transactionController.transferMoney);

// Aliases for deposit/withdraw to match client expectations
router.post('/transactions/deposit', authenticateToken, transactionLimiter, walletController.addMoney);
router.post('/transactions/withdraw', authenticateToken, transactionLimiter, walletController.subtractMoney);

module.exports = router;
