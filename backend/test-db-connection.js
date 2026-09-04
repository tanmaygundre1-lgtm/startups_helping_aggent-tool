// Standalone MongoDB connection test — run with: node test-db-connection.js
const dotenv = require('dotenv');
const dns = require('dns');
const mongoose = require('mongoose');

dotenv.config();
dns.setServers(['1.1.1.1', '1.0.0.1']);

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DATABASE_NAME;

console.log('--- Environment Check ---');
console.log('MONGODB_URI set:', Boolean(uri));
console.log('MONGODB_URI length:', uri ? uri.length : 0);
console.log('MONGODB_DATABASE_NAME:', dbName || '(missing)');
console.log('URI starts with mongodb+srv:', uri ? uri.startsWith('mongodb+srv://') : false);

// Check for hidden characters
if (uri) {
  const trimmed = uri.trim();
  if (trimmed !== uri) {
    console.warn('WARNING: MONGODB_URI has leading/trailing whitespace!');
    console.log('  Original length:', uri.length, '| Trimmed length:', trimmed.length);
  }
  // Check for carriage returns or other invisible chars
  const cleaned = uri.replace(/[\r\n\t]/g, '');
  if (cleaned !== uri) {
    console.warn('WARNING: MONGODB_URI contains hidden control characters (\\r, \\n, or \\t)!');
  }
}

console.log('\n--- Attempting Connection ---');
const startTime = Date.now();

mongoose
  .connect(uri ? uri.trim() : '', {
    dbName: dbName,
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  })
  .then(() => {
    const elapsed = Date.now() - startTime;
    console.log(`SUCCESS: Connected in ${elapsed}ms`);
    console.log('Database:', dbName);
    return mongoose.connection.db.admin().ping();
  })
  .then((pingResult) => {
    console.log('Ping result:', JSON.stringify(pingResult));
    process.exit(0);
  })
  .catch((err) => {
    const elapsed = Date.now() - startTime;
    console.error(`\nFAILED after ${elapsed}ms`);
    console.error('Error name:', err.name);
    console.error('Error code:', err.code || '(none)');
    console.error('Error message:', err.message);
    if (err.reason) {
      console.error('Error reason:', String(err.reason));
    }
    if (err.cause) {
      console.error('Error cause:', String(err.cause));
    }
    process.exit(1);
  });
