const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config/env');
const apiRoutes = require('./routes/api');
const { connectMongo } = require('./config/db');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', apiRoutes);

// Serve static React frontend
app.use(express.static(path.join(__dirname, '../../backend/public')));

// Fallback for React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../backend/public/index.html'));
});

// Connect to MongoDB if URI is provided
connectMongo().then((connected) => {
    if(!connected) {
        console.log("Running with local database (JSON)");
    }
});

app.listen(config.PORT, () => {
  console.log(`==================================================`);
  console.log(`  🚀 Job Application Email Checker Server Ready!`);
  console.log(`  URL: http://localhost:${config.PORT}`);
  console.log(`==================================================`);
});
