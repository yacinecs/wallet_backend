const rateLimit = require('express-rate-limit');

// General API rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // increased from 5 to 20 for easier testing
  message: {
    error: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Transaction rate limiting
const transactionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 transactions per minute
  message: {
    error: 'Too many transactions, please wait before trying again.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Transfer specific rate limiting
const transferLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // limit each IP to 3 transfers per 5 minutes
  message: {
    error: 'Too many transfer attempts, please wait before trying again.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Blockchain operation rate limiting (more restrictive due to gas costs)
const blockchainLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // limit each IP to 5 blockchain operations per 10 minutes
  message: {
    error: 'Too many blockchain operations, please wait before trying again.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  general: generalLimiter,
  auth: authLimiter,
  transaction: transactionLimiter,
  transfer: transferLimiter,
  blockchain: blockchainLimiter
};
