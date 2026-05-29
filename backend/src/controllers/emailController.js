const { readDb, writeDb } = require('../services/dbService');
const { fetchEmailsFromImap } = require('../services/imapService');

const MOCK_EMAILS = [
  {
    id: 'mock-1',
    from: 'OpenAI Recruiting <careers@openai.com>',
    subject: 'Offer Letter: Software Engineer Intern - OpenAI',
    date: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
    snippet: 'Hello! We are absolutely thrilled to extend an offer of employment for the Software Engineer Intern position at OpenAI...',
    body: `Dear Applicant,\n\nWe are absolutely thrilled to offer you the position of Software Engineer Intern at OpenAI! The team was incredibly impressed by your technical assessment and interview rounds.\n\nDetails of your offer:\n- Role: Software Engineer Intern (Technical Team)\n- Start Date: June 15, 2026\n- Compensation: Competitive hourly rate + housing stipend\n- Location: San Francisco, CA (Hybrid)\n\nPlease find the attached formal offer letter. We would appreciate it if you could sign and return it by next Monday to secure your slot.\n\nCongratulations, we are excited to have you join us in building safe and beneficial AGI!\n\nBest regards,\nThe OpenAI Recruiting Team`,
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
    body: `Hi there,\n\nThank you for your interest in Meta and for taking the time to apply.\n\nYour resume has been shortlisted, and we would love to schedule a 45-minute technical screen with one of our software engineers. The interview will focus on data structures, algorithms, and problem-solving.\n\nPlease use the scheduling link below to pick a time slot that works best for you over the next two weeks:\nhttps://careers.meta.com/scheduler/interview-screen-39402a\n\nPlease prepare a quiet space with stable internet. You will be using a shared coding environment (CoderPad) during the interview.\n\nWe look forward to speaking with you!\n\nBest,\nMeta University Recruiting`,
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
    body: `Hello Applicant,\n\nThank you for your application for the Software Engineering Internship (Summer 2026) at Google!\n\nThe next step in our selection process is the Google Online Challenge (GOC). This assessment helps us understand your coding, analytical, and problem-solving skills.\n\n- Platform: Google Online Assessment Platform (powered by HackerRank)\n- Time Limit: 90 minutes\n- Expiration: You must complete the test within 7 days of receiving this email.\n\nClick here to start the challenge: https://assessment.careers.google.com/start-goc?id=839209420\n\nMake sure you have an uninterrupted 90-minute window and a stable internet connection. No external libraries or tools are allowed.\n\nGood luck!\nGoogle University Graduate Team`,
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
    body: `Hi there,\n\nThank you for applying to Stripe! We have received your application for the Frontend Engineer position.\n\nWe know that applying for a new job takes time and energy, and we sincerely appreciate your interest in joining Stripe. Our recruiting team is currently reviewing your profile against our open positions.\n\nWhat happens next?\n1. Our team will review your application within the next 5-7 business days.\n2. If your background matches what we are looking for, a recruiter will reach out to schedule an introductory phone screen.\n3. In any case, we will keep you updated on your application status.\n\nIn the meantime, feel free to read more about our work and culture on our blog: https://stripe.com/blog\n\nBest regards,\nThe Stripe Recruiting Team`,
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
    body: `Dear Applicant,\n\nThank you for taking the time to apply for the Full Stack Engineer (L5) role at Netflix. We appreciate your interest in our company and the time you spent submitting your application.\n\nAfter careful review of your background and experience, we regret to inform you that we have decided to move forward with other candidates whose qualifications closely match our current needs.\n\nWe receive thousands of applications from highly qualified professionals, making our decisions extremely difficult. We will keep your resume on file for future opportunities that may align with your skillset.\n\nWe wish you the very best of luck in your job search and your future professional endeavors.\n\nSincerely,\nNetflix Talent Acquisition`,
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
    body: `Hi,\n\nThank you for participating in the first round of interviews for the DevOps Engineer position at Starlight Tech.\n\nOur engineering team is currently reviewing the feedback from all candidates. We expect to complete this process by the end of this week.\n\nWe will reach out to you early next week with a status update or instructions for the final round interviews. We appreciate your patience.\n\nBest regards,\nSarah Jenkins\nHR Manager, Starlight Tech`,
    category: 'Update',
    company: 'Starlight Tech',
    role: 'DevOps Engineer',
    status: 'read'
  }
];

const getEmails = async (req, res) => {
  const db = await readDb(req.userId);
  const settings = db.settings;

  if (!settings || !settings.email || !settings.password) {
    return res.json({
      success: true,
      isDemo: false,
      emails: [],
      message: 'Please configure your IMAP credentials in Settings to sync your mailbox.'
    });
  }

  try {
    const finalEmails = await fetchEmailsFromImap(settings);
    let autoAddedCount = 0;
    let hasChanges = false;
    const activeTracker = db.trackedJobs || [];

    // Filter fetched emails to only include valid trackable application emails (exclude general updates and unknown companies)
    const trackableEmails = finalEmails.filter(email => 
      email.category && 
      email.category !== 'Update' && 
      email.company !== 'Unknown Company'
    );

    for (const email of trackableEmails) {
      // Check if job exists based on company and role to avoid duplicates
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
        hasChanges = true;
      } else {
        // Update status if email represents a newer state
        const existingJobIndex = activeTracker.findIndex(j =>
          j.company.toLowerCase() === email.company.toLowerCase() &&
          j.role.toLowerCase() === email.role.toLowerCase()
        );
        if (existingJobIndex > -1) {
          let currentStatus = activeTracker[existingJobIndex].status;
          let newStatus = currentStatus;

          if (email.category === 'Assessment' && currentStatus === 'Applied') newStatus = 'Assessment';
          if (email.category === 'Interview' && (currentStatus === 'Applied' || currentStatus === 'Assessment')) newStatus = 'Interviewing';
          if (email.category === 'Offer') newStatus = 'Offer';
          if (email.category === 'Rejection') newStatus = 'Rejected';

          if (newStatus !== currentStatus) {
            db.trackedJobs[existingJobIndex].status = newStatus;
            db.trackedJobs[existingJobIndex].updatedAt = new Date().toISOString();
            hasChanges = true;
          }
        }
      }
    }

    if (hasChanges) {
      await writeDb(req.userId, db);
    }

    res.json({
      success: true,
      isDemo: false,
      emails: trackableEmails,
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
};

const generateResponse = (req, res) => {
  const { emailBody, category, company, role } = req.body;
  let draft = '';

  if (category === 'Interview') {
    draft = `Subject: Re: Interview Invitation - ${role} at ${company}\n\nDear ${company} Recruiting Team,\n\nThank you very much for inviting me to interview for the ${role} position. I am very excited about this opportunity and would love to schedule a time to meet.\n\nI am available at the following times (in your local time zone):\n1. [Insert Option 1, e.g., Monday, May 30th - 10:00 AM to 2:00 PM]\n2. [Insert Option 2, e.g., Tuesday, May 31st - 1:00 PM to 4:00 PM]\n3. [Insert Option 3, e.g., Wednesday, June 1st - 9:00 AM to 12:00 PM]\n\nIf none of these slots work, please let me know, and I will do my best to accommodate your schedule. My phone number is [Your Phone Number] and my Zoom/Skype ID is [Your Zoom ID], should we need them.\n\nI look forward to discussing how my background and skills align with the goals at ${company}.\n\nBest regards,\n\n[Your Name]\n[Your Phone Number]\n[Your LinkedIn Profile]`;
  } else if (category === 'Rejection') {
    draft = `Subject: Re: Update regarding your application - ${role} at ${company}\n\nDear ${company} Talent Acquisition Team,\n\nThank you for letting me know about the status of my application for the ${role} position. While I am naturally disappointed to hear that I will not be moving forward, I sincerely appreciate the time and consideration you and the team gave to my application.\n\nI remain a huge admirer of ${company}'s work and culture. If it is not too much trouble, I would deeply appreciate any feedback you could share regarding how I might improve my profile or interview performance for future roles.\n\nPlease keep my resume on file, as I would welcome the chance to be considered for other roles at ${company} in the future.\n\nThank you again for the opportunity, and I wish ${company} continued success.\n\nWarm regards,\n\n[Your Name]\n[Your Phone Number]\n[Your LinkedIn Profile]`;
  } else if (category === 'Assessment') {
    draft = `Subject: Re: Online Assessment - ${role} at ${company}\n\nDear ${company} Recruiting Team,\n\nThank you for providing the online assessment link for the ${role} application. \n\nI wanted to confirm that I have received the challenge details and will complete it shortly within the specified timeframe. I look forward to showcasing my skills and proceeding to the next steps.\n\nBest regards,\n\n[Your Name]\n[Your Phone Number]`;
  } else if (category === 'Offer') {
    draft = `Subject: Re: Offer Letter - ${role} at ${company}\n\nDear ${company} Recruiting Team,\n\nThank you so much for extending this offer of employment for the ${role} position at ${company}! I am absolutely thrilled and honored to receive this offer, and I am very excited about the prospect of joining the team.\n\nI have received the draft agreement and details. To ensure I review everything thoroughly, could you please let me know the deadline for signing and returning the offer letter? \n\nAlso, if possible, I would love to schedule a brief 10-minute call with my hiring manager or recruiter to clarify a couple of quick questions regarding [insert questions, e.g. start date flexibility / benefits details]. \n\nThank you once again for this incredible opportunity!\n\nWith enthusiasm,\n\n[Your Name]\n[Your Phone Number]`;
  } else {
    draft = `Subject: Follow-up regarding application - ${role} at ${company}\n\nDear ${company} Recruiting Team,\n\nI hope this email finds you well.\n\nI am writing to briefly follow up on the application I submitted on [Date] for the ${role} position. I remain extremely interested in the opportunity to join ${company} and contribute to your team.\n\nI wanted to check if there are any updates regarding the hiring process, or if there is any additional information or portfolio work I can provide to support my application.\n\nThank you very much for your time and consideration.\n\nBest regards,\n\n[Your Name]\n[Your Phone Number]\n[Your LinkedIn Profile]`;
  }

  res.json({ success: true, draft });
};

module.exports = { getEmails, generateResponse };
