require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3001,
  JWT_SECRET: process.env.JWT_SECRET || 'applytrack_jwt_secret_999',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'applytrack_secure_key_123_456789',
  MONGODB_URI: process.env.MONGODB_URI || null,
};
