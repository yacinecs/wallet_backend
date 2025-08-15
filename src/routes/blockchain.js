const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const blockchainController = require('../controllers/blockchainController');

// All blockchain routes require auth
router.post('/blockchain/generate-wallet', authenticateToken, blockchainController.generateWallet);
router.get('/blockchain/balance', authenticateToken, blockchainController.getUSDCBalance);
router.get('/blockchain/transactions', authenticateToken, blockchainController.getTransactions);

// Custodial helpers
router.get('/blockchain/custodial/address', authenticateToken, blockchainController.getCustodialAddress);
router.get('/blockchain/custodial/balance', authenticateToken, blockchainController.getCustodialSignerBalance);
router.post('/blockchain/custodial/send', authenticateToken, blockchainController.sendUSDC);
router.get('/blockchain/tx/:hash', authenticateToken, blockchainController.getTxStatus);

module.exports = router;
