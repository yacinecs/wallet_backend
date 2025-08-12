const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { authenticateToken } = require('../middleware/auth');
const { transferLimiter } = require('../middleware/rateLimiter');

// Transaction routes (authentication applied per route)
router.get('/transactions', authenticateToken, transactionController.getTransactionHistory);
router.get('/transactions/:transactionId', authenticateToken, transactionController.getTransactionById);
router.post('/transfer', authenticateToken, transferLimiter, transactionController.transferMoney);

module.exports = router;
