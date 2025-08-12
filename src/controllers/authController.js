const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Wallet = require('../models/walletModel');

const SALT_ROUNDS = 10;

exports.register = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const userResult = await client.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [email, hashed]
    );
    const user = userResult.rows[0];
    
    // Auto-create wallet for new user
    await client.query(
      'INSERT INTO wallets (user_id, balance) VALUES ($1, $2)',
      [user.id, 0]
    );
    
    await client.query('COMMIT');
    res.status(201).json({ 
      message: 'User registered successfully with wallet created',
      user 
    });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') { // unique_violation
      return res.status(400).json({ error: 'Email already registered' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const result = await db.query('SELECT id, email, password_hash FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ 
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};
