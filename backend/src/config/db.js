const mongoose = require('mongoose');
const config = require('./env');
const fs = require('fs');
const path = require('path');

let isMongoConnected = false;
const DB_FILE = path.join(__dirname, '../../database.json');

function initLocalDb() {
  if (!fs.existsSync(DB_FILE)) {
    const initialDb = { localUsers: [], users: {} };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf8');
  }
}

async function connectMongo() {
  if (isMongoConnected) return true;
  if (!config.MONGODB_URI) {
    initLocalDb();
    return false;
  }

  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('🔌 Connected to MongoDB Atlas Cloud Database!');
    isMongoConnected = true;
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    initLocalDb();
    return false;
  }
}

module.exports = { connectMongo, initLocalDb, DB_FILE };
