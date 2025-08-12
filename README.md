# 🚀 USDC Wallet Backend - Railway Deployment Guide

A production-ready Node.js backend for USDC wallet operations with blockchain integration.

## 📋 Features

- **Core Wallet System**: User registration, authentication, virtual wallets
- **Blockchain Integration**: Real USDC transactions, balance checking, wallet generation
- **Security**: JWT authentication, bcrypt hashing, rate limiting, AES-256 encryption
- **Production Ready**: Health checks, error handling, comprehensive logging

## 🌐 Deploy to Railway (Recommended)

### Step 1: Prerequisites
1. Create a [Railway account](https://railway.app)
2. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```
3. Login to Railway:
   ```bash
   railway login
   ```

### Step 2: Initialize Railway Project
1. In your project directory, run:
   ```bash
   railway init
   ```
2. Choose "Create new project"
3. Give your project a name (e.g., "usdc-wallet-backend")

### Step 3: Add PostgreSQL Database
1. In Railway dashboard, click "Add Service"
2. Select "PostgreSQL"
3. Railway will automatically provision a database
4. Note down the connection details

### Step 4: Configure Environment Variables
In Railway dashboard, go to your service → Variables, and add:

```bash
# Server Configuration
PORT=3000
NODE_ENV=production

# Database (Railway will auto-populate these)
DATABASE_URL=postgresql://username:password@host:port/database

# Security Keys (use the generated ones from your .env)
JWT_SECRET=55fa7c8e1ef2b9c4d6a8f5e3c1a9b7d4e2f8c6a0b3d7e5f1c9a4b8d6e0f2a5c3b7
WALLET_ENCRYPTION_KEY=bfd4b0e8c3a7f1d9e5b2c8a6f0d4e7b1c9a5d8e2f6b0c4a7e3d1f5b9c6a0d3e7

# Blockchain Configuration (Production)
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY
USDC_CONTRACT_ADDRESS=0xA0b86a33E6441a8a2B8C88d53c3a12F18E29B7Bd

# Optional: For testnet development
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
USDC_TESTNET_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
```

### Step 5: Deploy Your Code
1. Connect your repository:
   ```bash
   railway link
   ```
2. Deploy:
   ```bash
   railway up
   ```

### Step 6: Run Database Migrations
1. After deployment, run migrations:
   ```bash
   railway run psql $DATABASE_URL -f migrations/complete.sql
   ```

### Step 7: Verify Deployment
1. Check your deployed URL in Railway dashboard
2. Test the health endpoint: `https://your-app.railway.app/health`
3. Should return: `{"status":"ok","timestamp":"..."}`

## 🔧 Railway Configuration Files

### railway.json
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Procfile (backup)
```
web: npm start
```

## 🗄️ Database Setup

Your PostgreSQL database will be automatically created. The migration files handle:

1. **init.sql**: Basic user and wallet tables
2. **blockchain.sql**: Blockchain-specific tables
3. **complete.sql**: Full schema with all features

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Wallet Operations
- `GET /api/wallet/balance` - Get wallet balance
- `POST /api/wallet/transfer` - Transfer between users
- `GET /api/wallet/transactions` - Transaction history

### Blockchain Operations
- `POST /api/blockchain/generate-wallet` - Generate USDC wallet
- `GET /api/blockchain/balance` - Get USDC balance
- `POST /api/blockchain/withdraw` - Withdraw USDC
- `GET /api/blockchain/transactions` - Blockchain transactions

## 🔒 Security Features

- **Rate Limiting**: 100 requests per 15 minutes
- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt with salt rounds
- **Private Key Encryption**: AES-256 encryption
- **CORS Protection**: Configured for production
- **Helmet Security**: HTTP security headers

## 📱 Mobile App Integration

### React Native Example
```javascript
const API_BASE_URL = 'https://your-app.railway.app/api';

const login = async (email, password) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  // Store data.token for subsequent requests
  return data;
};

const getBalance = async (token) => {
  const response = await fetch(`${API_BASE_URL}/wallet/balance`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

### Flutter Example
```dart
class WalletAPI {
  static const String baseUrl = 'https://your-app.railway.app/api';
  
  static Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
    return jsonDecode(response.body);
  }
  
  static Future<Map<String, dynamic>> getBalance(String token) async {
    final response = await http.get(
      Uri.parse('$baseUrl/wallet/balance'),
      headers: {'Authorization': 'Bearer $token'},
    );
    return jsonDecode(response.body);
  }
}
```

## 🛠️ Development

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Test API endpoints
npm test
```

### Environment Setup
1. Copy `.env.example` to `.env`
2. Fill in your local configuration
3. Set up local PostgreSQL database
4. Run migrations: `psql your_db < migrations/complete.sql`

## 📊 Monitoring & Logs

### Railway Dashboard
- View real-time logs
- Monitor resource usage
- Check deployment status
- Manage environment variables

### Health Checks
- Endpoint: `/health`
- Returns server status and timestamp
- Used by Railway for automatic health monitoring

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check DATABASE_URL environment variable
   - Ensure PostgreSQL service is running
   - Verify database credentials

2. **JWT Token Errors**
   - Verify JWT_SECRET is set correctly
   - Check token expiration (24h default)
   - Ensure proper Authorization header format

3. **Blockchain RPC Errors**
   - Verify RPC URL endpoints
   - Check API key validity
   - Ensure network connectivity

4. **Rate Limiting**
   - Default: 100 requests per 15 minutes
   - Returns 429 status when exceeded
   - Implement exponential backoff in clients

### Debug Commands
```bash
# Check Railway logs
railway logs

# Connect to database
railway connect postgres

# Run one-off commands
railway run node --version
```

## 🌍 Production Considerations

### RPC Providers (Choose one)
- **Alchemy**: Reliable, good free tier
- **Infura**: Popular, enterprise features
- **QuickNode**: Fast, global infrastructure
- **Ankr**: Decentralized, cost-effective

### USDC Contract Addresses
- **Ethereum Mainnet**: `0xA0b86a33E6441a8a2B8C88d53c3a12F18E29B7Bd`
- **Polygon**: `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`
- **Sepolia Testnet**: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`

### Scaling
- Railway automatically scales based on usage
- Monitor memory and CPU usage
- Consider database connection pooling
- Implement Redis for session management (future enhancement)

## 📞 Support

For deployment issues:
1. Check Railway documentation: https://docs.railway.app
2. Review deployment logs in Railway dashboard
3. Verify all environment variables are set correctly
4. Test local functionality before deploying

---

**Your USDC wallet backend is now production-ready on Railway!** 🎉

For mobile app development, use the API endpoints above with your deployed Railway URL.
