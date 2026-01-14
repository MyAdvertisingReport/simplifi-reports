/**
 * Reset Admin User Script
 * Run this to reset the admin password: node reset-admin.js
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, 'data', 'reports.db');

async function resetAdmin() {
  console.log('Resetting admin user...');
  
  // Ensure data directory exists
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Initialize SQL.js
  const SQL = await initSqlJs();

  let db;
  // Load existing database or create new one
  if (fs.existsSync(DB_PATH)) {
    console.log('Loading existing database...');
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    console.log('Creating new database...');
    db = new SQL.Database();
  }

  // Create users table if it doesn't exist
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'sales')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Delete existing admin user if exists
  db.run("DELETE FROM users WHERE email = 'admin@example.com'");
  
  // Create new admin user
  const adminId = uuidv4();
  const passwordHash = bcrypt.hashSync('admin123', 10);
  
  db.run(`
    INSERT INTO users (id, email, password_hash, name, role)
    VALUES (?, ?, ?, ?, ?)
  `, [adminId, 'admin@example.com', passwordHash, 'Admin User', 'admin']);

  // Save database
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);

  console.log('');
  console.log('✅ Admin user reset successfully!');
  console.log('');
  console.log('Login credentials:');
  console.log('  Email:    admin@example.com');
  console.log('  Password: admin123');
  console.log('');
  
  db.close();
}

resetAdmin().catch(console.error);
