const db = require('../config/db');
const { getUsdcBalance, listTransfers, getSignerAddress: svcGetSignerAddress, sendUsdc, getSignerUsdcBalance, getTxReceipt } = require('../services/blockchainService');
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

// Custodial: return signer address (requires CHAIN_PRIVATE_KEY)
exports.getCustodialAddress = async (req, res) => {
  try {
    const address = await svcGetSignerAddress();
    res.json({ network: process.env.CHAIN_NETWORK || 'unknown', address });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server Error' });
  }
};

// Custodial: send USDC from signer to recipient
exports.sendUSDC = async (req, res) => {
  try {
    const { to, amount } = req.body || {};
    if (!to || amount === undefined || amount === null) {
      return res.status(400).json({ error: 'to and amount are required' });
    }
    const result = await sendUsdc({ to, amount });
    const code = result.status === 'success' ? 201 : 500;
    res.status(code).json({ network: process.env.CHAIN_NETWORK || 'unknown', ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server Error' });
  }
};

// Custodial: read signer USDC balance
exports.getCustodialSignerBalance = async (req, res) => {
  try {
    const bal = await getSignerUsdcBalance();
    res.json({ network: process.env.CHAIN_NETWORK || 'unknown', ...bal });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server Error' });
  }
};

// Get transaction status by hash
exports.getTxStatus = async (req, res) => {
  try {
    const { hash } = req.params;
    const receipt = await getTxReceipt(hash);
    if (!receipt) return res.status(404).json({ error: 'Transaction not found' });
    res.json({
      hash,
      blockNumber: receipt.blockNumber ?? null,
      status: receipt.status === 1 ? 'success' : receipt.status === 0 ? 'failed' : 'pending',
      from: receipt.from,
      to: receipt.to,
      gasUsed: receipt.gasUsed ? receipt.gasUsed.toString() : null,
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Bad Request' });
  }
};
