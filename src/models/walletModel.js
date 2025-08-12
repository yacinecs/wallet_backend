const pool = require("../config/db");
const Transaction = require("./transactionModel");

const Wallet = {
  create: async (userId, balance = 0) => {
    const result = await pool.query(
      "INSERT INTO wallets (user_id, balance) VALUES ($1, $2) RETURNING *",
      [userId, balance]
    );
    return result.rows[0];
  },

  getByUserId: async (userId) => {
    const result = await pool.query(
      "SELECT * FROM wallets WHERE user_id = $1",
      [userId]
    );
    return result.rows[0];
  },

  updateBalance: async (userId, amount) => {
    const result = await pool.query(
      "UPDATE wallets SET balance = $1, updated_at = now() WHERE user_id = $2 RETURNING *",
      [amount, userId]
    );
    return result.rows[0];
  },

  addMoney: async (userId, amount, description = 'Deposit') => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Get current wallet
      const walletResult = await client.query(
        "SELECT * FROM wallets WHERE user_id = $1",
        [userId]
      );
      const wallet = walletResult.rows[0];
      
      if (!wallet) {
        throw new Error('Wallet not found');
      }
      
      const balanceBefore = parseFloat(wallet.balance);
      const balanceAfter = balanceBefore + parseFloat(amount);
      
      // Update wallet balance
      const updatedWalletResult = await client.query(
        "UPDATE wallets SET balance = balance + $1, updated_at = now() WHERE user_id = $2 RETURNING *",
        [amount, userId]
      );
      
      // Create transaction record
      await client.query(
        `INSERT INTO transactions 
         (user_id, wallet_id, type, amount, balance_before, balance_after, description) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, wallet.id, 'deposit', amount, balanceBefore, balanceAfter, description]
      );
      
      await client.query('COMMIT');
      return updatedWalletResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  subtractMoney: async (userId, amount, description = 'Withdrawal') => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Get current wallet
      const walletResult = await client.query(
        "SELECT * FROM wallets WHERE user_id = $1",
        [userId]
      );
      const wallet = walletResult.rows[0];
      
      if (!wallet) {
        throw new Error('Wallet not found');
      }
      
      const balanceBefore = parseFloat(wallet.balance);
      const balanceAfter = balanceBefore - parseFloat(amount);
      
      if (balanceAfter < 0) {
        throw new Error('Insufficient balance');
      }
      
      // Update wallet balance
      const updatedWalletResult = await client.query(
        "UPDATE wallets SET balance = balance - $1, updated_at = now() WHERE user_id = $2 RETURNING *",
        [amount, userId]
      );
      
      // Create transaction record
      await client.query(
        `INSERT INTO transactions 
         (user_id, wallet_id, type, amount, balance_before, balance_after, description) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, wallet.id, 'withdrawal', amount, balanceBefore, balanceAfter, description]
      );
      
      await client.query('COMMIT');
      return updatedWalletResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  transferMoney: async (fromUserId, toUserId, amount, description = 'Transfer') => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Get both wallets
      const fromWalletResult = await client.query(
        "SELECT * FROM wallets WHERE user_id = $1",
        [fromUserId]
      );
      const toWalletResult = await client.query(
        "SELECT * FROM wallets WHERE user_id = $1",
        [toUserId]
      );
      
      const fromWallet = fromWalletResult.rows[0];
      const toWallet = toWalletResult.rows[0];
      
      if (!fromWallet || !toWallet) {
        throw new Error('One or both wallets not found');
      }
      
      const fromBalanceBefore = parseFloat(fromWallet.balance);
      const toBalanceBefore = parseFloat(toWallet.balance);
      
      if (fromBalanceBefore < parseFloat(amount)) {
        throw new Error('Insufficient balance');
      }
      
      const fromBalanceAfter = fromBalanceBefore - parseFloat(amount);
      const toBalanceAfter = toBalanceBefore + parseFloat(amount);
      
      // Update sender wallet
      await client.query(
        "UPDATE wallets SET balance = $1, updated_at = now() WHERE user_id = $2",
        [fromBalanceAfter, fromUserId]
      );
      
      // Update receiver wallet
      await client.query(
        "UPDATE wallets SET balance = $1, updated_at = now() WHERE user_id = $2",
        [toBalanceAfter, toUserId]
      );
      
      // Create transaction records
      await client.query(
        `INSERT INTO transactions 
         (user_id, wallet_id, type, amount, balance_before, balance_after, recipient_id, description) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [fromUserId, fromWallet.id, 'transfer_out', amount, fromBalanceBefore, fromBalanceAfter, toUserId, description]
      );
      
      await client.query(
        `INSERT INTO transactions 
         (user_id, wallet_id, type, amount, balance_before, balance_after, recipient_id, description) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [toUserId, toWallet.id, 'transfer_in', amount, toBalanceBefore, toBalanceAfter, fromUserId, description]
      );
      
      await client.query('COMMIT');
      
      return {
        fromWallet: { ...fromWallet, balance: fromBalanceAfter },
        toWallet: { ...toWallet, balance: toBalanceAfter }
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
};

module.exports = Wallet;
