const { readDb, writeDb } = require('../services/dbService');

const getSettings = async (req, res) => {
  const db = await readDb(req.userId);
  const safeSettings = { ...db.settings };
  if (safeSettings.password) {
    safeSettings.hasPassword = true;
    safeSettings.password = '********';
  } else {
    safeSettings.hasPassword = false;
  }
  res.json(safeSettings);
};

const updateSettings = async (req, res) => {
  const db = await readDb(req.userId);
  const newSettings = req.body;

  if (newSettings.password === '********') {
    newSettings.password = db.settings.password;
  }

  // Remove demoMode as we are completely deleting it
  delete newSettings.demoMode;

  const emailChanged = (newSettings.email || '').toLowerCase() !== (db.settings.email || '').toLowerCase();
  const passwordChanged = newSettings.password !== db.settings.password;
  const hostChanged = (newSettings.host || '') !== (db.settings.host || '');
  const portChanged = Number(newSettings.port) !== Number(db.settings.port);

  db.settings = { ...db.settings, ...newSettings };

  // If email configuration or connection parameters have changed, clear tracked jobs
  if (emailChanged || passwordChanged || hostChanged || portChanged) {
    db.trackedJobs = [];
  }

  await writeDb(req.userId, db);
  res.json({ success: true, message: 'Settings saved successfully' });
};

const getTracker = async (req, res) => {
  const db = await readDb(req.userId);
  res.json(db.trackedJobs || []);
};

const updateTracker = async (req, res) => {
  const db = await readDb(req.userId);
  const job = req.body;

  if (!job.company || !job.role) {
    return res.status(400).json({ success: false, message: 'Company and Role are required' });
  }

  if (!db.trackedJobs) {
    db.trackedJobs = [];
  }

  const existingIndex = db.trackedJobs.findIndex(j => j.id === job.id);

  if (existingIndex > -1) {
    db.trackedJobs[existingIndex] = { ...db.trackedJobs[existingIndex], ...job, updatedAt: new Date().toISOString() };
  } else {
    const newJob = {
      id: job.id || 'job-' + Date.now(),
      company: job.company,
      role: job.role,
      status: job.status || 'Applied',
      dateApplied: job.dateApplied || new Date().toISOString().split('T')[0],
      notes: job.notes || '',
      emailId: job.emailId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.trackedJobs.push(newJob);
  }

  await writeDb(req.userId, db);
  res.json({ success: true, job });
};

const deleteTrackerJob = async (req, res) => {
  const db = await readDb(req.userId);
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ success: false, message: 'Job ID is required' });
  }

  db.trackedJobs = (db.trackedJobs || []).filter(j => j.id !== id);
  await writeDb(req.userId, db);
  res.json({ success: true, message: 'Job deleted' });
};

const clearTracker = async (req, res) => {
  const db = await readDb(req.userId);
  db.trackedJobs = [];
  await writeDb(req.userId, db);
  res.json({ success: true, message: 'Tracker and dashboard successfully cleared.' });
};

module.exports = { getSettings, updateSettings, getTracker, updateTracker, deleteTrackerJob, clearTracker };
