const express = require('express');
const { signup, login, me } = require('../controllers/authController');
const { getSettings, updateSettings, getTracker, updateTracker, deleteTrackerJob } = require('../controllers/trackerController');
const { getEmails, generateResponse } = require('../controllers/emailController');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

router.post('/auth/signup', signup);
router.post('/auth/login', login);
router.get('/auth/me', authenticateToken, me);

router.get('/settings', authenticateToken, getSettings);
router.post('/settings', authenticateToken, updateSettings);

router.get('/tracker', authenticateToken, getTracker);
router.post('/tracker', authenticateToken, updateTracker);
router.post('/tracker/delete', authenticateToken, deleteTrackerJob);

router.get('/emails', authenticateToken, getEmails);
router.post('/generate-response', authenticateToken, generateResponse);

module.exports = router;
