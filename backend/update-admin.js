/**
 * Update Admin User Credentials
 * Run: node update-admin.js
 */

const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

// NEW CREDENTIALS - CHANGE THESE
const NEW_EMAIL = 'justin@wsicnews.com';
const NEW_PASSWORD = '*JesusLord1*';  // <-- Put your new password here
const OLD_EMAIL = 'admin@example.com';

async function updateAdmin() {
  try {
    const SQL = await initSqlJs();
    const dbPath = path.join(__dirname, 'database.db');
    
    if (!fs.existsSync(dbPath)) {
      console.error('Database file not found:', dbPath);
      return;
    }
    
    const fileBuffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(fileBuffer);
    
    // Hash the new password
    const passwordHash = bcrypt.hashSync(NEW_PASSWORD, 10);
    
    // Update the user
    db.run(
      'UPDATE users SET email = ?, password_hash = ? WHERE email = ?',
      [NEW_EMAIL, passwordHash, OLD_EMAIL]
    );
    
    // Save the database
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
    
    console.log('✓ Admin credentials updated successfully!');
    console.log('  New email:', NEW_EMAIL);
    console.log('  Password has been changed');
    console.log('');
    console.log('You can now log in with the new credentials.');
    
    db.close();
  } catch (error) {
    console.error('Error updating admin:', error.message);
  }
}

updateAdmin();
