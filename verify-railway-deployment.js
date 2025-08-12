// Railway Deployment Verification Script
// Replace RAILWAY_URL with your actual Railway deployment URL

const RAILWAY_URL = process.argv[2] || 'https://your-app-name.railway.app';
const API_BASE = `${RAILWAY_URL}/api`;

console.log('🚀 Testing Railway Deployment...');
console.log(`Testing URL: ${RAILWAY_URL}\n`);

async function testRailwayDeployment() {
  try {
    // 1. Test Health Check
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${RAILWAY_URL}/health`);
    if (!healthResponse.ok) {
      throw new Error(`Health check failed: ${healthResponse.status} ${healthResponse.statusText}`);
    }
    const healthData = await healthResponse.json();
    console.log('✅ Health check passed:', healthData);

    // 2. Test User Registration
    console.log('\n2. Testing user registration...');
    const testUser = {
      email: `test${Date.now()}@railway.com`,
      password: 'SecurePass123!'
    };

    const registerResponse = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    
    if (!registerResponse.ok) {
      const errorData = await registerResponse.json();
      throw new Error(`Registration failed: ${registerResponse.status} - ${JSON.stringify(errorData)}`);
    }
    
    const registerData = await registerResponse.json();
    console.log('✅ User registration passed:', registerData);

    // 3. Test User Login
    console.log('\n3. Testing user login...');
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    
    if (!loginResponse.ok) {
      const errorData = await loginResponse.json();
      throw new Error(`Login failed: ${loginResponse.status} - ${JSON.stringify(errorData)}`);
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ User login passed - Token received');

    // 4. Test Wallet Access
    console.log('\n4. Testing wallet access...');
    const walletResponse = await fetch(`${API_BASE}/wallet`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!walletResponse.ok) {
      const errorData = await walletResponse.json();
      throw new Error(`Wallet access failed: ${walletResponse.status} - ${JSON.stringify(errorData)}`);
    }
    
    const walletData = await walletResponse.json();
    console.log('✅ Wallet access passed:', { id: walletData.id, balance: walletData.balance });

    // 5. Test Add Money
    console.log('\n5. Testing add money...');
    const addMoneyResponse = await fetch(`${API_BASE}/wallet/add`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ amount: 50, description: 'Railway test deposit' })
    });
    
    if (!addMoneyResponse.ok) {
      const errorData = await addMoneyResponse.json();
      throw new Error(`Add money failed: ${addMoneyResponse.status} - ${JSON.stringify(errorData)}`);
    }
    
    const addMoneyData = await addMoneyResponse.json();
    console.log('✅ Add money passed:', { balance: addMoneyData.wallet.balance });

    console.log('\n🎉 Railway deployment verification successful!');
    console.log('\n📊 Deployment Summary:');
    console.log(`• Service URL: ${RAILWAY_URL}`);
    console.log(`• Health endpoint: ${RAILWAY_URL}/health`);
    console.log(`• API base: ${API_BASE}`);
    console.log(`• Database: Connected and functional`);
    console.log(`• Authentication: Working`);
    console.log(`• Wallet API: Operational`);
    console.log(`\n🔗 API Documentation:`);
    console.log(`• Health: GET ${RAILWAY_URL}/health`);
    console.log(`• Register: POST ${API_BASE}/auth/register`);
    console.log(`• Login: POST ${API_BASE}/auth/login`);
    console.log(`• Wallet: GET ${API_BASE}/wallet`);
    console.log(`• Add Money: POST ${API_BASE}/wallet/add`);
    console.log(`• Transfer: POST ${API_BASE}/transfer`);

  } catch (error) {
    console.error('❌ Railway deployment test failed:', error.message);
    console.log('\n🔧 Troubleshooting checklist:');
    console.log('1. ✓ Is the Railway service running and deployed?');
    console.log('2. ✓ Is the PostgreSQL database provisioned and connected?');
    console.log('3. ✓ Are environment variables set (NODE_ENV, JWT_SECRET)?');
    console.log('4. ✓ Check Railway deployment logs for errors');
    console.log('5. ✓ Verify the health endpoint is accessible');
    
    process.exit(1);
  }
}

// Run the test
testRailwayDeployment();
