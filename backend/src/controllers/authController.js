const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const { connectMongo, initLocalDb, DB_FILE } = require('../config/db');
const { UserModel } = require('../models/mongoModels');
const { writeDb } = require('../services/dbService');
const config = require('../config/env');

const signup = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const isMongo = await connectMongo();
  let userId;

  if (isMongo) {
    try {
      const existingUser = await UserModel.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const newUser = await UserModel.create({
        email: email.toLowerCase(),
        password: passwordHash
      });
      userId = newUser._id.toString();
    } catch (err) {
      console.error('MongoDB Signup Error:', err);
      return res.status(500).json({ success: false, message: 'Database signup error.' });
    }
  } else {
    initLocalDb();
    try {
      const dbContent = fs.readFileSync(DB_FILE, 'utf8');
      const db = JSON.parse(dbContent);
      if (!db.localUsers) db.localUsers = [];

      const existing = db.localUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
      }

      userId = 'user-' + Date.now();
      const passwordHash = await bcrypt.hash(password, 10);

      db.localUsers.push({
        id: userId,
        email: email.toLowerCase(),
        password: passwordHash,
        createdAt: new Date().toISOString()
      });

      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
    } catch (err) {
      console.error('Local JSON Signup Error:', err);
      return res.status(500).json({ success: false, message: 'Local database signup error.' });
    }
  }

  const initialData = {
    settings: {
      email: '',
      password: '',
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      daysToFetch: 30,
      limit: 100
    },
    trackedJobs: []
  };

  await writeDb(userId, initialData);

  const token = jwt.sign({ userId, email: email.toLowerCase() }, config.JWT_SECRET, { expiresIn: '7d' });
  res.json({ success: true, token, user: { email: email.toLowerCase(), userId } });
};

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const isMongo = await connectMongo();
  let userRecord;

  if (isMongo) {
    try {
      const user = await UserModel.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(400).json({ success: false, message: 'Invalid email or password.' });
      }
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(400).json({ success: false, message: 'Invalid email or password.' });
      }
      userRecord = { userId: user._id.toString(), email: user.email };
    } catch (err) {
      console.error('MongoDB Login Error:', err);
      return res.status(500).json({ success: false, message: 'Database login error.' });
    }
  } else {
    initLocalDb();
    try {
      const dbContent = fs.readFileSync(DB_FILE, 'utf8');
      const db = JSON.parse(dbContent);
      if (!db.localUsers) db.localUsers = [];

      const user = db.localUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        return res.status(400).json({ success: false, message: 'Invalid email or password.' });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(400).json({ success: false, message: 'Invalid email or password.' });
      }

      userRecord = { userId: user.id, email: user.email };
    } catch (err) {
      console.error('Local JSON Login Error:', err);
      return res.status(500).json({ success: false, message: 'Local database login error.' });
    }
  }

  const token = jwt.sign({ userId: userRecord.userId, email: userRecord.email }, config.JWT_SECRET, { expiresIn: '7d' });
  res.json({ success: true, token, user: userRecord });
};

const me = async (req, res) => {
  res.json({ success: true, userId: req.userId });
};

module.exports = { signup, login, me };
