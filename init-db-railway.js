// Database initialization specifically for Railway internal network
const { Client } = require('pg');

async function initializeDatabase() {
  console.log('🔄 Starting Railway database initialization...');
  
  // Use Railway internal database URL first, then external as fallback
  const internalUrl = process.env.DATABASE_URL;
  const externalUrl = process.env.DATABASE_PUBLIC_URL;
  
  console.log('🔗 Attempting internal connection first...');
  
  const configs = [
    {
      name: 'Internal Railway',
      connectionString: internalUrl,
      ssl: false // Internal connections don't need SSL
    },
    {
      name: 'External Railway',
      connectionString: externalUrl,
      ssl: { rejectUnauthorized: false }
    }
  ];
  
  for (const config of configs) {
    if (!config.connectionString) {
      console.log(`⚠️  Skipping ${config.name} - no connection string`);
      continue;
    }
    
    console.log(`🔌 Trying ${config.name} connection...`);
    console.log(`🔗 URL: ${config.connectionString.replace(/:[^:@]*@/, ':***@')}`);
    
    const client = new Client({
      connectionString: config.connectionString,
      ssl: config.ssl,
      connectionTimeoutMillis: 15000,
      query_timeout: 10000,
    });
    
    try {
      await client.connect();
      console.log(`✅ Connected successfully via ${config.name}!`);
      
      // Test connection
      const timeResult = await client.query('SELECT NOW() as current_time');
      console.log('⏰ Database time:', timeResult.rows[0].current_time);
      
      // Check existing tables
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      
      console.log('📋 Existing tables:', tablesResult.rows.map(r => r.table_name));
      
      if (tablesResult.rows.some(r => r.table_name === 'users')) {
        console.log('✅ Tables already exist - database is ready!');
        await client.end();
        return true;
      }
      
      console.log('📊 Creating database tables...');
      
      // Create all tables
      const createTablesSQL = `
        -- Users table
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT now()
        );
        
        -- Wallets table
        CREATE TABLE IF NOT EXISTS wallets (
          id SERIAL PRIMARY KEY,
          user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          balance DECIMAL(10,2) DEFAULT 0.00,
          created_at TIMESTAMP DEFAULT now(),
          updated_at TIMESTAMP DEFAULT now()
        );
        
        -- Transactions table
        CREATE TABLE IF NOT EXISTS transactions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          wallet_id INTEGER NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
          type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'transfer_in', 'transfer_out')),
          amount DECIMAL(10,2) NOT NULL,
          balance_before DECIMAL(10,2) NOT NULL,
          balance_after DECIMAL(10,2) NOT NULL,
          recipient_id INTEGER REFERENCES users(id),
          description TEXT,
          transaction_hash VARCHAR(255),
          status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
          created_at TIMESTAMP DEFAULT now()
        );
        
        -- Indexes
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
      `;
      
      await client.query(createTablesSQL);
      console.log('✅ All tables and indexes created successfully!');
      
      // Verify tables
      const finalTablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      
      console.log('🎉 Database setup completed!');
      console.log('📊 Final tables:', finalTablesResult.rows.map(r => r.table_name));
      
      await client.end();
      return true;
      
    } catch (error) {
      console.error(`❌ ${config.name} connection failed:`, error.message);
      await client.end().catch(() => {});
      
      // Continue to next config
      continue;
    }
  }
  
  throw new Error('All connection attempts failed');
}

// Run if this file is executed directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('✅ Database initialization completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Database initialization failed:', error.message);
      process.exit(1);
    });
}

module.exports = { initializeDatabase };
