# Railway Deployment Guide

## Quick Deploy to Railway

1. **Install Railway CLI**:
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**:
   ```bash
   railway login
   ```

3. **Initialize Project**:
   ```bash
   railway init
   ```

4. **Add PostgreSQL Database**:
   ```bash
   railway add postgresql
   ```

5. **Set Environment Variables**:
   ```bash
   railway variables set JWT_SECRET=your_super_secret_jwt_key_production_2025
   railway variables set WALLET_ENCRYPTION_KEY=your_32_char_encryption_key_prod
   railway variables set BLOCKCHAIN_NETWORK=testnet
   railway variables set TESTNET_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
   railway variables set USDC_CONTRACT_ADDRESS=0x07865c6E87B9F70255377e024ace6630C1Eaa37F
   ```

6. **Deploy**:
   ```bash
   railway up
   ```

## Environment Variables for Production

Set these in Railway dashboard:

### Required Variables
- `NODE_ENV=production`
- `JWT_SECRET=your_super_secure_production_secret`
- `WALLET_ENCRYPTION_KEY=your_32_character_encryption_key`

### Database (Auto-configured by Railway)
- `DATABASE_URL` (automatically set)

### Blockchain Configuration
- `BLOCKCHAIN_NETWORK=mainnet` (or testnet)
- `ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY`
- `POLYGON_RPC_URL=https://polygon-mainnet.infura.io/v3/YOUR_KEY`
- `TESTNET_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY`
- `USDC_CONTRACT_ADDRESS=0xA0b86a33E6441E76C56115BaD63c52B5E8b2d2F7`

Your app will be available at: `https://your-app-name.railway.app`
