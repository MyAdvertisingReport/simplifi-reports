/**
 * Add Admin User Script
 * Run with: node add-admin.js
 * 
 * Edit the credentials below before running!
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// =============================================
// EDIT THESE CREDENTIALS
// =============================================
const ADMIN_EMAIL = 'justin@wsicnews.com';  // Change to your email
const ADMIN_PASSWORD = 'Radio@1059';   // Change to your password
const ADMIN_NAME = 'Justin';             // Change to your name
// =============================================

// Try multiple possible paths
const possiblePaths = [
  path.join(__dirname, 'data', 'reports.db'),
  path.join(process.cwd(), 'data', 'reports.db'),
  path.join(__dirname, 'data', 'reports'),
  path.join(process.cwd(), 'data', 'reports'),
  path.join(__dirname, 'data', 'reports.sqlite'),
  path.join(process.cwd(), 'data', 'reports.sqlite'),
];

async function addAdmin() {
  try {
    const SQL = await initSqlJs();
    
    // Find the database file
    let DB_PATH = null;
    console.log('Looking for database...');
    console.log('Current directory:', process.cwd());
    console.log('Script directory:', __dirname);
    
    for (const p of possiblePaths) {
      console.log('Checking:', p);
      if (fs.existsSync(p)) {
        DB_PATH = p;
        console.log('Found database at:', p);
        break;
      }
    }
    
    if (!DB_PATH) {
      console.error('\nDatabase not found! Checked paths:');
      possiblePaths.forEach(p => console.error('  -', p));
      console.error('\nMake sure the backend server has been started at least once.');
      process.exit(1);
    }
    
    const fileBuffer = fs.readFileSync(DB_PATH);
    const db = new SQL.Database(fileBuffer);
    
    // Check if user already exists
    const existing = db.exec(`SELECT id FROM users WHERE email = '${ADMIN_EMAIL}'`);
    if (existing.length > 0 && existing[0].values.length > 0) {
      console.log(`User ${ADMIN_EMAIL} already exists. Updating password...`);
      const hashedPassword = bcrypt.hashSync(ADMIN_PASSWORD, 10);
      db.run(`UPDATE users SET password_hash = ?, name = ? WHERE email = ?`, [hashedPassword, ADMIN_NAME, ADMIN_EMAIL]);
    } else {
      // Create new admin user
      const id = uuidv4();
      const hashedPassword = bcrypt.hashSync(ADMIN_PASSWORD, 10);
      
      db.run(`
        INSERT INTO users (id, email, password_hash, name, role)
        VALUES (?, ?, ?, ?, 'admin')
      `, [id, ADMIN_EMAIL, hashedPassword, ADMIN_NAME]);
      
      console.log(`Created admin user: ${ADMIN_EMAIL}`);
    }
    
    // Save database
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
    
    console.log('✓ Admin user saved successfully!');
    console.log(`\nLogin with:`);
    console.log(`  Email: ${ADMIN_EMAIL}`);
    console.log(`  Password: ${ADMIN_PASSWORD}`);
    
    db.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

addAdmin();
