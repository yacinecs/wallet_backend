const fs = require('fs');
const path = require('path');
const pool = require('../src/config/db');

async function initializeDatabase() {
  let client;
  let retries = 3;
  
  while (retries > 0) {
    try {
      console.log('🔄 Initializing database...');
      
      // Try to get a client with longer timeout
      client = await pool.connect();
      
      // Check if tables already exist
      const checkTablesQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('users', 'wallets', 'transactions');
      `;
      
      const existingTables = await client.query(checkTablesQuery);
      
      if (existingTables.rows.length > 0) {
        console.log('✅ Database tables already exist, skipping initialization');
        return;
      }
      
      console.log('📋 Creating database tables...');
      
      // Read and execute the complete migration SQL file
      const sqlFilePath = path.join(__dirname, '..', 'migrations', 'complete.sql');
      const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
      
      // Split SQL content by semicolons and execute each statement
      const statements = sqlContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      for (const statement of statements) {
        if (statement.trim()) {
          await client.query(statement);
        }
      }
      
      console.log('✅ Database initialized successfully!');
      console.log('📊 Tables created: users, wallets, transactions');
      return; // Success, exit the retry loop
      
    } catch (error) {
      console.error(`❌ Database initialization attempt failed (${4-retries}/3):`, error.message);
      
      if (retries === 1) {
        // Last attempt failed
        console.error('❌ All database initialization attempts failed');
        
        // Don't exit with error in production to allow Railway deployment to continue
        if (process.env.NODE_ENV === 'production') {
          console.log('⚠️  Continuing deployment despite database initialization error...');
          console.log('⚠️  Database tables may need to be created manually');
        } else {
          throw error;
        }
      } else {
        // Wait before retrying
        console.log(`⏳ Waiting 5 seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
      retries--;
    } finally {
      if (client) {
        client.release();
        client = null;
      }
    }
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  initializeDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { initializeDatabase };
