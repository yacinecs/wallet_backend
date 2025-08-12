const Transaction = require('../models/transactionModel');
const Wallet = require('../models/walletModel');

exports.getTransactionHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const transactions = await Transaction.getByUserId(userId, parseInt(limit), offset);
    const stats = await Transaction.getTransactionStats(userId);

    res.json({
      transactions,
      stats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(stats.total_transactions)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
};

exports.getTransactionById = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const userId = req.user.userId;

    const transaction = await Transaction.getById(transactionId);
    
    if (!transaction || transaction.user_id !== userId) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
};

exports.transferMoney = async (req, res) => {
  try {
    const fromUserId = req.user.userId;
    const { recipientEmail, amount, description = 'Transfer' } = req.body;

    if (!recipientEmail || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Recipient email and positive amount required' });
    }

    // Find recipient by email
    const db = require('../config/db');
    const recipientResult = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [recipientEmail]
    );

    if (recipientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    const toUserId = recipientResult.rows[0].id;

    if (fromUserId === toUserId) {
      return res.status(400).json({ error: 'Cannot transfer to yourself' });
    }

    const result = await Wallet.transferMoney(fromUserId, toUserId, amount, description);

    res.json({
      message: 'Transfer completed successfully',
      transfer: {
        amount: parseFloat(amount),
        recipient: recipientEmail,
        description,
        newBalance: result.fromWallet.balance
      }
    });
  } catch (err) {
    console.error(err);
    if (err.message === 'Insufficient balance') {
      return res.status(400).json({ error: err.message });
    }
    if (err.message === 'One or both wallets not found') {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    res.status(500).json({ error: 'Server Error' });
  }
};
