const db = require('../config/db');
const { getUsdcBalance, listTransfers } = require('../services/blockchainService');
const crypto = require('crypto');

exports.generateWallet = async (req, res) => {
  try {
    // Placeholder address derivation; replace with real wallet management if needed
    const userId = req.user.userId;
    const hash = crypto.createHash('sha256').update(`usr:${userId}`).digest('hex');
    const address = `0x${hash.slice(0, 40)}`;
    res.status(201).json({ address, network: process.env.CHAIN_NETWORK || 'unknown' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
};

exports.getUSDCBalance = async (req, res) => {
  try {
    const userId = req.user.userId;
    const hash = crypto.createHash('sha256').update(`usr:${userId}`).digest('hex');
    const address = `0x${hash.slice(0, 40)}`;

    const bal = await getUsdcBalance(address);
    res.json({ network: process.env.CHAIN_NETWORK || 'unknown', address, token: bal.symbol || 'USDC', decimals: bal.decimals, balance: bal.formatted, raw: bal.raw });
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
    res.json({ network: process.env.CHAIN_NETWORK || 'unknown', address, count: events.length, transactions: events });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server Error' });
  }
};
