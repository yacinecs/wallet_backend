const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { authenticateToken } = require('../middleware/auth');
const { transferLimiter } = require('../middleware/rateLimiter');

// All transaction routes require authentication
router.use(authenticateToken);

router.get('/transactions', transactionController.getTransactionHistory);
router.get('/transactions/:transactionId', transactionController.getTransactionById);
router.post('/transfer', transferLimiter, transactionController.transferMoney);

module.exports = router;
