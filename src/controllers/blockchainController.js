const db = require('../config/db');
const { getUsdcBalance, listTransfers } = require('../services/blockchainService');
const crypto = require('crypto');

// Replace mocked logic with real-ish integration scaffolding
exports.generateWallet = async (req, res) => {
  try {
    // NOTE: For production decide custodial vs non-custodial.
    // Here we only generate a pseudo address (no private keys stored) to keep API shape.
    const userId = req.user.userId;
    const hash = crypto.createHash('sha256').update(`usr:${userId}`).digest('hex');
    const address = `0x${hash.slice(0, 40)}`;
    res.status(201).json({ address });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
};

exports.getUSDCBalance = async (req, res) => {
  try {
    const userId = req.user.userId;
    // Fetch saved on-chain address for the user if you persist one (omitted here)
    // For demo, derive deterministic address same as generateWallet above
    const hash = crypto.createHash('sha256').update(`usr:${userId}`).digest('hex');
    const address = `0x${hash.slice(0, 40)}`;

    const bal = await getUsdcBalance(address);
    res.json({ address, token: bal.symbol || 'USDC', decimals: bal.decimals, balance: bal.formatted, raw: bal.raw });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server Error' });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const userId = req.user.userId;
    const hash = require('crypto').createHash('sha256').update(`usr:${userId}`).digest('hex');
    const address = `0x${hash.slice(0, 40)}`;

    const events = await listTransfers(address);
    res.json({ address, network: process.env.CHAIN_NETWORK || 'unknown', count: events.length, transactions: events });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server Error' });
  }
};
