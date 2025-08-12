const Wallet = require("../models/walletModel");

exports.createWallet = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Check if wallet already exists
    const existingWallet = await Wallet.getByUserId(userId);
    if (existingWallet) {
      return res.status(400).json({ error: "Wallet already exists for this user" });
    }

    const wallet = await Wallet.create(userId, 0);
    res.status(201).json({ message: "Wallet created successfully", wallet });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
};

exports.getWallet = async (req, res) => {
  try {
    const userId = req.user.userId;
    const wallet = await Wallet.getByUserId(userId);
    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }
    res.json(wallet);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
};

exports.addMoney = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { amount, description = 'Deposit' } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Amount must be positive" });
    }

    const updatedWallet = await Wallet.addMoney(userId, amount, description);
    if (!updatedWallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    res.json({ 
      message: "Money added successfully", 
      wallet: updatedWallet 
    });
  } catch (err) {
    console.error(err);
    if (err.message === 'Wallet not found') {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: "Server Error" });
  }
};

exports.subtractMoney = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { amount, description = 'Withdrawal' } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Amount must be positive" });
    }

    const updatedWallet = await Wallet.subtractMoney(userId, amount, description);
    res.json({ 
      message: "Money deducted successfully", 
      wallet: updatedWallet 
    });
  } catch (err) {
    console.error(err);
    if (err.message === 'Insufficient balance') {
      return res.status(400).json({ error: err.message });
    }
    if (err.message === 'Wallet not found') {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: "Server Error" });
  }
};

exports.getBalance = async (req, res) => {
  try {
    const userId = req.user.userId;
    const wallet = await Wallet.getByUserId(userId);
    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }
    res.json({ balance: wallet.balance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
};
