const jwt = require('jsonwebtoken');
const config = require('../config/env');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authorization required. Please log in.' });
  }

  jwt.verify(token, config.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Session expired or invalid login.' });
    }
    req.userId = decoded.userId;
    next();
  });
}

module.exports = { authenticateToken };
