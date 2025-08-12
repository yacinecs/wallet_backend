const pool = require('../config/db');
const BlockchainService = require('../services/blockchainService');
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_KEY || 'your-32-char-secret-key-here!!';

// Encrypt sensitive data
function encrypt(text) {
  const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

// Decrypt sensitive data
function decrypt(encryptedText) {
  const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

class BlockchainController {
  
  // Generate blockchain wallet for user
  async generateWallet(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const userId = req.user.userId; // Fixed: use userId instead of id
      
      // Check if user already has a blockchain wallet
      const existingWallet = await client.query(
        'SELECT blockchain_address FROM wallets WHERE user_id = $1 AND blockchain_address IS NOT NULL',
        [userId]
      );
      
      if (existingWallet.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'User already has a blockchain wallet',
          address: existingWallet.rows[0].blockchain_address
        });
      }
      
      // Generate new wallet
      const wallet = BlockchainService.generateWalletAddress();
      
      // Encrypt private key and mnemonic
      const encryptedPrivateKey = encrypt(wallet.privateKey);
      const encryptedMnemonic = encrypt(wallet.mnemonic);
      
      // Update user's wallet with blockchain info
      await client.query(
        `UPDATE wallets 
         SET blockchain_address = $1, 
             private_key_encrypted = $2, 
             mnemonic_encrypted = $3,
             last_blockchain_sync = now()
         WHERE user_id = $4`,
        [wallet.address, encryptedPrivateKey, encryptedMnemonic, userId]
      );
      
      // Create wallet address record
      await client.query(
        `INSERT INTO wallet_addresses 
         (user_id, wallet_id, address, private_key_encrypted, address_type) 
         VALUES ($1, (SELECT id FROM wallets WHERE user_id = $1), $2, $3, 'primary')`,
        [userId, wallet.address, encryptedPrivateKey]
      );
      
      await client.query('COMMIT');
      
      res.json({
        success: true,
        message: 'Blockchain wallet generated successfully',
        data: {
          address: wallet.address,
          mnemonic: wallet.mnemonic // Only send once for backup
        }
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Generate wallet error:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating blockchain wallet',
        error: error.message
      });
    } finally {
      client.release();
    }
  }
  
  // Get blockchain balance
  async getBlockchainBalance(req, res) {
    try {
      const userId = req.user.userId;
      
      // Get user's blockchain address
      const walletResult = await pool.query(
        'SELECT blockchain_address FROM wallets WHERE user_id = $1',
        [userId]
      );
      
      if (!walletResult.rows.length || !walletResult.rows[0].blockchain_address) {
        return res.status(404).json({
          success: false,
          message: 'No blockchain wallet found for user'
        });
      }
      
      const address = walletResult.rows[0].blockchain_address;
      
      // Get balance from blockchain
      const balance = await BlockchainService.getUSDCBalance(address);
      
      // Update local cache
      await pool.query(
        'UPDATE wallets SET blockchain_balance = $1, last_blockchain_sync = now() WHERE user_id = $2',
        [balance, userId]
      );
      
      res.json({
        success: true,
        data: {
          address,
          balance: parseFloat(balance),
          lastSync: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('Get blockchain balance error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching blockchain balance',
        error: error.message
      });
    }
  }
  
  // Deposit USDC from blockchain to internal wallet
  async depositFromBlockchain(req, res) {
    const { amount, txHash } = req.body;
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const userId = req.user.userId;
      
      // Validate transaction hash exists and amount is positive
      if (!txHash || !amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Transaction hash and positive amount required'
        });
      }
      
      // Check if transaction already processed
      const existingTx = await client.query(
        'SELECT id FROM blockchain_transactions WHERE tx_hash = $1',
        [txHash]
      );
      
      if (existingTx.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Transaction already processed'
        });
      }
      
      // Get user's wallet
      const walletResult = await client.query(
        'SELECT id, balance, blockchain_address FROM wallets WHERE user_id = $1',
        [userId]
      );
      
      if (!walletResult.rows.length) {
        throw new Error('Wallet not found');
      }
      
      const wallet = walletResult.rows[0];
      const newBalance = parseFloat(wallet.balance) + parseFloat(amount);
      
      // Update wallet balance
      await client.query(
        'UPDATE wallets SET balance = $1 WHERE id = $2',
        [newBalance, wallet.id]
      );
      
      // Create transaction record
      const transactionResult = await client.query(
        `INSERT INTO transactions 
         (user_id, wallet_id, type, amount, balance_before, balance_after, 
          description, blockchain_tx_hash, blockchain_status) 
         VALUES ($1, $2, 'blockchain_deposit', $3, $4, $5, $6, $7, 'confirmed') 
         RETURNING id`,
        [userId, wallet.id, amount, wallet.balance, newBalance, 
         `Blockchain deposit via ${txHash}`, txHash]
      );
      
      // Create blockchain transaction record
      await client.query(
        `INSERT INTO blockchain_transactions 
         (user_id, transaction_id, tx_hash, to_address, amount, status, network) 
         VALUES ($1, $2, $3, $4, $5, 'confirmed', $6)`,
        [userId, transactionResult.rows[0].id, txHash, wallet.blockchain_address, amount, 
         process.env.BLOCKCHAIN_NETWORK || 'ethereum']
      );
      
      await client.query('COMMIT');
      
      res.json({
        success: true,
        message: 'Blockchain deposit processed successfully',
        data: {
          transactionId: transactionResult.rows[0].id,
          amount: parseFloat(amount),
          newBalance,
          txHash
        }
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Blockchain deposit error:', error);
      res.status(500).json({
        success: false,
        message: 'Error processing blockchain deposit',
        error: error.message
      });
    } finally {
      client.release();
    }
  }
  
  // Withdraw USDC from internal wallet to blockchain
  async withdrawToBlockchain(req, res) {
    const { amount, toAddress } = req.body;
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const userId = req.user.userId;
      
      // Validate inputs
      if (!amount || amount <= 0 || !toAddress) {
        return res.status(400).json({
          success: false,
          message: 'Amount and destination address required'
        });
      }
      
      // Get user's wallet with private key
      const walletResult = await client.query(
        'SELECT id, balance, blockchain_address, private_key_encrypted FROM wallets WHERE user_id = $1',
        [userId]
      );
      
      if (!walletResult.rows.length) {
        throw new Error('Wallet not found');
      }
      
      const wallet = walletResult.rows[0];
      
      // Check sufficient balance
      if (parseFloat(wallet.balance) < parseFloat(amount)) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient balance'
        });
      }
      
      if (!wallet.private_key_encrypted) {
        return res.status(400).json({
          success: false,
          message: 'No blockchain wallet configured'
        });
      }
      
      // Decrypt private key
      const privateKey = decrypt(wallet.private_key_encrypted);
      
      // Estimate gas fee (simplified version)
      const gasEstimate = {
        gasPrice: '20',
        totalCost: '0.001',
        totalCostUSD: 2.0
      };
      
      // Execute blockchain withdrawal
      const txResult = await BlockchainService.withdrawUSDC(privateKey, amount);
      
      const newBalance = parseFloat(wallet.balance) - parseFloat(amount);
      
      // Update wallet balance
      await client.query(
        'UPDATE wallets SET balance = $1 WHERE id = $2',
        [newBalance, wallet.id]
      );
      
      // Create transaction record
      const transactionResult = await client.query(
        `INSERT INTO transactions 
         (user_id, wallet_id, type, amount, balance_before, balance_after, 
          description, blockchain_tx_hash, blockchain_status, gas_fee) 
         VALUES ($1, $2, 'blockchain_withdrawal', $3, $4, $5, $6, $7, 'pending', $8) 
         RETURNING id`,
        [userId, wallet.id, amount, wallet.balance, newBalance, 
         `Blockchain withdrawal to ${toAddress}`, txResult.hash, gasEstimate.totalCost]
      );
      
      // Create blockchain transaction record
      await client.query(
        `INSERT INTO blockchain_transactions 
         (user_id, transaction_id, tx_hash, from_address, to_address, amount, 
          gas_price, gas_fee, status, network) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9)`,
        [userId, transactionResult.rows[0].id, txResult.txHash, wallet.blockchain_address, 
         toAddress, amount, gasEstimate.gasPrice, gasEstimate.totalCost, 
         process.env.BLOCKCHAIN_NETWORK || 'testnet']
      );
      
      await client.query('COMMIT');
      
      res.json({
        success: true,
        message: 'Blockchain withdrawal initiated successfully',
        data: {
          transactionId: transactionResult.rows[0].id,
          amount: parseFloat(amount),
          newBalance,
          txHash: txResult.txHash,
          gasFee: gasEstimate.totalCost,
          toAddress
        }
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Blockchain withdrawal error:', error);
      res.status(500).json({
        success: false,
        message: 'Error processing blockchain withdrawal',
        error: error.message
      });
    } finally {
      client.release();
    }
  }
  
  // Get transaction status by hash
  async getTransactionStatus(req, res) {
    try {
      const { txHash } = req.params;
      const userId = req.user.userId;
      
      // Get transaction from database
      const txResult = await pool.query(
        `SELECT bt.*, t.amount, t.type, t.created_at 
         FROM blockchain_transactions bt
         JOIN transactions t ON bt.transaction_id = t.id
         WHERE bt.tx_hash = $1 AND bt.user_id = $2`,
        [txHash, userId]
      );
      
      if (!txResult.rows.length) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }
      
      const transaction = txResult.rows[0];
      
      // Get current status from blockchain
      let blockchainStatus;
      try {
        blockchainStatus = await BlockchainService.getTransactionDetails(txHash);
      } catch (error) {
        console.error('Error fetching blockchain status:', error);
        blockchainStatus = { status: 'pending', confirmations: 0 };
      }
      
      // Update local record if status changed
      if (blockchainStatus.status !== transaction.status) {
        await pool.query(
          `UPDATE blockchain_transactions 
           SET status = $1, confirmations = $2, block_number = $3, confirmed_at = $4
           WHERE tx_hash = $5`,
          [blockchainStatus.status, blockchainStatus.confirmations, 
           blockchainStatus.blockNumber, blockchainStatus.confirmedAt, txHash]
        );
        
        // Update main transaction status
        await pool.query(
          `UPDATE transactions 
           SET blockchain_status = $1, confirmations = $2, block_number = $3
           WHERE blockchain_tx_hash = $4`,
          [blockchainStatus.status, blockchainStatus.confirmations, 
           blockchainStatus.blockNumber, txHash]
        );
      }
      
      res.json({
        success: true,
        data: {
          txHash,
          status: blockchainStatus.status,
          confirmations: blockchainStatus.confirmations,
          blockNumber: blockchainStatus.blockNumber,
          amount: parseFloat(transaction.amount),
          type: transaction.type,
          fromAddress: transaction.from_address,
          toAddress: transaction.to_address,
          gasFee: transaction.gas_fee ? parseFloat(transaction.gas_fee) : null,
          network: transaction.network,
          createdAt: transaction.created_at,
          confirmedAt: blockchainStatus.confirmedAt
        }
      });
      
    } catch (error) {
      console.error('Get transaction status error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching transaction status',
        error: error.message
      });
    }
  }
  
  // Get all blockchain transactions for user
  async getBlockchainTransactions(req, res) {
    try {
      const userId = req.user.userId;
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 10, 100);
      const offset = (page - 1) * limit;
      
      const transactionsResult = await pool.query(
        `SELECT bt.*, t.amount, t.type, t.description, t.created_at
         FROM blockchain_transactions bt
         JOIN transactions t ON bt.transaction_id = t.id
         WHERE bt.user_id = $1
         ORDER BY bt.created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );
      
      const countResult = await pool.query(
        'SELECT COUNT(*) FROM blockchain_transactions WHERE user_id = $1',
        [userId]
      );
      
      const totalTransactions = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(totalTransactions / limit);
      
      res.json({
        success: true,
        data: {
          transactions: transactionsResult.rows.map(tx => ({
            id: tx.id,
            txHash: tx.tx_hash,
            amount: parseFloat(tx.amount),
            type: tx.type,
            status: tx.status,
            confirmations: tx.confirmations,
            fromAddress: tx.from_address,
            toAddress: tx.to_address,
            gasFee: tx.gas_fee ? parseFloat(tx.gas_fee) : null,
            network: tx.network,
            description: tx.description,
            createdAt: tx.created_at,
            confirmedAt: tx.confirmed_at
          })),
          pagination: {
            currentPage: page,
            totalPages,
            totalTransactions,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        }
      });
      
    } catch (error) {
      console.error('Get blockchain transactions error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching blockchain transactions',
        error: error.message
      });
    }
  }
  
  // Sync blockchain balances
  async syncBlockchainBalance(req, res) {
    try {
      const userId = req.user.userId;
      
      const walletResult = await pool.query(
        'SELECT id, blockchain_address, blockchain_balance FROM wallets WHERE user_id = $1',
        [userId]
      );
      
      if (!walletResult.rows.length || !walletResult.rows[0].blockchain_address) {
        return res.status(404).json({
          success: false,
          message: 'No blockchain wallet found'
        });
      }
      
      const wallet = walletResult.rows[0];
      const currentBalance = await BlockchainService.getUSDCBalance(wallet.blockchain_address);
      const previousBalance = parseFloat(wallet.blockchain_balance) || 0;
      
      // Update cached balance
      await pool.query(
        'UPDATE wallets SET blockchain_balance = $1, last_blockchain_sync = now() WHERE id = $2',
        [currentBalance, wallet.id]
      );
      
      res.json({
        success: true,
        message: 'Blockchain balance synced successfully',
        data: {
          address: wallet.blockchain_address,
          previousBalance,
          currentBalance: parseFloat(currentBalance),
          lastSync: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('Sync blockchain balance error:', error);
      res.status(500).json({
        success: false,
        message: 'Error syncing blockchain balance',
        error: error.message
      });
    }
  }
}

module.exports = new BlockchainController();
