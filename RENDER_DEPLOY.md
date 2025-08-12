# Render Deployment Guide

## Deploy to Render

1. **Connect GitHub**:
   - Push your code to GitHub
   - Connect your repo to Render

2. **Create Web Service**:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: Node.js

3. **Add PostgreSQL Database**:
   - Create new PostgreSQL service
   - Copy DATABASE_URL to web service

4. **Environment Variables**:
   ```
   NODE_ENV=production
   JWT_SECRET=your_production_secret
   WALLET_ENCRYPTION_KEY=your_32_char_key
   BLOCKCHAIN_NETWORK=testnet
   TESTNET_RPC_URL=your_rpc_url
   USDC_CONTRACT_ADDRESS=0x07865c6E87B9F70255377e024ace6630C1Eaa37F
   ```

5. **Deploy**: Automatic on git push

Free tier includes:
- 750 hours/month
- PostgreSQL database
- Custom domains
- SSL certificates
