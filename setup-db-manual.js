// Database setup utility for Railway deployment
const pool = require('./src/config/db');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  let client;
  
  try {
    console.log('🔄 Connecting to Railway PostgreSQL...');
    
    // Test basic connection first
    client = await pool.connect();
    console.log('✅ Connected to database successfully');
    
    // Check current tables
    const checkQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    
    const existingTables = await client.query(checkQuery);
    console.log('📋 Existing tables:', existingTables.rows.map(r => r.table_name));
    
    if (existingTables.rows.some(r => r.table_name === 'users')) {
      console.log('✅ Tables already exist!');
      return;
    }
    
    // Create tables
    console.log('📋 Creating database tables...');
    
    const sqlFile = path.join(__dirname, 'migrations', 'complete.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    // Execute the complete SQL
    await client.query(sqlContent);
    
    // Verify tables were created
    const newTables = await client.query(checkQuery);
    console.log('✅ Tables created:', newTables.rows.map(r => r.table_name));
    
    console.log('🎉 Database setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    
    // Print connection details for debugging
    console.log('🔍 Debug info:');
    console.log('- DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
    process.exit(0);
  }
}

setupDatabase();
