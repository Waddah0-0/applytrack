const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { simpleParser } = require('mailparser');
const imaps = require('imap-simple');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static frontend files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

const DB_FILE = path.join(__dirname, 'database.json');

// Initialize database file
const mongoose = require('mongoose');

// Mongoose Models
let SettingsModel;
let TrackedJobModel;
let isMongoConnected = false;

async function connectMongo() {
  if (isMongoConnected) return true;
  if (!process.env.MONGODB_URI) return false;
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔌 Connected to MongoDB Atlas Cloud Database!');
    
    const settingsSchema = new mongoose.Schema({
      email: { type: String, default: '' },
      password: { type: String, default: '' },
      host: { type: String, default: 'imap.gmail.com' },
      port: { type: Number, default: 993 },
      tls: { type: Boolean, default: true },
      daysToFetch: { type: Number, default: 30 },
      limit: { type: Number, default: 100 },
      demoMode: { type: Boolean, default: true }
    });
    
    const trackedJobSchema = new mongoose.Schema({
      id: { type: String, required: true, unique: true },
      company: { type: String, required: true },
      role: { type: String, required: true },
      status: { type: String, default: 'Applied' },
      dateApplied: { type: String },
      notes: { type: String, default: '' },
      emailId: { type: String, default: null },
      createdAt: { type: String },
      updatedAt: { type: String }
    });
    
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
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf8');
  }
}
initDb();

// Asynchronous DB reader with MongoDB fallback
async function readDb() {
  const isMongo = await connectMongo();
  
  if (isMongo) {
    try {
      let settingsDoc = await SettingsModel.findOne();
      if (!settingsDoc) {
        settingsDoc = await SettingsModel.create({
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
      const jobsDocs = await TrackedJobModel.find();
      return {
        settings: settingsDoc.toObject(),
        trackedJobs: jobsDocs.map(j => j.toObject())
      };
    } catch (err) {
      console.error('Error reading from MongoDB:', err);
      return { settings: {}, trackedJobs: [] };
    }
  } else {
    initDb();
    try {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading database file:', error);
      return { settings: {}, trackedJobs: [] };
    }
  }
}

// Asynchronous DB writer with MongoDB fallback & Sync Deleted
async function writeDb(data) {
  const isMongo = await connectMongo();
  
  if (isMongo) {
    try {
      if (data.settings) {
        await SettingsModel.findOneAndUpdate({}, data.settings, { upsert: true, new: true });
      }
      if (data.trackedJobs) {
        const jobIds = data.trackedJobs.map(j => j.id);
        await TrackedJobModel.deleteMany({ id: { $nin: jobIds } });
        for (const job of data.trackedJobs) {
          await TrackedJobModel.findOneAndUpdate({ id: job.id }, job, { upsert: true, new: true });
        }
      }
      return true;
    } catch (err) {
      console.error('Error writing to MongoDB:', err);
      return false;
    }
  } else {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error('Error writing database file:', error);
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

  // 1. Extract Company Name
  let company = 'Unknown Company';
  // Try to parse from sender name: "Company Careers <careers@company.com>" -> "Company Careers"
  const senderMatch = cleanFrom.match(/^"?([^"<]+)"?\s*<[^>]+>/);
  if (senderMatch) {
    let name = senderMatch[1].trim();
    // Clean up common suffix
    name = name.replace(/(Recruiting|Careers|Jobs|Talent|HR|No-Reply|Noreply|Notification|HR Team|Team)\b/gi, '').trim();
    name = name.replace(/["']/g, ''); // strip quotes
    if (name.length > 1) {
      company = name;
    }
  }

  // If company is still unknown, try domain extraction
  if (company === 'Unknown Company') {
    const domainMatch = cleanFrom.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (domainMatch) {
      let domain = domainMatch[1].toLowerCase();
      // Remove common subdomains
      domain = domain.replace(/^(careers|jobs|recruiting|hr|noreply|mail|mail1|info)\./, '');
      const parts = domain.split('.');
      if (parts.length >= 2) {
        let name = parts[parts.length - 2]; // e.g. stripe from stripe.com
        if (['co', 'com', 'org', 'net', 'edu', 'gov'].includes(name) && parts.length > 2) {
          name = parts[parts.length - 3];
        }
        // Capitalize
        company = name.charAt(0).toUpperCase() + name.slice(1);
      }
    }
  }

  // Specific common company cleanups
  if (company.toLowerCase() === 'gmail' || company.toLowerCase() === 'outlook' || company.toLowerCase() === 'yahoo') {
    company = 'Unknown Company';
  }

  // Check if subject lists the company, e.g. "Stripe: Thank you..." or "Google Application"
  const knownCompanies = ['Google', 'Meta', 'Stripe', 'OpenAI', 'Microsoft', 'Amazon', 'Apple', 'Netflix', 'Tesla', 'Airbnb', 'Uber', 'Lyft', 'Coinbase', 'GitHub', 'Figma', 'Canva', 'LinkedIn', 'Salesforce', 'Adobe', 'TikTok', 'Zoom'];
  for (const kc of knownCompanies) {
    if (cleanSubject.toLowerCase().includes(kc.toLowerCase())) {
      company = kc;
      break;
    }
  }

  // 2. Extract Job Role
  let role = 'Software Engineer'; // Default fallback
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
  // Search in subject first
  for (const regex of roleRegexes) {
    const match = cleanSubject.match(regex);
    if (match) {
      matchedRole = match[0];
      break;
    }
  }
  // Search in body if not found in subject
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
    // Capitalize first letter of words
    role = matchedRole.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  } else {
    // Attempt to extract noun phrases from subject as a fallback
    // E.g., "Application to [Role]" or "For [Role]"
    const roleFallbackMatch = cleanSubject.match(/(?:for|position of|role of|apply to|regarding)\s+([^-,:|(|)]+)/i);
    if (roleFallbackMatch && roleFallbackMatch[1].trim().length > 3) {
      role = roleFallbackMatch[1].trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }
  }

  // Clean role up from phrases like "at Google"
  role = role.replace(/\b(at|for|in|with)\s+[A-Z][a-zA-Z]+\b/g, '').trim();
  if (role.length > 50) role = role.substring(0, 50) + '...';

  // 3. Classify Category
  let category = 'Update'; // Default category

  // Offer indicators
  if (
    cleanSubject.match(/(offer|congratulations|pleased to offer|joining us|offer letter|employment agreement)/i) ||
    (cleanBody.includes('offer of employment') || cleanBody.includes('thrilled to extend an offer') || cleanBody.includes('pleased to offer you') || cleanBody.includes('offer letter'))
  ) {
    category = 'Offer';
  }
  // Rejection indicators
  else if (
    cleanSubject.match(/(rejection|update regarding|status update|application status|not moving forward)/i) && 
    (cleanBody.includes('not moving forward') || cleanBody.includes('unfortunately') || cleanBody.includes('other candidates') || cleanBody.includes('decided to pursue') || cleanBody.includes('regret to inform') || cleanBody.includes('unable to offer') || cleanBody.includes('not selected'))
  ) {
    category = 'Rejection';
  }
  // Interview indicators
  else if (
    cleanSubject.match(/(interview|schedule|screen|discussion|phone call|video call|zoom|chat|meet with)/i) ||
    cleanBody.includes('schedule a time') || cleanBody.includes('interview invitation') || cleanBody.includes('phone screen') || cleanBody.includes('technical screen') || cleanBody.includes('chat with') || cleanBody.includes('speak with you') || cleanBody.includes('scheduler') || cleanBody.includes('coderpad') || cleanBody.includes('calendly')
  ) {
    category = 'Interview';
  }
  // Assessment indicators
  else if (
    cleanSubject.match(/(assessment|test|challenge|hackerrank|codility|codesignal|exam|quiz)/i) ||
    cleanBody.includes('online challenge') || cleanBody.includes('online assessment') || cleanBody.includes('hackerrank') || cleanBody.includes('codility') || cleanBody.includes('codesignal') || cleanBody.includes('coding test') || cleanBody.includes('technical challenge') || cleanBody.includes('take-home') || cleanBody.includes('take home')
  ) {
    category = 'Assessment';
  }
  // Applied/Confirmation indicators
  else if (
    cleanSubject.match(/(applied|received|confirm|thank you for applying|submission)/i) ||
    cleanBody.includes('thank you for applying') || cleanBody.includes('application has been received') || cleanBody.includes('received your application') || cleanBody.includes('successful submission') || cleanBody.includes('applied to')
  ) {
    category = 'Applied';
  }

  // Double check rejection keywords in body if it was labeled applied or update
  if ((category === 'Applied' || category === 'Update') && 
      (cleanBody.includes('unfortunately') && (cleanBody.includes('not moving forward') || cleanBody.includes('pursue other') || cleanBody.includes('wish you the best')))) {
    category = 'Rejection';
  }

  return {
    category,
    company,
    role
  };
}

// ----------------- API ENDPOINTS -----------------

// Get settings
app.get('/api/settings', async (req, res) => {
  const db = await readDb();
  // Don't return password in plain text for safety
  const safeSettings = { ...db.settings };
  if (safeSettings.password) {
    safeSettings.hasPassword = true;
    safeSettings.password = '********'; // Mask
  } else {
    safeSettings.hasPassword = false;
  }
  res.json(safeSettings);
});

// Update settings
app.post('/api/settings', async (req, res) => {
  const db = await readDb();
  const newSettings = req.body;

  // If password is sent as mask '********', keep the old password
  if (newSettings.password === '********') {
    newSettings.password = db.settings.password;
  }

  db.settings = { ...db.settings, ...newSettings };
  await writeDb(db);
  res.json({ success: true, message: 'Settings saved successfully' });
});

// Get tracked jobs list
app.get('/api/tracker', async (req, res) => {
  const db = await readDb();
  res.json(db.trackedJobs || []);
});

// Add/Update tracked job
app.post('/api/tracker', async (req, res) => {
  const db = await readDb();
  const job = req.body;

  if (!job.company || !job.role) {
    return res.status(400).json({ success: false, message: 'Company and Role are required' });
  }

  if (!db.trackedJobs) {
    db.trackedJobs = [];
  }

  const existingIndex = db.trackedJobs.findIndex(j => j.id === job.id);
  
  if (existingIndex > -1) {
    // Update
    db.trackedJobs[existingIndex] = { ...db.trackedJobs[existingIndex], ...job, updatedAt: new Date().toISOString() };
  } else {
    // Create new
    const newJob = {
      id: job.id || 'job-' + Date.now(),
      company: job.company,
      role: job.role,
      status: job.status || 'Applied', // Applied, Assessment, Interviewing, Offer, Rejected
      dateApplied: job.dateApplied || new Date().toISOString().split('T')[0],
      notes: job.notes || '',
      emailId: job.emailId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.trackedJobs.push(newJob);
  }

  await writeDb(db);
  res.json({ success: true, job });
});

// Delete tracked job
app.post('/api/tracker/delete', async (req, res) => {
  const db = await readDb();
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ success: false, message: 'Job ID is required' });
  }

  db.trackedJobs = (db.trackedJobs || []).filter(j => j.id !== id);
  await writeDb(db);
  res.json({ success: true, message: 'Job deleted' });
});

// Generate professional response template
app.post('/api/generate-response', (req, res) => {
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

// Fetch Emails Endpoint (supports real IMAP or Demo Mode)
app.get('/api/emails', async (req, res) => {
  const db = await readDb();
  const settings = db.settings;

  // 1. Check if Demo Mode is toggled on OR credentials are not set up yet
  if (settings.demoMode || !settings.email || !settings.password) {
    console.log('Serving high-fidelity Mock Emails (Demo Mode)');
    // Auto-update mock email dates to be relative to the current time to feel live!
    const activeMocks = MOCK_EMAILS.map((m, idx) => {
      // Offset matches
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

  // 2. Real IMAP Fetching
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
      tlsOptions: { rejectUnauthorized: false } // Avoid SSL cert issues for self-signed
    }
  };

  try {
    const connection = await imaps.connect(config);
    await connection.openBox('INBOX');

    // Calculate start date based on settings.daysToFetch
    const days = settings.daysToFetch || 30;
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);
    
    // Format date for IMAP query: DD-Month-YYYY (e.g. 05-May-2026)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedDate = `${String(dateLimit.getDate()).padStart(2, '0')}-${months[dateLimit.getMonth()]}-${dateLimit.getFullYear()}`;
    
    // We search for emails since the calculated date
    const searchCriteria = [['SINCE', formattedDate]];
    const fetchOptions = {
      bodies: ['HEADER', 'TEXT', ''], // empty string '' fetches full MIME body
      struct: true
    };

    const messages = await connection.search(searchCriteria, fetchOptions);
    console.log(`Found ${messages.length} total emails since ${formattedDate}`);

    const parsedEmails = [];
    const filterKeywords = ['apply', 'applied', 'application', 'intern', 'internship', 'interview', 'assessment', 'hackerrank', 'codility', 'codesignal', 'rejection', 'hiring', 'talent', 'careers', 'offer', 'congratulations', 'unfortunate', 'moving forward', 'resume', 'cv'];

    for (const message of messages) {
      // Find the full body block
      const allParts = message.parts;
      const headerPart = allParts.find(p => p.which === 'HEADER');
      const fullBodyPart = allParts.find(p => p.which === '');

      if (!headerPart || !fullBodyPart) continue;

      const headers = headerPart.body;
      const subject = headers.subject ? headers.subject[0] : 'No Subject';
      const from = headers.from ? headers.from[0] : 'Unknown';
      const date = headers.date ? headers.date[0] : new Date().toISOString();

      // Check if subject or sender has career keywords to quickly filter out irrelevant emails before parsed
      const lowercaseSubject = subject.toLowerCase();
      const lowercaseFrom = from.toLowerCase();
      
      const subjectMatch = filterKeywords.some(keyword => lowercaseSubject.includes(keyword));
      const senderMatch = filterKeywords.some(keyword => lowercaseFrom.includes(keyword)) || 
                          ['greenhouse', 'lever', 'workday', 'smartrecruiters', 'icims', 'workable', 'job', 'recruit'].some(kw => lowercaseFrom.includes(kw));

      if (!subjectMatch && !senderMatch) {
        continue; // Skip standard emails to keep it focused on jobs
      }

      // Parse the full email using mailparser
      try {
        const parsed = await simpleParser(fullBodyPart.body);
        const bodyContent = parsed.text || parsed.html || '';
        const bodySnippet = bodyContent.substring(0, 150).replace(/\s+/g, ' ') + '...';

        // Filter body content for keywords again just in case (optional, subject filter is strong)
        const parsedJob = parseJobEmail(subject, bodyContent, from, date);

        parsedEmails.push({
          id: message.attributes.uid.toString(),
          from,
          subject,
          date: new Date(date).toISOString(),
          snippet: bodySnippet,
          body: bodyContent,
          category: parsedJob.category,
          company: parsedJob.company,
          role: parsedJob.role,
          status: 'read' // Default for loaded
        });
      } catch (err) {
        console.error(`Error parsing message UID ${message.attributes.uid}:`, err);
      }
    }

    connection.end();

    // Sort emails by date descending (newest first)
    parsedEmails.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Limit output based on settings
    const limit = settings.limit || 100;
    const finalEmails = parsedEmails.slice(0, limit);

    // Auto-update application tracker if new emails arrive!
    // E.g. if we see an "Applied" email for a company, we check if it is already in our tracker database. 
    // If not, we can auto-add it to save the user time!
    let autoAddedCount = 0;
    const activeTracker = db.trackedJobs || [];
    
    for (const email of finalEmails) {
      if (email.category && email.category !== 'Update' && email.company !== 'Unknown Company') {
        // Look for existing job by company and role
        const exists = activeTracker.some(j => 
          j.company.toLowerCase() === email.company.toLowerCase() && 
          j.role.toLowerCase() === email.role.toLowerCase()
        );

        if (!exists) {
          // Auto add
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
      await writeDb(db);
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
