const imaps = require('imap-simple');
const { simpleParser } = require('mailparser');

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


const fetchEmailsFromImap = async (settings) => {
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

  const connection = await imaps.connect(config);
  await connection.openBox('INBOX');

  const days = settings.daysToFetch || 30;
  const dateLimit = new Date();
  dateLimit.setDate(dateLimit.getDate() - days);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const formattedDate = `${String(dateLimit.getDate()).padStart(2, '0')}-${months[dateLimit.getMonth()]}-${dateLimit.getFullYear()}`;

  const searchCriteria = [['SINCE', formattedDate]];
  const searchFetchOptions = {
    bodies: ['HEADER'],
    struct: true
  };

  const messages = await connection.search(searchCriteria, searchFetchOptions);
  const filterKeywords = ['apply', 'applied', 'application', 'intern', 'internship', 'interview', 'assessment', 'hackerrank', 'codility', 'codesignal', 'rejection', 'hiring', 'talent', 'careers', 'offer', 'congratulations', 'unfortunate', 'moving forward', 'resume', 'cv'];

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

  const parsedEmails = [];

  if (matchingUids.length > 0) {
    const fullMessages = await connection.search([['UID', matchingUids.join(',')]], {
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
  return parsedEmails.slice(0, settings.limit || 100);
};

module.exports = { fetchEmailsFromImap };
