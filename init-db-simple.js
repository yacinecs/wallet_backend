// Simple database initialization for Railway
const { Client } = require('pg');
require('dotenv').config();

async function initializeDatabase() {
  console.log('🔄 Starting database initialization...');
  
  // Use the external DATABASE_PUBLIC_URL we set, or fallback to DATABASE_URL
  const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ No database connection string found');
    process.exit(1);
  }
  
  console.log('🔗 Connection string:', connectionString.replace(/:[^:@]*@/, ':***@'));
  
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
  });
  
  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully!');
    
    // Test basic connection
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
      console.log('✅ Tables already exist - skipping creation');
      return;
    }
    
    console.log('📊 Creating database tables...');
    
    // Create tables one by one with error handling
    try {
      console.log('Creating users table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT now()
        )
      `);
      console.log('✅ Users table created');
      
      console.log('Creating wallets table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS wallets (
          id SERIAL PRIMARY KEY,
          user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          balance DECIMAL(10,2) DEFAULT 0.00,
          created_at TIMESTAMP DEFAULT now(),
          updated_at TIMESTAMP DEFAULT now()
        )
      `);
      console.log('✅ Wallets table created');
      
      console.log('Creating transactions table...');
      await client.query(`
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
        )
      `);
      console.log('✅ Transactions table created');
      
      console.log('Creating indexes...');
      await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)');
      console.log('✅ Indexes created');
      
      // Verify tables were created
      const newTablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      
      console.log('🎉 Database setup completed!');
      console.log('📊 Final tables:', newTablesResult.rows.map(r => r.table_name));
      
    } catch (tableError) {
      console.error('❌ Error creating tables:', tableError.message);
      throw tableError;
    }
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    console.error('Error details:', {
      code: error.code,
      detail: error.detail,
      hint: error.hint
    });
    throw error;
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
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
