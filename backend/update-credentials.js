// Run this script from the backend folder: node update-credentials.js

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'data', 'reports.db');

async function updateCredentials() {
  const SQL = await initSqlJs();
  
  // Load existing database
  let db;
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    console.error('Database not found at:', DB_PATH);
    process.exit(1);
  }

  // New credentials
  const newEmail = 'justin@wsicnews.com';
  const newPassword = 'abc1234';
  const hashedPassword = bcrypt.hashSync(newPassword, 10);

  try {
    // First, let's see the table structure
    console.log('Checking users table structure...');
    const tableInfo = db.exec("PRAGMA table_info(users)");
    console.log('Columns in users table:');
    if (tableInfo.length > 0) {
      tableInfo[0].values.forEach(col => {
        console.log('  -', col[1], '(' + col[2] + ')');
      });
    }

    // Check existing users
    console.log('\nExisting users:');
    const users = db.exec("SELECT * FROM users");
    if (users.length > 0) {
      console.log('Columns:', users[0].columns);
      users[0].values.forEach(user => {
        console.log('User:', user);
      });
    }

    // Find the password column name (might be password_hash or similar)
    const columns = tableInfo[0].values.map(col => col[1]);
    let passwordColumn = 'password';
    if (columns.includes('password_hash')) {
      passwordColumn = 'password_hash';
    } else if (columns.includes('hashed_password')) {
      passwordColumn = 'hashed_password';
    }
    console.log('\nUsing password column:', passwordColumn);

    // Update the admin user
    const existing = db.exec("SELECT * FROM users WHERE role = 'admin' LIMIT 1");
    
    if (existing.length > 0 && existing[0].values.length > 0) {
      const userId = existing[0].values[0][0];
      console.log('\nUpdating admin user with ID:', userId);
      
      // Update credentials
      const updateSQL = `UPDATE users SET email = ?, ${passwordColumn} = ? WHERE id = ?`;
      console.log('SQL:', updateSQL);
      db.run(updateSQL, [newEmail, hashedPassword, userId]);
      console.log('Updated credentials for admin user');
    } else {
      // Create new admin user
      const insertSQL = `INSERT INTO users (id, email, ${passwordColumn}, name, role) VALUES (?, ?, ?, ?, ?)`;
      const newId = require('crypto').randomUUID();
      db.run(insertSQL, [newId, newEmail, hashedPassword, 'Justin', 'admin']);
      console.log('Created new admin user');
    }

    // Save database
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
    
    console.log('\n✅ Credentials updated successfully!');
    console.log('Email:', newEmail);
    console.log('Password:', newPassword);
    console.log('\nYou can now log in with these credentials.');
    
  } catch (err) {
    console.error('Error:', err);
  }

  db.close();
}

updateCredentials();
