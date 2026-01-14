// Run this script from the backend folder: node fix-credentials.js

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'data', 'reports.db');

async function fixCredentials() {
  const SQL = await initSqlJs();
  
  // Load existing database
  let db;
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
    console.log('✓ Database loaded');
  } else {
    console.error('Database not found at:', DB_PATH);
    process.exit(1);
  }

  // New credentials
  const newEmail = 'justin@wsicnews.com';
  const newPassword = 'abc1234';
  const hashedPassword = bcrypt.hashSync(newPassword, 10);

  try {
    // Show current users
    console.log('\n--- Current Users ---');
    const users = db.exec("SELECT id, email, name, role FROM users");
    if (users.length > 0) {
      users[0].values.forEach(user => {
        console.log(`  ID: ${user[0]}`);
        console.log(`  Email: ${user[1]}`);
        console.log(`  Name: ${user[2]}`);
        console.log(`  Role: ${user[3]}`);
        console.log('');
      });
    }

    // Delete all existing users and create fresh admin
    console.log('--- Resetting admin user ---');
    db.run("DELETE FROM users");
    
    const newId = require('crypto').randomUUID();
    db.run(
      "INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)",
      [newId, newEmail, hashedPassword, 'Justin', 'admin']
    );

    // Verify the new user
    console.log('\n--- Verifying new user ---');
    const verify = db.exec("SELECT id, email, name, role, password_hash FROM users WHERE email = ?", [newEmail]);
    if (verify.length > 0 && verify[0].values.length > 0) {
      const user = verify[0].values[0];
      console.log(`  ID: ${user[0]}`);
      console.log(`  Email: ${user[1]}`);
      console.log(`  Name: ${user[2]}`);
      console.log(`  Role: ${user[3]}`);
      console.log(`  Password hash exists: ${user[4] ? 'YES' : 'NO'}`);
      
      // Test password verification
      const passwordMatches = bcrypt.compareSync(newPassword, user[4]);
      console.log(`  Password verification: ${passwordMatches ? 'PASS ✓' : 'FAIL ✗'}`);
    }

    // Save database
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
    
    console.log('\n========================================');
    console.log('✅ Credentials reset successfully!');
    console.log('========================================');
    console.log('Email:    justin@wsicnews.com');
    console.log('Password: abc1234');
    console.log('========================================');
    console.log('\nNow restart the backend server and try logging in.');
    
  } catch (err) {
    console.error('Error:', err);
  }

  db.close();
}

fixCredentials();
