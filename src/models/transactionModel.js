const pool = require("../config/db");

const Transaction = {
  create: async (transactionData) => {
    const {
      user_id,
      wallet_id,
      type,
      amount,
      balance_before,
      balance_after,
      recipient_id = null,
      description = '',
      transaction_hash = null,
      status = 'completed'
    } = transactionData;

    const result = await pool.query(
      `INSERT INTO transactions 
       (user_id, wallet_id, type, amount, balance_before, balance_after, recipient_id, description, transaction_hash, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
       RETURNING *`,
      [user_id, wallet_id, type, amount, balance_before, balance_after, recipient_id, description, transaction_hash, status]
    );
    return result.rows[0];
  },

  getByUserId: async (userId, limit = 50, offset = 0) => {
    const result = await pool.query(
      `SELECT t.*, u.email as recipient_email 
       FROM transactions t 
       LEFT JOIN users u ON t.recipient_id = u.id 
       WHERE t.user_id = $1 
       ORDER BY t.created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  },

  getById: async (transactionId) => {
    const result = await pool.query(
      `SELECT t.*, u.email as recipient_email 
       FROM transactions t 
       LEFT JOIN users u ON t.recipient_id = u.id 
       WHERE t.id = $1`,
      [transactionId]
    );
    return result.rows[0];
  },

  updateStatus: async (transactionId, status) => {
    const result = await pool.query(
      'UPDATE transactions SET status = $1 WHERE id = $2 RETURNING *',
      [status, transactionId]
    );
    return result.rows[0];
  },

  getTransactionStats: async (userId) => {
    const result = await pool.query(
      `SELECT 
         COUNT(*) as total_transactions,
         SUM(CASE WHEN type IN ('deposit', 'transfer_in') THEN amount ELSE 0 END) as total_received,
         SUM(CASE WHEN type IN ('withdrawal', 'transfer_out') THEN amount ELSE 0 END) as total_sent
       FROM transactions 
       WHERE user_id = $1 AND status = 'completed'`,
      [userId]
    );
    return result.rows[0];
  }
};

module.exports = Transaction;
