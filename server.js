const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { simpleParser } = require('mailparser');
const imaps = require('imap-simple');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static frontend files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

const DB_FILE = path.join(__dirname, 'database.json');

// Secrets & Keys
const JWT_SECRET = process.env.JWT_SECRET || 'applytrack_jwt_secret_999';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'applytrack_secure_key_123_456789';

// Derive 32-byte key securely for AES-256-CBC
const getCryptoKey = () => {
  return crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
};

// AES-256-CBC Symmetric Encryption Helpers
function encrypt(text) {
  if (!text) return '';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', getCryptoKey(), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
  if (!text) return '';
  try {
    const parts = text.split(':');
    if (parts.length !== 2) return text; // Fallback to raw if not encrypted yet
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', getCryptoKey(), iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption failed, returning raw:', err.message);
    return text;
  }
}

// Mongoose Models
let UserModel;
let SettingsModel;
let TrackedJobModel;
let isMongoConnected = false;

async function connectMongo() {
  if (isMongoConnected) return true;
  if (!process.env.MONGODB_URI) return false;
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔌 Connected to MongoDB Atlas Cloud Database!');
    
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
      limit: { type: Number, default: 100 },
      demoMode: { type: Boolean, default: true }
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
    
    UserModel = mongoose.models.User || mongoose.model('User', userSchema);
    SettingsModel = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);
    TrackedJobModel = mongoose.models.TrackedJob || mongoose.model('TrackedJob', trackedJobSchema);
    
    isMongoConnected = true;
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    return false;
  }
}

function initDb() {
  if (!fs.existsSync(DB_FILE)) {
    const initialDb = {
      localUsers: [],
      users: {}
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf8');
  }
}
initDb();

// Asynchronous DB reader isolated by userId
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
    initDb();
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

// Asynchronous DB writer isolated by userId
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
    initDb();
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

// High-fidelity Mock Emails for Demo Mode
const MOCK_EMAILS = [
  {
    id: 'mock-1',
    from: 'OpenAI Recruiting <careers@openai.com>',
    subject: 'Offer Letter: Software Engineer Intern - OpenAI',
    date: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
    snippet: 'Hello! We are absolutely thrilled to extend an offer of employment for the Software Engineer Intern position at OpenAI...',
    body: `Dear Applicant,

We are absolutely thrilled to offer you the position of Software Engineer Intern at OpenAI! The team was incredibly impressed by your technical assessment and interview rounds. 

Details of your offer:
- Role: Software Engineer Intern (Technical Team)
- Start Date: June 15, 2026
- Compensation: Competitive hourly rate + housing stipend
- Location: San Francisco, CA (Hybrid)

Please find the attached formal offer letter. We would appreciate it if you could sign and return it by next Monday to secure your slot.

Congratulations, we are excited to have you join us in building safe and beneficial AGI!

Best regards,
The OpenAI Recruiting Team`,
    category: 'Offer',
    company: 'OpenAI',
    role: 'Software Engineer Intern',
    status: 'unread'
  },
  {
    id: 'mock-2',
    from: 'Meta Careers <noreply@meta.com>',
    subject: 'Meta Interview Invitation: Software Engineer (University Graduate)',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    snippet: 'Hi there! Thank you for your interest in Meta. We would love to schedule a technical screen with you for the Software Engineer role...',
    body: `Hi there,

Thank you for your interest in Meta and for taking the time to apply. 

Your resume has been shortlisted, and we would love to schedule a 45-minute technical screen with one of our software engineers. The interview will focus on data structures, algorithms, and problem-solving.

Please use the scheduling link below to pick a time slot that works best for you over the next two weeks:
https://careers.meta.com/scheduler/interview-screen-39402a

Please prepare a quiet space with stable internet. You will be using a shared coding environment (CoderPad) during the interview.

We look forward to speaking with you!

Best,
Meta University Recruiting`,
    category: 'Interview',
    company: 'Meta',
    role: 'Software Engineer',
    status: 'read'
  },
  {
    id: 'mock-3',
    from: 'Google Careers <noreply@google.com>',
    subject: 'Google Software Engineering Internship: Online Assessment Update',
    date: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    snippet: 'Thank you for applying for the Software Engineering Internship position. The next step in our selection process is the Online Challenge...',
    body: `Hello Applicant,

Thank you for your application for the Software Engineering Internship (Summer 2026) at Google! 

The next step in our selection process is the Google Online Challenge (GOC). This assessment helps us understand your coding, analytical, and problem-solving skills.

- Platform: Google Online Assessment Platform (powered by HackerRank)
- Time Limit: 90 minutes
- Expiration: You must complete the test within 7 days of receiving this email.

Click here to start the challenge: https://assessment.careers.google.com/start-goc?id=839209420

Make sure you have an uninterrupted 90-minute window and a stable internet connection. No external libraries or tools are allowed.

Good luck!
Google University Graduate Team`,
    category: 'Assessment',
    company: 'Google',
    role: 'Software Engineering Intern',
    status: 'read'
  },
  {
    id: 'mock-4',
    from: 'Stripe Recruiting <jobs@stripe.com>',
    subject: 'Thank you for your application to Stripe!',
    date: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 3 days ago
    snippet: 'Hi! We have received your application for the Frontend Engineer role at Stripe. Our team is currently reviewing your profile...',
    body: `Hi there,

Thank you for applying to Stripe! We have received your application for the Frontend Engineer position.

We know that applying for a new job takes time and energy, and we sincerely appreciate your interest in joining Stripe. Our recruiting team is currently reviewing your profile against our open positions.

What happens next?
1. Our team will review your application within the next 5-7 business days.
2. If your background matches what we are looking for, a recruiter will reach out to schedule an introductory phone screen.
3. In any case, we will keep you updated on your application status.

In the meantime, feel free to read more about our work and culture on our blog: https://stripe.com/blog

Best regards,
The Stripe Recruiting Team`,
    category: 'Applied',
    company: 'Stripe',
    role: 'Frontend Engineer',
    status: 'read'
  },
  {
    id: 'mock-5',
    from: 'Netflix Jobs <careers@netflix.com>',
    subject: 'Update regarding your application to Netflix',
    date: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(), // 5 days ago
    snippet: 'Dear applicant, thank you for your interest in Netflix. Unfortunately, we are not moving forward with your application at this time...',
    body: `Dear Applicant,

Thank you for taking the time to apply for the Full Stack Engineer (L5) role at Netflix. We appreciate your interest in our company and the time you spent submitting your application.

After careful review of your background and experience, we regret to inform you that we have decided to move forward with other candidates whose qualifications closely match our current needs.

We receive thousands of applications from highly qualified professionals, making our decisions extremely difficult. We will keep your resume on file for future opportunities that may align with your skillset.

We wish you the very best of luck in your job search and your future professional endeavors.

Sincerely,
Netflix Talent Acquisition`,
    category: 'Rejection',
    company: 'Netflix',
    role: 'Full Stack Engineer',
    status: 'read'
  },
  {
    id: 'mock-6',
    from: 'Starlight Tech <hr@starlighttech.io>',
    subject: 'Starlight Tech - Status Update',
    date: new Date(Date.now() - 1000 * 60 * 60 * 150).toISOString(), // 6 days ago
    snippet: 'Hi! We wanted to update you that we are currently reviewing the first-round interview feedback for the Devops Engineer role...',
    body: `Hi,

Thank you for participating in the first round of interviews for the DevOps Engineer position at Starlight Tech.

Our engineering team is currently reviewing the feedback from all candidates. We expect to complete this process by the end of this week.

We will reach out to you early next week with a status update or instructions for the final round interviews. We appreciate your patience.

Best regards,
Sarah Jenkins
HR Manager, Starlight Tech`,
    category: 'Update',
    company: 'Starlight Tech',
    role: 'DevOps Engineer',
    status: 'read'
  }
];

// Smart parser for job emails
function parseJobEmail(subject, body, from, date) {
  const cleanSubject = (subject || '').trim();
  const cleanBody = (body || '').toLowerCase();
  const cleanFrom = (from || '').trim();

  let company = 'Unknown Company';
  const senderMatch = cleanFrom.match(/^"?([^"<]+)"?\s*<[^>]+>/);
  if (senderMatch) {
    let name = senderMatch[1].trim();
    name = name.replace(/(Recruiting|Careers|Jobs|Talent|HR|No-Reply|Noreply|Notification|HR Team|Team)\b/gi, '').trim();
    name = name.replace(/["']/g, '');
    if (name.length > 1) {
      company = name;
    }
  }

  if (company === 'Unknown Company') {
    const domainMatch = cleanFrom.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (domainMatch) {
      let domain = domainMatch[1].toLowerCase();
      domain = domain.replace(/^(careers|jobs|recruiting|hr|noreply|mail|mail1|info)\./, '');
      const parts = domain.split('.');
      if (parts.length >= 2) {
        let name = parts[parts.length - 2];
        if (['co', 'com', 'org', 'net', 'edu', 'gov'].includes(name) && parts.length > 2) {
          name = parts[parts.length - 3];
        }
        company = name.charAt(0).toUpperCase() + name.slice(1);
      }
    }
  }

  if (company.toLowerCase() === 'gmail' || company.toLowerCase() === 'outlook' || company.toLowerCase() === 'yahoo') {
    company = 'Unknown Company';
  }

  const knownCompanies = ['Google', 'Meta', 'Stripe', 'OpenAI', 'Microsoft', 'Amazon', 'Apple', 'Netflix', 'Tesla', 'Airbnb', 'Uber', 'Lyft', 'Coinbase', 'GitHub', 'Figma', 'Canva', 'LinkedIn', 'Salesforce', 'Adobe', 'TikTok', 'Zoom'];
  for (const kc of knownCompanies) {
    if (cleanSubject.toLowerCase().includes(kc.toLowerCase())) {
      company = kc;
      break;
    }
  }

  let role = 'Software Engineer';
  const roleRegexes = [
    /(software engineer|software developer|swe|full stack developer|fullstack developer|full stack engineer|frontend engineer|frontend developer|backend engineer|backend developer|devops engineer|site reliability engineer|sre|cloud engineer|platform engineer)\b/i,
    /(data scientist|data analyst|data engineer|machine learning engineer|ml engineer|ai engineer|ai researcher|nlp researcher)\b/i,
    /(product manager|pm|project manager|program manager|business analyst|scrum master)\b/i,
    /(ux designer|ui designer|product designer|graphic designer|interaction designer)\b/i,
    /(security engineer|security analyst|cybersecurity specialist|penetration tester)\b/i,
    /(quality assurance engineer|qa engineer|test engineer|automation engineer|qa analyst)\b/i,
    /(mobile developer|ios developer|android developer|react native developer)\b/i,
    /(systems engineer|hardware engineer|embedded systems engineer|firmware engineer)\b/i,
    /(internship|intern|co-op)\b/i
  ];

  let matchedRole = null;
  for (const regex of roleRegexes) {
    const match = cleanSubject.match(regex);
    if (match) {
      matchedRole = match[0];
      break;
    }
  }
  if (!matchedRole) {
    for (const regex of roleRegexes) {
      const match = cleanBody.match(regex);
      if (match) {
        matchedRole = match[0];
        break;
      }
    }
  }

  if (matchedRole) {
    role = matchedRole.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  } else {
    const roleFallbackMatch = cleanSubject.match(/(?:for|position of|role of|apply to|regarding)\s+([^-,:|(|)]+)/i);
    if (roleFallbackMatch && roleFallbackMatch[1].trim().length > 3) {
      role = roleFallbackMatch[1].trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }
  }

  role = role.replace(/\b(at|for|in|with)\s+[A-Z][a-zA-Z]+\b/g, '').trim();
  if (role.length > 50) role = role.substring(0, 50) + '...';

  let category = 'Update';

  if (
    cleanSubject.match(/(offer|congratulations|pleased to offer|joining us|offer letter|employment agreement)/i) ||
    (cleanBody.includes('offer of employment') || cleanBody.includes('thrilled to extend an offer') || cleanBody.includes('pleased to offer you') || cleanBody.includes('offer letter'))
  ) {
    category = 'Offer';
  }
  else if (
    cleanSubject.match(/(rejection|update regarding|status update|application status|not moving forward)/i) && 
    (cleanBody.includes('not moving forward') || cleanBody.includes('unfortunately') || cleanBody.includes('other candidates') || cleanBody.includes('decided to pursue') || cleanBody.includes('regret to inform') || cleanBody.includes('unable to offer') || cleanBody.includes('not selected'))
  ) {
    category = 'Rejection';
  }
  else if (
    cleanSubject.match(/(interview|schedule|screen|discussion|phone call|video call|zoom|chat|meet with)/i) ||
    cleanBody.includes('schedule a time') || cleanBody.includes('interview invitation') || cleanBody.includes('phone screen') || cleanBody.includes('technical screen') || cleanBody.includes('chat with') || cleanBody.includes('speak with you') || cleanBody.includes('scheduler') || cleanBody.includes('coderpad') || cleanBody.includes('calendly')
  ) {
    category = 'Interview';
  }
  else if (
    cleanSubject.match(/(assessment|test|challenge|hackerrank|codility|codesignal|exam|quiz)/i) ||
    cleanBody.includes('online challenge') || cleanBody.includes('online assessment') || cleanBody.includes('hackerrank') || cleanBody.includes('codility') || cleanBody.includes('codesignal') || cleanBody.includes('coding test') || cleanBody.includes('technical challenge') || cleanBody.includes('take-home') || cleanBody.includes('take home')
  ) {
    category = 'Assessment';
  }
  else if (
    cleanSubject.match(/(applied|received|confirm|thank you for applying|submission)/i) ||
    cleanBody.includes('thank you for applying') || cleanBody.includes('application has been received') || cleanBody.includes('received your application') || cleanBody.includes('successful submission') || cleanBody.includes('applied to')
  ) {
    category = 'Applied';
  }

  if ((category === 'Applied' || category === 'Update') && 
      (cleanBody.includes('unfortunately') && (cleanBody.includes('not moving forward') || cleanBody.includes('pursue other') || cleanBody.includes('wish you the best')))) {
    category = 'Rejection';
  }

  return { category, company, role };
}

// ----------------- AUTHENTICATION MIDDLEWARE & ENDPOINTS -----------------

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Authorization required. Please log in.' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Session expired or invalid login.' });
    }
    req.userId = decoded.userId;
    next();
  });
}

// Signup Endpoint
app.post('/api/auth/signup', async (req, res) => {
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
    initDb();
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
  
  // Seed dynamic Demo Mode data for new sign-ups immediately
  const initialData = {
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
    trackedJobs: [
      {
        id: 'mock-auto-1',
        company: 'OpenAI',
        role: 'Software Engineer Intern',
        status: 'Offer',
        dateApplied: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString().split('T')[0],
        notes: 'Preloaded sample offer dashboard demo.',
        emailId: 'mock-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'mock-auto-2',
        company: 'Meta',
        role: 'Software Engineer',
        status: 'Interviewing',
        dateApplied: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString().split('T')[0],
        notes: 'Preloaded sample interview schedule demo.',
        emailId: 'mock-2',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
  };
  
  await writeDb(userId, initialData);
  
  const token = jwt.sign({ userId, email: email.toLowerCase() }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ success: true, token, user: { email: email.toLowerCase(), userId } });
});

// Login Endpoint
app.post('/api/auth/login', async (req, res) => {
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
    initDb();
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
  
  const token = jwt.sign({ userId: userRecord.userId, email: userRecord.email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ success: true, token, user: userRecord });
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  res.json({ success: true, userId: req.userId });
});

// ----------------- STANDARD ISOLATED API ENDPOINTS -----------------

// Get settings
app.get('/api/settings', authenticateToken, async (req, res) => {
  const db = await readDb(req.userId);
  const safeSettings = { ...db.settings };
  if (safeSettings.password) {
    safeSettings.hasPassword = true;
    safeSettings.password = '********';
  } else {
    safeSettings.hasPassword = false;
  }
  res.json(safeSettings);
});

// Update settings
app.post('/api/settings', authenticateToken, async (req, res) => {
  const db = await readDb(req.userId);
  const newSettings = req.body;

  if (newSettings.password === '********') {
    newSettings.password = db.settings.password;
  }

  db.settings = { ...db.settings, ...newSettings };
  await writeDb(req.userId, db);
  res.json({ success: true, message: 'Settings saved successfully' });
});

// Get tracked jobs list
app.get('/api/tracker', authenticateToken, async (req, res) => {
  const db = await readDb(req.userId);
  res.json(db.trackedJobs || []);
});

// Add/Update tracked job
app.post('/api/tracker', authenticateToken, async (req, res) => {
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
});

// Delete tracked job
app.post('/api/tracker/delete', authenticateToken, async (req, res) => {
  const db = await readDb(req.userId);
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ success: false, message: 'Job ID is required' });
  }

  db.trackedJobs = (db.trackedJobs || []).filter(j => j.id !== id);
  await writeDb(req.userId, db);
  res.json({ success: true, message: 'Job deleted' });
});

// Generate professional response template
app.post('/api/generate-response', authenticateToken, (req, res) => {
  const { emailBody, category, company, role } = req.body;
  
  let draft = '';
  
  if (category === 'Interview') {
    draft = `Subject: Re: Interview Invitation - ${role} at ${company}

Dear ${company} Recruiting Team,

Thank you very much for inviting me to interview for the ${role} position. I am very excited about this opportunity and would love to schedule a time to meet.

I am available at the following times (in your local time zone):
1. [Insert Option 1, e.g., Monday, May 30th - 10:00 AM to 2:00 PM]
2. [Insert Option 2, e.g., Tuesday, May 31st - 1:00 PM to 4:00 PM]
3. [Insert Option 3, e.g., Wednesday, June 1st - 9:00 AM to 12:00 PM]

If none of these slots work, please let me know, and I will do my best to accommodate your schedule. My phone number is [Your Phone Number] and my Zoom/Skype ID is [Your Zoom ID], should we need them.

I look forward to discussing how my background and skills align with the goals at ${company}.

Best regards,

[Your Name]
[Your Phone Number]
[Your LinkedIn Profile]`;
  } else if (category === 'Rejection') {
    draft = `Subject: Re: Update regarding your application - ${role} at ${company}

Dear ${company} Talent Acquisition Team,

Thank you for letting me know about the status of my application for the ${role} position. While I am naturally disappointed to hear that I will not be moving forward, I sincerely appreciate the time and consideration you and the team gave to my application.

I remain a huge admirer of ${company}'s work and culture. If it is not too much trouble, I would deeply appreciate any feedback you could share regarding how I might improve my profile or interview performance for future roles.

Please keep my resume on file, as I would welcome the chance to be considered for other roles at ${company} in the future.

Thank you again for the opportunity, and I wish ${company} continued success.

Warm regards,

[Your Name]
[Your Phone Number]
[Your LinkedIn Profile]`;
  } else if (category === 'Assessment') {
    draft = `Subject: Re: Online Assessment - ${role} at ${company}

Dear ${company} Recruiting Team,

Thank you for providing the online assessment link for the ${role} application. 

I wanted to confirm that I have received the challenge details and will complete it shortly within the specified timeframe. I look forward to showcasing my skills and proceeding to the next steps.

Best regards,

[Your Name]
[Your Phone Number]`;
  } else if (category === 'Offer') {
    draft = `Subject: Re: Offer Letter - ${role} at ${company}

Dear ${company} Recruiting Team,

Thank you so much for extending this offer of employment for the ${role} position at ${company}! I am absolutely thrilled and honored to receive this offer, and I am very excited about the prospect of joining the team.

I have received the draft agreement and details. To ensure I review everything thoroughly, could you please let me know the deadline for signing and returning the offer letter? 

Also, if possible, I would love to schedule a brief 10-minute call with my hiring manager or recruiter to clarify a couple of quick questions regarding [insert questions, e.g. start date flexibility / benefits details]. 

Thank you once again for this incredible opportunity!

With enthusiasm,

[Your Name]
[Your Phone Number]`;
  } else {
    draft = `Subject: Follow-up regarding application - ${role} at ${company}

Dear ${company} Recruiting Team,

I hope this email finds you well.

I am writing to briefly follow up on the application I submitted on [Date] for the ${role} position. I remain extremely interested in the opportunity to join ${company} and contribute to your team.

I wanted to check if there are any updates regarding the hiring process, or if there is any additional information or portfolio work I can provide to support my application.

Thank you very much for your time and consideration.

Best regards,

[Your Name]
[Your Phone Number]
[Your LinkedIn Profile]`;
  }

  res.json({ success: true, draft });
});

// Fetch Emails Endpoint
app.get('/api/emails', authenticateToken, async (req, res) => {
  const db = await readDb(req.userId);
  const settings = db.settings;

  if (settings.demoMode || !settings.email || !settings.password) {
    console.log('Serving high-fidelity Mock Emails (Demo Mode)');
    const activeMocks = MOCK_EMAILS.map((m, idx) => {
      const hrsAgo = [3, 24, 48, 72, 120, 150][idx] || 24;
      return {
        ...m,
        date: new Date(Date.now() - 1000 * 60 * 60 * hrsAgo).toISOString()
      };
    });
    return res.json({ 
      success: true, 
      isDemo: true, 
      emails: activeMocks,
      message: (!settings.email || !settings.password) 
        ? 'Showing demo data because email credentials are not fully configured in Settings.' 
        : 'Demo mode is active.'
    });
  }

  console.log(`Connecting to IMAP server ${settings.host}:${settings.port} for ${settings.email}...`);
  
  const config = {
    imap: {
      user: settings.email,
      password: settings.password,
      host: settings.host,
      port: settings.port,
      tls: settings.tls,
      authTimeout: 10000,
      connTimeout: 15000,
      tlsOptions: { rejectUnauthorized: false }
    }
  };

  try {
    const connection = await imaps.connect(config);
    await connection.openBox('INBOX');

    const days = settings.daysToFetch || 30;
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedDate = `${String(dateLimit.getDate()).padStart(2, '0')}-${months[dateLimit.getMonth()]}-${dateLimit.getFullYear()}`;
    
    const searchCriteria = [['SINCE', formattedDate]];
    // Step 1: Fetch only the HEADER for all messages since the date to filter them extremely fast and with minimal memory
    const searchFetchOptions = {
      bodies: ['HEADER'],
      struct: true
    };

    const messages = await connection.search(searchCriteria, searchFetchOptions);
    console.log(`Found ${messages.length} total emails since ${formattedDate}`);

    const filterKeywords = ['apply', 'applied', 'application', 'intern', 'internship', 'interview', 'assessment', 'hackerrank', 'codility', 'codesignal', 'rejection', 'hiring', 'talent', 'careers', 'offer', 'congratulations', 'unfortunate', 'moving forward', 'resume', 'cv'];

    // Step 2: Filter message UIDs based on Subject or Sender keywords first
    const matchingUids = [];
    const messageHeadersMap = new Map();

    for (const message of messages) {
      const headerPart = message.parts.find(p => p.which === 'HEADER');
      if (!headerPart) continue;

      const headers = headerPart.body;
      const subject = headers.subject ? headers.subject[0] : 'No Subject';
      const from = headers.from ? headers.from[0] : 'Unknown';
      const date = headers.date ? headers.date[0] : new Date().toISOString();

      const lowercaseSubject = subject.toLowerCase();
      const lowercaseFrom = from.toLowerCase();
      
      const subjectMatch = filterKeywords.some(keyword => lowercaseSubject.includes(keyword));
      const senderMatch = filterKeywords.some(keyword => lowercaseFrom.includes(keyword)) || 
                          ['greenhouse', 'lever', 'workday', 'smartrecruiters', 'icims', 'workable', 'job', 'recruit'].some(kw => lowercaseFrom.includes(kw));

      if (subjectMatch || senderMatch) {
        matchingUids.push(message.attributes.uid);
        messageHeadersMap.set(message.attributes.uid, { subject, from, date });
      }
    }

    console.log(`Filtered down to ${matchingUids.length} matching career-related emails.`);

    const parsedEmails = [];

    // Step 3: Fetch the full body ONLY for the matching career-related emails (saves 99% RAM and prevents Out-Of-Memory crashes)
    if (matchingUids.length > 0) {
      const fullMessages = await connection.fetch(matchingUids, {
        bodies: ['HEADER', ''],
        struct: true
      });

      for (const message of fullMessages) {
        const uid = message.attributes.uid;
        const allParts = message.parts;
        const fullBodyPart = allParts.find(p => p.which === '');

        if (!fullBodyPart) continue;

        const headerInfo = messageHeadersMap.get(uid) || {
          subject: 'No Subject',
          from: 'Unknown',
          date: new Date().toISOString()
        };

        try {
          const parsed = await simpleParser(fullBodyPart.body);
          const bodyContent = parsed.text || parsed.html || '';
          const bodySnippet = bodyContent.substring(0, 150).replace(/\s+/g, ' ') + '...';

          const parsedJob = parseJobEmail(headerInfo.subject, bodyContent, headerInfo.from, headerInfo.date);

          parsedEmails.push({
            id: uid.toString(),
            from: headerInfo.from,
            subject: headerInfo.subject,
            date: new Date(headerInfo.date).toISOString(),
            snippet: bodySnippet,
            body: bodyContent,
            category: parsedJob.category,
            company: parsedJob.company,
            role: parsedJob.role,
            status: 'read'
          });
        } catch (err) {
          console.error(`Error parsing message UID ${uid}:`, err);
        }
      }
    }

    connection.end();

    parsedEmails.sort((a, b) => new Date(b.date) - new Date(a.date));

    const limit = settings.limit || 100;
    const finalEmails = parsedEmails.slice(0, limit);

    let autoAddedCount = 0;
    const activeTracker = db.trackedJobs || [];
    
    for (const email of finalEmails) {
      if (email.category && email.category !== 'Update' && email.company !== 'Unknown Company') {
        const exists = activeTracker.some(j => 
          j.company.toLowerCase() === email.company.toLowerCase() && 
          j.role.toLowerCase() === email.role.toLowerCase()
        );

        if (!exists) {
          let mappedStatus = 'Applied';
          if (email.category === 'Assessment') mappedStatus = 'Assessment';
          if (email.category === 'Interview') mappedStatus = 'Interviewing';
          if (email.category === 'Offer') mappedStatus = 'Offer';
          if (email.category === 'Rejection') mappedStatus = 'Rejected';

          const newJob = {
            id: 'job-auto-' + email.id,
            company: email.company,
            role: email.role,
            status: mappedStatus,
            dateApplied: email.date.split('T')[0],
            notes: `Auto-detected from email: "${email.subject}"`,
            emailId: email.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          db.trackedJobs.push(newJob);
          autoAddedCount++;
        }
      }
    }

    if (autoAddedCount > 0) {
      await writeDb(req.userId, db);
      console.log(`Auto-added ${autoAddedCount} new applications to Tracker from IMAP email scan.`);
    }

    res.json({ 
      success: true, 
      isDemo: false, 
      emails: finalEmails,
      autoAddedCount
    });

  } catch (error) {
    console.error('IMAP Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to connect to IMAP server. Please check your credentials and connection settings.',
      details: error.message 
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`  🚀 Job Application Email Checker Server Ready!`);
  console.log(`  URL: http://localhost:${PORT}`);
  console.log(`==================================================`);
});
