const crypto = require('crypto');

console.log('🔐 Generating Secure Keys for Production');
console.log('=====================================\n');

// Generate JWT Secret (256 bits = 32 bytes)
const jwtSecret = crypto.randomBytes(32).toString('hex');
console.log('JWT_SECRET (for token signing):');
console.log(jwtSecret);
console.log('Length:', jwtSecret.length, 'characters\n');

// Generate Wallet Encryption Key (256 bits = 32 bytes)
const walletEncryptionKey = crypto.randomBytes(32).toString('hex');
console.log('WALLET_ENCRYPTION_KEY (for private key encryption):');
console.log(walletEncryptionKey);
console.log('Length:', walletEncryptionKey.length, 'characters\n');

// Generate alternative base64 versions
const jwtSecretBase64 = crypto.randomBytes(32).toString('base64');
const walletKeyBase64 = crypto.randomBytes(32).toString('base64');

console.log('Alternative Base64 versions:');
console.log('JWT_SECRET (base64):');
console.log(jwtSecretBase64);
console.log('\nWALLET_ENCRYPTION_KEY (base64):');
console.log(walletKeyBase64);

console.log('\n📝 Usage Instructions:');
console.log('===================');
console.log('1. Copy the hex versions above');
console.log('2. Use them in your .env file or hosting platform');
console.log('3. NEVER share these keys publicly');
console.log('4. Store them securely (password manager recommended)');
console.log('5. Use different keys for development/staging/production');

console.log('\n⚠️  Security Notes:');
console.log('==================');
console.log('• JWT_SECRET: Used to sign and verify authentication tokens');
console.log('• WALLET_ENCRYPTION_KEY: Used to encrypt/decrypt private keys in database');
console.log('• Both are 256-bit (32-byte) keys for maximum security');
console.log('• If you lose WALLET_ENCRYPTION_KEY, encrypted wallets become inaccessible');
console.log('• If JWT_SECRET is compromised, all user sessions are invalid');
