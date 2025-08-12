const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');
const { auth } = require('../middleware/rateLimiter');

router.post('/register', auth, register);
router.post('/login', auth, login);

module.exports = router;
