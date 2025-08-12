const express = require('express');
const router = express.Router();
const blockchainController = require('../controllers/blockchainController');
const { authenticateToken } = require('../middleware/auth');
const { general, blockchain } = require('../middleware/rateLimiter');

// Apply authentication to all blockchain routes
router.use(authenticateToken);

// Wallet generation and management
router.post('/generate-wallet', 
  general,
  blockchainController.generateWallet
);

router.get('/balance', 
  general,
  blockchainController.getBlockchainBalance
);

router.post('/sync-balance', 
  general,
  blockchainController.syncBlockchainBalance
);

// Deposit and withdrawal operations
router.post('/deposit', 
  blockchain,
  blockchainController.depositFromBlockchain
);

router.post('/withdraw', 
  blockchain,
  blockchainController.withdrawToBlockchain
);

// Transaction tracking
router.get('/transactions', 
  general,
  blockchainController.getBlockchainTransactions
);

router.get('/transaction/:txHash', 
  general,
  blockchainController.getTransactionStatus
);

module.exports = router;
