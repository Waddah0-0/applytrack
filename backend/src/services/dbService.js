const { connectMongo, DB_FILE, initLocalDb } = require('../config/db');
const { SettingsModel, TrackedJobModel } = require('../models/mongoModels');
const { decrypt, encrypt } = require('../utils/crypto');
const fs = require('fs');

async function readDb(userId) {
  const isMongo = await connectMongo();

  if (isMongo) {
    try {
      let settingsDoc = await SettingsModel.findOne({ userId });
      if (!settingsDoc) {
        settingsDoc = await SettingsModel.create({
          userId,
          email: '',
          password: '',
          host: 'imap.gmail.com',
          port: 993,
          tls: true,
          daysToFetch: 30,
          limit: 100,
          demoMode: true
        });
      }
      const jobsDocs = await TrackedJobModel.find({ userId });

      const settings = settingsDoc.toObject();
      if (settings.password) {
        settings.password = decrypt(settings.password);
      }

      return {
        settings,
        trackedJobs: jobsDocs.map(j => j.toObject())
      };
    } catch (err) {
      console.error('Error reading from MongoDB for user:', userId, err);
      return { settings: { demoMode: true }, trackedJobs: [] };
    }
  } else {
    initLocalDb();
    try {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      const db = JSON.parse(data);
      if (!db.users) db.users = {};
      if (!db.users[userId]) {
        db.users[userId] = {
          settings: {
            email: '',
            password: '',
            host: 'imap.gmail.com',
            port: 993,
            tls: true,
            daysToFetch: 30,
            limit: 100,
            demoMode: true
          },
          trackedJobs: []
        };
      }

      const userDb = db.users[userId];
      const settings = { ...userDb.settings };
      if (settings.password) {
        settings.password = decrypt(settings.password);
      }

      return {
        settings,
        trackedJobs: userDb.trackedJobs || []
      };
    } catch (error) {
      console.error('Error reading database file for user:', userId, error);
      return { settings: { demoMode: true }, trackedJobs: [] };
    }
  }
}

async function writeDb(userId, data) {
  const isMongo = await connectMongo();

  let encryptedPassword = '';
  if (data.settings && data.settings.password) {
    encryptedPassword = encrypt(data.settings.password);
  }

  if (isMongo) {
    try {
      if (data.settings) {
        const settingsToSave = { ...data.settings, userId, password: encryptedPassword };
        await SettingsModel.findOneAndUpdate({ userId }, settingsToSave, { upsert: true, new: true });
      }
      if (data.trackedJobs) {
        const jobIds = data.trackedJobs.map(j => j.id);
        await TrackedJobModel.deleteMany({ userId, id: { $nin: jobIds } });
        for (const job of data.trackedJobs) {
          const jobToSave = { ...job, userId };
          await TrackedJobModel.findOneAndUpdate({ userId, id: job.id }, jobToSave, { upsert: true, new: true });
        }
      }
      return true;
    } catch (err) {
      console.error('Error writing to MongoDB for user:', userId, err);
      return false;
    }
  } else {
    initLocalDb();
    try {
      const dbContent = fs.readFileSync(DB_FILE, 'utf8');
      const db = JSON.parse(dbContent);
      if (!db.users) db.users = {};
      if (!db.users[userId]) {
        db.users[userId] = { settings: {}, trackedJobs: [] };
      }

      if (data.settings) {
        db.users[userId].settings = { ...data.settings, password: encryptedPassword };
      }
      if (data.trackedJobs) {
        db.users[userId].trackedJobs = data.trackedJobs;
      }

      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error('Error writing database file for user:', userId, error);
      return false;
    }
  }
}

module.exports = { readDb, writeDb };
