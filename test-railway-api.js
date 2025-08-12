const https = require('https');

class APITester {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.authToken = null;
    this.results = [];
  }

  async makeRequest(path, method = 'GET', data = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      const req = https.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            const parsed = responseData ? JSON.parse(responseData) : {};
            resolve({ 
              status: res.statusCode, 
              data: parsed,
              headers: res.headers 
            });
          } catch (e) {
            resolve({ 
              status: res.statusCode, 
              data: responseData,
              headers: res.headers 
            });
          }
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  log(test, status, message, details = null) {
    const result = {
      test,
      status,
      message,
      details,
      timestamp: new Date().toISOString()
    };
    
    this.results.push(result);
    
    const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${emoji} ${test}: ${message}`);
    if (details) {
      console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
    }
  }

  async runHealthChecks() {
    console.log('\n🏥 Running Health Checks...\n');
    
    try {
      // Test basic health endpoint
      const health = await this.makeRequest('/health');
      if (health.status === 200) {
        this.log('Health Check', 'PASS', 'Basic health endpoint working', health.data);
      } else {
        this.log('Health Check', 'FAIL', `Expected 200, got ${health.status}`, health.data);
      }
    } catch (error) {
      this.log('Health Check', 'FAIL', 'Request failed', error.message);
    }

    try {
      // Test API health endpoint
      const apiHealth = await this.makeRequest('/api/health');
      if (apiHealth.status === 200) {
        this.log('API Health Check', 'PASS', 'API health endpoint working', apiHealth.data);
      } else {
        this.log('API Health Check', 'FAIL', `Expected 200, got ${apiHealth.status}`, apiHealth.data);
      }
    } catch (error) {
      this.log('API Health Check', 'FAIL', 'Request failed', error.message);
    }
  }

  async runAuthTests() {
    console.log('\n🔐 Running Authentication Tests...\n');
    
    const testUser = {
      email: `test${Date.now()}@example.com`,
      password: 'password123',
      firstName: 'Test',
      lastName: 'User'
    };

    try {
      // Test user registration
      const register = await this.makeRequest('/api/auth/register', 'POST', testUser);
      
      if (register.status === 201) {
        this.log('User Registration', 'PASS', 'User registered successfully', {
          email: testUser.email,
          userId: register.data.user?.id
        });
        
        // Save token if provided
        if (register.data.token) {
          this.authToken = register.data.token;
        }
      } else {
        this.log('User Registration', 'FAIL', `Expected 201, got ${register.status}`, register.data);
      }
    } catch (error) {
      this.log('User Registration', 'FAIL', 'Request failed', error.message);
    }

    try {
      // Test user login
      const login = await this.makeRequest('/api/auth/login', 'POST', {
        email: testUser.email,
        password: testUser.password
      });
      
      if (login.status === 200) {
        this.log('User Login', 'PASS', 'User logged in successfully');
        
        // Save token
        if (login.data.token) {
          this.authToken = login.data.token;
        }
      } else {
        this.log('User Login', 'FAIL', `Expected 200, got ${login.status}`, login.data);
      }
    } catch (error) {
      this.log('User Login', 'FAIL', 'Request failed', error.message);
    }
  }

  async runWalletTests() {
    console.log('\n💳 Running Wallet Tests...\n');
    
    if (!this.authToken) {
      this.log('Wallet Tests', 'SKIP', 'No auth token available');
      return;
    }

    const authHeaders = { Authorization: `Bearer ${this.authToken}` };

    try {
      // Test get wallet
      const wallet = await this.makeRequest('/api/wallet', 'GET', null, authHeaders);
      
      if (wallet.status === 200) {
        this.log('Get Wallet', 'PASS', 'Wallet retrieved successfully', {
          walletId: wallet.data.id,
          balance: wallet.data.balance
        });
      } else {
        this.log('Get Wallet', 'FAIL', `Expected 200, got ${wallet.status}`, wallet.data);
      }
    } catch (error) {
      this.log('Get Wallet', 'FAIL', 'Request failed', error.message);
    }

    try {
      // Test get wallet balance
      const balance = await this.makeRequest('/api/wallet/balance', 'GET', null, authHeaders);
      
      if (balance.status === 200) {
        this.log('Get Wallet Balance', 'PASS', 'Balance retrieved successfully', balance.data);
      } else {
        this.log('Get Wallet Balance', 'FAIL', `Expected 200, got ${balance.status}`, balance.data);
      }
    } catch (error) {
      this.log('Get Wallet Balance', 'FAIL', 'Request failed', error.message);
    }
  }

  async runTransactionTests() {
    console.log('\n💸 Running Transaction Tests...\n');
    
    if (!this.authToken) {
      this.log('Transaction Tests', 'SKIP', 'No auth token available');
      return;
    }

    const authHeaders = { Authorization: `Bearer ${this.authToken}` };

    try {
      // Test get transactions
      const transactions = await this.makeRequest('/api/transactions', 'GET', null, authHeaders);
      
      if (transactions.status === 200) {
        this.log('Get Transactions', 'PASS', 'Transactions retrieved successfully', {
          count: transactions.data.length || 0
        });
      } else {
        this.log('Get Transactions', 'FAIL', `Expected 200, got ${transactions.status}`, transactions.data);
      }
    } catch (error) {
      this.log('Get Transactions', 'FAIL', 'Request failed', error.message);
    }
  }

  async runBlockchainTests() {
    console.log('\n⛓️ Running Blockchain Tests...\n');
    
    if (!this.authToken) {
      this.log('Blockchain Tests', 'SKIP', 'No auth token available');
      return;
    }

    const authHeaders = { Authorization: `Bearer ${this.authToken}` };

    try {
      // Test generate wallet address
      const generateWallet = await this.makeRequest('/api/blockchain/generate-wallet', 'POST', null, authHeaders);
      
      if (generateWallet.status === 201 || generateWallet.status === 200) {
        this.log('Generate Wallet Address', 'PASS', 'Wallet address generated successfully', {
          address: generateWallet.data.address
        });
      } else {
        this.log('Generate Wallet Address', 'FAIL', `Expected 201/200, got ${generateWallet.status}`, generateWallet.data);
      }
    } catch (error) {
      this.log('Generate Wallet Address', 'FAIL', 'Request failed', error.message);
    }

    try {
      // Test get USDC balance
      const usdcBalance = await this.makeRequest('/api/blockchain/balance', 'GET', null, authHeaders);
      
      if (usdcBalance.status === 200) {
        this.log('Get USDC Balance', 'PASS', 'USDC balance retrieved successfully', usdcBalance.data);
      } else {
        this.log('Get USDC Balance', 'FAIL', `Expected 200, got ${usdcBalance.status}`, usdcBalance.data);
      }
    } catch (error) {
      this.log('Get USDC Balance', 'FAIL', 'Request failed', error.message);
    }
  }

  async runRateLimitTests() {
    console.log('\n🚦 Running Rate Limit Tests...\n');
    
    try {
      // Test rate limiting by making multiple requests quickly
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(this.makeRequest('/health'));
      }
      
      const results = await Promise.all(requests);
      const rateLimited = results.some(r => r.status === 429);
      
      if (rateLimited) {
        this.log('Rate Limiting', 'PASS', 'Rate limiting is working');
      } else {
        this.log('Rate Limiting', 'INFO', 'Rate limiting not triggered (normal for low traffic)');
      }
    } catch (error) {
      this.log('Rate Limiting', 'FAIL', 'Request failed', error.message);
    }
  }

  generateReport() {
    console.log('\n📊 Test Summary Report\n');
    console.log('='.repeat(50));
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const info = this.results.filter(r => r.status === 'INFO').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Info: ${info}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`📝 Total: ${this.results.length}`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`   - ${r.test}: ${r.message}`));
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`🏆 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  }

  async runAllTests() {
    console.log('🚀 Starting Railway API Tests...');
    console.log(`🔗 Testing API at: ${this.baseUrl}`);
    
    await this.runHealthChecks();
    await this.runAuthTests();
    await this.runWalletTests();
    await this.runTransactionTests();
    await this.runBlockchainTests();
    await this.runRateLimitTests();
    
    this.generateReport();
  }
}

// Run the tests
const API_BASE_URL = process.env.API_BASE_URL || 'https://brilliant-expression-production.up.railway.app';
const tester = new APITester(API_BASE_URL);

tester.runAllTests().catch(console.error);
