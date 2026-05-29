const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const settingsSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  email: { type: String, default: '' },
  password: { type: String, default: '' }, // Encrypted
  host: { type: String, default: 'imap.gmail.com' },
  port: { type: Number, default: 993 },
  tls: { type: Boolean, default: true },
  daysToFetch: { type: Number, default: 30 },
  limit: { type: Number, default: 100 }
});

const trackedJobSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  id: { type: String, required: true },
  company: { type: String, required: true },
  role: { type: String, required: true },
  status: { type: String, default: 'Applied' },
  dateApplied: { type: String },
  notes: { type: String, default: '' },
  emailId: { type: String, default: null },
  createdAt: { type: String },
  updatedAt: { type: String }
});
trackedJobSchema.index({ userId: 1, id: 1 }, { unique: true });

const UserModel = mongoose.models.User || mongoose.model('User', userSchema);
const SettingsModel = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);
const TrackedJobModel = mongoose.models.TrackedJob || mongoose.model('TrackedJob', trackedJobSchema);

module.exports = { UserModel, SettingsModel, TrackedJobModel };
