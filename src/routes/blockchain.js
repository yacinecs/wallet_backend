const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const blockchainController = require('../controllers/blockchainController');

// All blockchain routes require auth
router.post('/blockchain/generate-wallet', authenticateToken, blockchainController.generateWallet);
router.get('/blockchain/balance', authenticateToken, blockchainController.getUSDCBalance);
router.get('/blockchain/transactions', authenticateToken, blockchainController.getTransactions);

module.exports = router;
