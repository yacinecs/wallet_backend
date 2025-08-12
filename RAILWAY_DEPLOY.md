# Railway Deployment Guide

## Prerequisites
1. Railway account (https://railway.app)
2. Git repository with your code
3. Railway CLI (optional but recommended)

## Step 1: Create New Project
1. Go to https://railway.app
2. Click "New Project"
3. Choose "Deploy from GitHub repo" or "Empty project"

## Step 2: Add PostgreSQL Database
1. In your Railway project dashboard
2. Click "New" → "Database" → "Add PostgreSQL"
3. Railway will automatically create a PostgreSQL instance

## Step 3: Deploy Your Application
1. Click "New" → "GitHub Repo" (if not done in step 1)
2. Select your repository
3. Railway will automatically detect it's a Node.js app

## Step 4: Environment Variables
In your Railway service settings, add these environment variables:

**Required Variables:**
- `NODE_ENV=production`
- `JWT_SECRET=your_super_secret_jwt_key_here_change_this`
- `PORT=5000` (Railway usually sets this automatically)

**Database Variables (Automatically set by Railway PostgreSQL):**
- `DATABASE_URL` - Automatically provided by Railway PostgreSQL
- Or individual variables if needed:
  - `DB_HOST`
  - `DB_USER` 
  - `DB_PASS`
  - `DB_NAME`
  - `DB_PORT`

## Step 5: Configure Custom Domain (Optional)
1. In your service settings
2. Go to "Settings" → "Domains"
3. Add your custom domain

## Step 6: Verify Deployment
1. Check the deploy logs for any errors
2. Visit your app's URL
3. Test the health endpoint: `https://your-app.railway.app/health`

## Important Notes
- Railway automatically runs `npm install` and `npm start`
- Database tables are created automatically via the `postinstall` script
- The app uses `DATABASE_URL` environment variable provided by Railway PostgreSQL
- Health check endpoint is configured at `/api/health`

## Troubleshooting
1. **Database connection issues**: Ensure PostgreSQL service is running
2. **Build failures**: Check the build logs in Railway dashboard  
3. **App crashes**: Check the application logs for error details
4. **Environment variables**: Verify all required env vars are set

## API Endpoints
Once deployed, your API will be available at:
- Health check: `GET /health` or `GET /api/health`
- Auth: `POST /api/auth/register`, `POST /api/auth/login`
- Wallet: `GET /api/wallet`, `POST /api/wallet/add`, etc.
- Transactions: `GET /api/transactions`, `POST /api/transfer`

## Testing Your Deployed API
Use the provided Postman collection or test with curl:
```bash
curl https://your-app.railway.app/health
```