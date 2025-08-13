const db = require('../config/db');

// Placeholder blockchain logic (mocked for Phase 1)
// Later can be replaced with real USDC chain integration
exports.generateWallet = async (req, res) => {
  try {
    const userId = req.user.userId;
    // Mock: deterministically generate a pseudo address from userId
    const address = `0xUSR${String(userId).padStart(6, '0')}ABCD`; 
    res.status(201).json({ address });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
};

exports.getUSDCBalance = async (req, res) => {
  try {
    const userId = req.user.userId;
    // For now, map on-wallet balance as USDC balance placeholder
    const result = await db.query(
      'SELECT balance FROM wallets WHERE user_id = $1',
      [userId]
    );
    const balance = result.rows[0] ? result.rows[0].balance : 0;
    res.json({ token: 'USDC', balance: parseFloat(balance) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const userId = req.user.userId;
    // Mock some chain txs: reflect last 10 app transactions
    const txs = await db.query(
      `SELECT id, type, amount, description, created_at
       FROM transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [userId]
    );
    res.json({ network: 'mock', count: txs.rows.length, transactions: txs.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
};
