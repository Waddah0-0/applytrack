// ApplyTrack // Premium Multi-Tenant Application Logic Client

// Global Application State
const state = {
  activePanel: 'panel-dashboard',
  emails: [],
  trackedJobs: [],
  selectedEmail: null,
  activeFilter: 'All',
  settings: {},
  assistantType: 'Interview',
  token: localStorage.getItem('applytrack_token') || null,
  user: JSON.parse(localStorage.getItem('applytrack_user')) || null
};

// DOM Elements
const elements = {
  // Navigation
  navButtons: document.querySelectorAll('.nav-btn'),
  panels: document.querySelectorAll('.panel'),
  panelTitle: document.getElementById('panel-title'),
  panelSubtitle: document.getElementById('panel-subtitle'),
  connectionBadge: document.getElementById('connection-status-badge'),
  appModeBadge: document.getElementById('app-mode-badge'),
  
  // Actions
  syncBtn: document.getElementById('sync-emails-btn'),
  
  // Dashboard & Email List
  emailContainer: document.getElementById('email-items-container'),
  emailReader: document.getElementById('email-detail-panel'),
  filterTags: document.querySelectorAll('.filter-tag'),
  
  // Metrics
  statTotal: document.getElementById('stat-total'),
  statAssessments: document.getElementById('stat-assessments'),
  statInterviews: document.getElementById('stat-interviews'),
  statOffers: document.getElementById('stat-offers'),
  
  // Settings Form
  settingsForm: document.getElementById('settings-form'),
  settingsEmail: document.getElementById('settings-email'),
  settingsPassword: document.getElementById('settings-password'),
  settingsHost: document.getElementById('settings-host'),
  settingsPort: document.getElementById('settings-port'),
  settingsTls: document.getElementById('settings-tls'),
  settingsDays: document.getElementById('settings-days'),
  settingsLimit: document.getElementById('settings-limit'),
  settingsDemo: document.getElementById('settings-demo'),
  daysValueLabel: document.getElementById('days-val-display'),
  
  // Tracker Board
  kanbanColumns: document.querySelectorAll('.kanban-cards-container'),
  openAddJobBtn: document.getElementById('open-add-job-modal'),
  jobModal: document.getElementById('job-modal'),
  closeModalBtn: document.getElementById('close-job-modal'),
  jobForm: document.getElementById('job-form'),
  jobIdInput: document.getElementById('job-id'),
  jobCompanyInput: document.getElementById('job-company'),
  jobRoleInput: document.getElementById('job-role'),
  jobStatusSelect: document.getElementById('job-status'),
  jobDateInput: document.getElementById('job-date'),
  jobNotesTextarea: document.getElementById('job-notes'),
  modalTitle: document.getElementById('modal-title'),
  deleteJobBtn: document.getElementById('delete-job-btn'),
  
  // Response Assistant
  tmplCompany: document.getElementById('tmpl-company'),
  tmplRole: document.getElementById('tmpl-role'),
  templateEditor: document.getElementById('template-editor'),
  tmplButtons: document.querySelectorAll('.tmpl-btn'),
  regenerateTmplBtn: document.getElementById('regenerate-tmpl-btn'),
  copyDraftBtn: document.getElementById('copy-draft-btn'),
  copyStatus: document.getElementById('copy-status'),
  
  // Theme & Layers
  themeToggleBtn: document.getElementById('theme-toggle-btn'),
  saasLanding: document.getElementById('saas-landing-page'),
  saasAuth: document.getElementById('saas-auth-portal'),
  appDashboard: document.getElementById('app-dashboard-container'),
  
  // Auth Form elements
  tabLoginBtn: document.getElementById('tab-login-btn'),
  tabSignupBtn: document.getElementById('tab-signup-btn'),
  loginForm: document.getElementById('auth-login-form'),
  signupForm: document.getElementById('auth-signup-form')
};

// API Base URL
const API_BASE = '';

// ----------------- INITIALIZATION -----------------
document.addEventListener('DOMContentLoaded', async () => {
  setupThemeHandler();
  setupNavigation();
  setupSettingsHandlers();
  setupSyncHandlers();
  setupTrackerHandlers();
  setupAssistantHandlers();
  setupModalHandlers();
  
  // Check session on load
  await checkAuthSession();
});

// ----------------- AUTH SECURITY FLOW -----------------

async function checkAuthSession() {
  if (state.token) {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${state.token}` }
      });
      if (res.ok) {
        // Token is active, launch straight into dashboard!
        showAppDashboard();
        return;
      }
    } catch (err) {
      console.error('Session verify failed:', err);
    }
  }
  // Fallback: Token invalid or not found, show landing page
  showLandingPage();
}

function showLandingPage() {
  document.body.classList.add('landing-active');
  elements.saasLanding.classList.remove('hidden');
  elements.saasAuth.classList.add('hidden');
  elements.appDashboard.classList.add('hidden');
}

function showAuthSection(mode) {
  elements.saasLanding.classList.add('hidden');
  elements.saasAuth.classList.remove('hidden');
  toggleAuthForm(mode);
}

function backToLanding() {
  elements.saasAuth.classList.add('hidden');
  elements.saasLanding.classList.remove('hidden');
}

function toggleAuthForm(mode) {
  if (mode === 'login') {
    elements.tabLoginBtn.classList.add('active');
    elements.tabSignupBtn.classList.remove('active');
    elements.loginForm.classList.remove('hidden');
    elements.signupForm.classList.add('hidden');
  } else {
    elements.tabLoginBtn.classList.remove('active');
    elements.tabSignupBtn.classList.add('active');
    elements.loginForm.classList.add('hidden');
    elements.signupForm.classList.remove('hidden');
  }
}

async function handleAuthSubmit(event, mode) {
  event.preventDefault();
  const form = event.target;
  const submitBtn = form.querySelector('.auth-submit-btn');
  const txt = submitBtn.querySelector('.btn-txt');
  const spinner = submitBtn.querySelector('.btn-spinner');
  
  // Start loading state
  txt.classList.add('hidden');
  spinner.classList.remove('hidden');
  submitBtn.disabled = true;

  const email = form.querySelector('input[type="email"]').value;
  const password = form.querySelector('input[type="password"]').value;

  try {
    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Authentication failed.');
    }

    // Save token and user details
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('applytrack_token', data.token);
    localStorage.setItem('applytrack_user', JSON.stringify(data.user));

    showToast(mode === 'login' ? 'Successfully logged in!' : 'Account registered successfully!', 'success');
    
    // Smooth Transition into dashboard
    showAppDashboard();

  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    txt.classList.remove('hidden');
    spinner.classList.add('hidden');
    submitBtn.disabled = false;
  }
}

async function showAppDashboard() {
  document.body.classList.remove('landing-active');
  elements.saasLanding.classList.add('hidden');
  elements.saasAuth.classList.add('hidden');
  elements.appDashboard.classList.remove('hidden');

  // Trigger loading configuration
  await loadSettings();
  await syncData();
}

function handleLogout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('applytrack_token');
  localStorage.removeItem('applytrack_user');
  
  showToast('Logged out successfully.', 'info');
  showLandingPage();
}

// Global Authorized Fetch wrapper
async function authenticatedFetch(url, options = {}) {
  const headers = options.headers || {};
  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }
  
  const finalOptions = {
    ...options,
    headers: {
      ...headers,
      'Content-Type': 'application/json'
    }
  };

  try {
    const res = await fetch(url, finalOptions);
    if (res.status === 401 || res.status === 403) {
      handleLogout();
      showToast('Session expired. Please sign in again.', 'error');
      throw new Error('Unauthorized session.');
    }
    return res;
  } catch (err) {
    console.error('Fetch execution error:', err);
    throw err;
  }
}


// ----------------- THEME CONFIGURATION -----------------
function setupThemeHandler() {
  const savedTheme = localStorage.getItem('applytrack-theme');
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
  } else {
    document.body.classList.remove('light-theme');
  }

  if (elements.themeToggleBtn) {
    elements.themeToggleBtn.addEventListener('click', () => {
      document.body.classList.toggle('light-theme');
      const isLight = document.body.classList.contains('light-theme');
      localStorage.setItem('applytrack-theme', isLight ? 'light' : 'dark');
      showToast(isLight ? 'Alabaster Light Theme Active' : 'Obsidian Dark Theme Active', 'info');
    });
  }
}

// ----------------- NAVIGATION -----------------
function setupNavigation() {
  elements.navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-target');
      switchPanel(target);
      
      elements.navButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  document.querySelectorAll('.metric-card').forEach(card => {
    card.addEventListener('click', () => {
      const filter = card.getAttribute('data-filter');
      switchPanel('panel-dashboard');
      
      const tag = document.querySelector(`.filter-tag[data-filter="${filter}"]`);
      if (tag) tag.click();
    });
  });
}

function switchPanel(panelId) {
  state.activePanel = panelId;
  
  elements.panels.forEach(p => p.classList.remove('active'));
  const targetPanel = document.getElementById(panelId);
  if (targetPanel) {
    targetPanel.classList.add('active');
    // Stagger transition re-trigger
    targetPanel.classList.remove('animate-stagger');
    void targetPanel.offsetWidth;
    targetPanel.classList.add('animate-stagger');
  }

  // Update headers
  if (panelId === 'panel-dashboard') {
    elements.panelTitle.textContent = 'Dashboard';
    elements.panelSubtitle.textContent = 'Overview of your automated job application pipeline';
  } else if (panelId === 'panel-tracker') {
    elements.panelTitle.textContent = 'Application Board';
    elements.panelSubtitle.textContent = 'Organize, schedule, and drag-and-drop applications visually';
  } else if (panelId === 'panel-assistant') {
    elements.panelTitle.textContent = 'Response Assistant';
    elements.panelSubtitle.textContent = 'Instantly draft responses for scheduling, accepting, or inquiries';
  } else if (panelId === 'panel-settings') {
    elements.panelTitle.textContent = 'Secure IMAP Configuration';
    elements.panelSubtitle.textContent = 'Credentials are fully isolated and encrypted at-rest';
  }
}

// ----------------- SECURE DATA FETCH & SETTINGS -----------------

async function loadSettings() {
  try {
    const res = await authenticatedFetch(`${API_BASE}/api/settings`);
    if (!res.ok) throw new Error('Could not retrieve settings.');
    
    const settings = await res.json();
    state.settings = settings;

    // Pop inputs
    elements.settingsEmail.value = settings.email || '';
    elements.settingsPassword.value = settings.password || '';
    elements.settingsHost.value = settings.host || 'imap.gmail.com';
    elements.settingsPort.value = settings.port || 993;
    elements.settingsTls.checked = settings.tls !== false;
    elements.settingsDays.value = settings.daysToFetch || 30;
    elements.settingsLimit.value = settings.limit || 100;
    elements.settingsDemo.checked = !settings.demoMode;

    if (elements.daysValueLabel) {
      elements.daysValueLabel.textContent = `${settings.daysToFetch || 30} Days`;
    }

    updateAppModeBadge();
  } catch (err) {
    console.error('Settings load fail:', err);
  }
}

function updateAppModeBadge() {
  if (state.settings.demoMode) {
    elements.appModeBadge.innerHTML = '<span class="pulse-ring"></span>Demo Mode';
    elements.appModeBadge.className = 'mode-badge';
  } else {
    elements.appModeBadge.innerHTML = '<span class="status-indicator green" style="width:6px;height:6px;box-shadow:0 0 6px var(--color-green)"></span>Live IMAP Mode';
    elements.appModeBadge.className = 'mode-badge live-badge';
  }
}

function setupSettingsHandlers() {
  // Slider Label update
  elements.settingsDays.addEventListener('input', (e) => {
    elements.daysValueLabel.textContent = `${e.target.value} Days`;
  });

  // Settings Save Submit
  elements.settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('save-settings-btn');
    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;

    const payload = {
      email: elements.settingsEmail.value,
      password: elements.settingsPassword.value,
      host: elements.settingsHost.value,
      port: parseInt(elements.settingsPort.value, 10),
      tls: elements.settingsTls.checked,
      daysToFetch: parseInt(elements.settingsDays.value, 10),
      limit: parseInt(elements.settingsLimit.value, 10),
      demoMode: !elements.settingsDemo.checked
    };

    try {
      const res = await authenticatedFetch(`${API_BASE}/api/settings`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to update config.');
      
      showToast('Settings saved successfully!', 'success');
      await loadSettings();
      await syncData(); // Hot Sync immediately!
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      saveBtn.textContent = 'Save Configuration';
      saveBtn.disabled = false;
    }
  });

  // Gmail App Password help-guide trigger
  elements.showGuideBtn.addEventListener('click', () => {
    switchPanel('panel-settings');
    // Smooth scroll down to documentation panel
    const documentationElement = document.querySelector('.guide-content');
    if (documentationElement) {
      documentationElement.scrollIntoView({ behavior: 'smooth' });
    }
  });
}

// ----------------- PIPELINE AND EMAIL SCAN SYNC -----------------

async function syncData() {
  elements.syncBtn.classList.add('syncing');
  elements.syncBtn.disabled = true;

  elements.connectionBadge.innerHTML = '<span class="status-indicator yellow"></span><span class="status-text">Scanning mailbox...</span>';
  
  elements.emailContainer.innerHTML = `
    <div class="loading-placeholder">
      <span class="spinner"></span>
      Searching your mailbox for career emails...
    </div>
  `;

  try {
    const res = await authenticatedFetch(`${API_BASE}/api/emails`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'IMAP connection failed.');
    }
    
    const data = await res.json();
    state.emails = data.emails || [];
    
    // Load local pipeline cards
    await loadTrackerJobs();
    
    renderEmailList();
    renderMetrics();
    
    if (data.isDemo) {
      elements.connectionBadge.innerHTML = '<span class="status-indicator yellow"></span><span class="status-text">Demo Mode Active</span>';
      if (state.settings.email && state.settings.password) {
        showToast('Demo data shown. Switch settings toggle to enable Live IMAP.', 'info');
      }
    } else {
      elements.connectionBadge.innerHTML = '<span class="status-indicator green"></span><span class="status-text">Sync Completed</span>';
      
      let toastMsg = `Retrieved ${state.emails.length} application emails!`;
      if (data.autoAddedCount > 0) {
        toastMsg += ` Added ${data.autoAddedCount} new jobs to pipeline.`;
      }
      showToast(toastMsg, 'success');
    }
  } catch (err) {
    console.error('Sync Error:', err);
    elements.connectionBadge.innerHTML = '<span class="status-indicator red"></span><span class="status-text">Sync Error</span>';
    
    elements.emailContainer.innerHTML = `
      <div class="empty-state" style="text-align:center;padding:40px;color:var(--color-text-secondary)">
        <svg style="width: 40px; height: 40px; color: var(--color-red); margin-bottom: 10px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <h4>IMAP Connection Failed</h4>
        <p>${err.message || 'Please check your email credentials, server address, and port in settings.'}</p>
        <button class="btn-secondary" style="margin-top: 15px; font-size: 11px; padding: 6px 12px; cursor:pointer;" onclick="switchPanel('panel-settings')">Fix Settings</button>
      </div>
    `;
    showToast('Failed to sync mailbox. Please check secure settings.', 'error');
  } finally {
    elements.syncBtn.classList.remove('syncing');
    elements.syncBtn.disabled = false;
  }
}

function setupSyncHandlers() {
  elements.syncBtn.addEventListener('click', async () => {
    await syncData();
  });
}

// ----------------- RENDER ENGINE & COMPONENT BUILDERS -----------------

function renderEmailList() {
  const container = elements.emailContainer;
  container.innerHTML = '';

  // Filter based on active state filter
  const filtered = state.emails.filter(email => {
    if (state.activeFilter === 'All') return true;
    return email.category === state.activeFilter;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-reader" style="padding: 40px 0;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:36px;height:36px;opacity:0.2;margin-bottom:8px;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
        <h4 style="font-size:13px;">No emails found matching "${state.activeFilter}"</h4>
      </div>
    `;
    return;
  }

  filtered.forEach(email => {
    const card = document.createElement('div');
    card.className = `email-feed-card ${email.status === 'unread' ? 'unread' : ''} ${state.selectedEmail && state.selectedEmail.id === email.id ? 'active' : ''}`;
    
    // Format Date beautifully
    const emailDate = new Date(email.date);
    const dateDisplay = emailDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    card.innerHTML = `
      <div class="feed-card-header">
        <span class="feed-company">${escapeHtml(email.company)}</span>
        <span class="feed-date">${dateDisplay}</span>
      </div>
      <div class="feed-subject">${escapeHtml(email.subject)}</div>
      <div class="feed-snippet">${escapeHtml(email.snippet)}</div>
      <div class="feed-card-footer">
        <span class="badge-tag ${email.category}">${email.category}</span>
        <span class="feed-role">${escapeHtml(email.role)}</span>
      </div>
    `;

    card.addEventListener('click', () => {
      // Mark read locally
      email.status = 'read';
      state.selectedEmail = email;
      
      // Update visual active card
      document.querySelectorAll('.email-feed-card').forEach(c => c.classList.remove('active'));
      card.classList.remove('unread');
      card.classList.add('active');

      renderEmailReader();
    });

    container.appendChild(card);
  });
}

function renderEmailReader() {
  const container = elements.emailReader;
  const email = state.selectedEmail;

  if (!email) {
    container.innerHTML = `
      <div class="empty-reader">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
        <h4>Select an email to read details</h4>
        <p>Click on any email in the pipeline to read its full content, generate smart reply templates, and view recruiter details.</p>
      </div>
    `;
    return;
  }

  // Format email date
  const emailDate = new Date(email.date);
  const formattedDate = emailDate.toLocaleString(undefined, { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  // Extract all urls from email body dynamically (Smart Action Portal)
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const rawLinks = email.body.match(urlRegex) || [];
  
  // Clean parameter parameters for visual link styling
  const cleanLinks = rawLinks.map(link => {
    // Strip trailing punctuation
    const cleanUrl = link.replace(/[.,;:)("]$/, '');
    let display = cleanUrl.replace(/^https?:\/\/(www\.)?/, '');
    if (display.length > 35) display = display.substring(0, 32) + '...';
    return { url: cleanUrl, display };
  }).filter((item, index, self) => 
    self.findIndex(t => t.url === item.url) === index && 
    !item.url.includes('.png') && !item.url.includes('.jpg') && !item.url.includes('.gif')
  );

  // Generate Action Portal dashboard HTML
  let actionPortalHtml = '';
  if (cleanLinks.length > 0) {
    const portalItems = cleanLinks.map(lnk => {
      let icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:11px;height:11px;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>';
      if (lnk.url.includes('linkedin.com')) {
        // LinkedIn logo placeholder
        icon = '💎';
      }
      return `<a href="${lnk.url}" target="_blank" rel="noopener" class="btn-portal-link">${icon} ${lnk.display}</a>`;
    }).join('');

    actionPortalHtml = `
      <div class="email-actions-box animate-float">
        <div class="actions-box-title">⚡ Quick Access & Recruiter Portals</div>
        <div class="actions-portal-row">
          ${portalItems}
        </div>
      </div>
    `;
  }

  // Format email text body & Beautify ugly raw tracking links
  const formattedBody = formatEmailBodyAndActions(email.body);

  container.innerHTML = `
    <div class="reader-container">
      <div class="reader-header">
        <h3>${escapeHtml(email.subject)}</h3>
        <div class="reader-meta-row">
          <span class="reader-from">From: <strong>${escapeHtml(email.from)}</strong></span>
          <span class="reader-date">${formattedDate}</span>
        </div>
      </div>

      ${actionPortalHtml}

      <div class="reader-meta-row" style="margin-bottom:12px;">
        <span class="badge-tag ${email.category}">${email.category}</span>
        <button class="assistant-trigger-btn" id="trigger-assistant-quick-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          Smart Assistant Reply
        </button>
      </div>

      <div class="reader-body-scroller">${formattedBody}</div>
    </div>
  `;

  // Bind trigger buttons inside detailed scroller
  document.getElementById('trigger-assistant-quick-btn').addEventListener('click', () => {
    // Fill in workspace defaults
    elements.tmplCompany.value = email.company;
    elements.tmplRole.value = email.role;
    
    // Choose correct templates based on email category
    let tType = 'Interview';
    if (email.category === 'Rejection') tType = 'Rejection';
    if (email.category === 'Assessment') tType = 'Assessment';
    if (email.category === 'Offer') tType = 'Offer';
    
    // Update Templates buttons class
    elements.tmplButtons.forEach(b => {
      if (b.getAttribute('data-type') === tType) b.classList.add('active');
      else b.classList.remove('active');
    });
    
    state.assistantType = tType;
    switchPanel('panel-assistant');
    generateTemplateDraft();
  });
}

// Helper to clean links insideplain text email bodies
function formatEmailBodyAndActions(bodyText) {
  if (!bodyText) return '';
  
  // Clean raw links to elegant badges
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  let matches = [...bodyText.matchAll(urlRegex)];
  
  if (matches.length === 0) return escapeHtml(bodyText);

  let outputHtml = '';
  let lastIndex = 0;

  matches.forEach(match => {
    const rawUrl = match[0];
    const cleanUrl = rawUrl.replace(/[.,;:)("]$/, ''); // strip trailing dots/brackets
    const startIndex = match.index;

    // Append preceding text
    outputHtml += escapeHtml(bodyText.substring(lastIndex, startIndex));

    // Create a beautiful, compact monospace visual link tag
    let display = cleanUrl.replace(/^https?:\/\/(www\.)?/, '');
    if (display.length > 40) {
      // Keep domain + snippet of slug
      display = display.substring(0, 38) + '...';
    }

    outputHtml += `<a href="${cleanUrl}" target="_blank" rel="noopener" class="beautified-link">🔗 ${escapeHtml(display)}</a>`;
    lastIndex = startIndex + rawUrl.length;
  });

  // Append remaining text
  outputHtml += escapeHtml(bodyText.substring(lastIndex));
  return outputHtml;
}

function renderMetrics() {
  // Metrics calculation based on loaded tracker jobs
  const total = state.trackedJobs.length;
  const assessments = state.trackedJobs.filter(j => j.status === 'Assessment').length;
  const interviews = state.trackedJobs.filter(j => j.status === 'Interviewing').length;
  const offers = state.trackedJobs.filter(j => j.status === 'Offer').length;

  elements.statTotal.textContent = total;
  elements.statAssessments.textContent = assessments;
  elements.statInterviews.textContent = interviews;
  elements.statOffers.textContent = offers;
}

// ----------------- PIPELINE KANBAN CONTROLLER -----------------

async function loadTrackerJobs() {
  try {
    const res = await authenticatedFetch(`${API_BASE}/api/tracker`);
    if (!res.ok) throw new Error('Could not pull pipeline board.');
    
    state.trackedJobs = await res.json();
    renderKanbanBoard();
  } catch (err) {
    console.error('Tracker load fail:', err);
  }
}

function renderKanbanBoard() {
  const columns = ['Applied', 'Assessment', 'Interviewing', 'Offer', 'Rejected'];
  
  // Clear columns
  columns.forEach(col => {
    const colContainer = document.getElementById(`cards-${col}`);
    if (colContainer) colContainer.innerHTML = '';
    const badge = document.getElementById(`count-${col}`);
    if (badge) badge.textContent = '0';
  });

  // Populate pipeline board
  state.trackedJobs.forEach(job => {
    const colContainer = document.getElementById(`cards-${job.status}`);
    if (!colContainer) return; // safety boundary

    const card = document.createElement('div');
    card.className = 'kanban-card';
    card.setAttribute('draggable', 'true');
    card.setAttribute('data-id', job.id);

    // Format applied date
    let dateStr = 'Unknown Date';
    if (job.dateApplied) {
      const d = new Date(job.dateApplied);
      dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }

    card.innerHTML = `
      <div class="card-title-row">
        <span class="card-company">${escapeHtml(job.company)}</span>
        <button class="btn-card-edit" aria-label="Edit job details">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
        </button>
      </div>
      <div class="card-role">${escapeHtml(job.role)}</div>
      <div class="card-footer">
        <span class="card-date">${dateStr}</span>
        <span class="card-tag ${job.status}">${job.status}</span>
      </div>
    `;

    // Trigger edit card modal modal
    card.querySelector('.btn-card-edit').addEventListener('click', (e) => {
      e.stopPropagation();
      openEditJobModal(job);
    });

    // Setup drag listeners
    card.addEventListener('dragstart', () => {
      card.classList.add('dragging');
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
    });

    colContainer.appendChild(card);
  });

  // Recalculate column counters
  columns.forEach(col => {
    const colContainer = document.getElementById(`cards-${col}`);
    const badge = document.getElementById(`count-${col}`);
    if (colContainer && badge) {
      badge.textContent = colContainer.children.length;
    }
  });

  renderMetrics();
}

function setupTrackerHandlers() {
  // Bind Kanban board drop events
  elements.kanbanColumns.forEach(column => {
    column.addEventListener('dragover', (e) => {
      e.preventDefault();
      const card = document.querySelector('.kanban-card.dragging');
      if (card) {
        column.appendChild(card);
      }
    });

    column.addEventListener('drop', async (e) => {
      e.preventDefault();
      const card = document.querySelector('.kanban-card.dragging');
      if (!card) return;

      const jobId = card.getAttribute('data-id');
      const newStatus = column.parentNode.getAttribute('data-status');

      // Find job in active state
      const targetJob = state.trackedJobs.find(j => j.id === jobId);
      if (targetJob && targetJob.status !== newStatus) {
        // Update local status
        targetJob.status = newStatus;
        
        try {
          const res = await authenticatedFetch(`${API_BASE}/api/tracker`, {
            method: 'POST',
            body: JSON.stringify(targetJob)
          });
          if (!res.ok) throw new Error();
          
          showToast(`Pipeline updated: Moved ${targetJob.company} to ${newStatus}`, 'success');
          renderKanbanBoard();
        } catch (err) {
          showToast('Failed to update pipeline board status.', 'error');
          await loadTrackerJobs(); // reset visual components
        }
      }
    });
  });

  // Filter tag buttons inside left feed mailbox
  elements.filterTags.forEach(tag => {
    tag.addEventListener('click', () => {
      elements.filterTags.forEach(t => t.classList.remove('active'));
      tag.classList.add('active');
      state.activeFilter = tag.getAttribute('data-filter');
      renderEmailList();
    });
  });
}

// ----------------- PIPELINE JOB MODAL (ADD / EDIT) -----------------

function setupModalHandlers() {
  // Add new job trigger
  elements.openAddJobBtn.addEventListener('click', () => {
    elements.jobIdInput.value = '';
    elements.jobEmailIdInput = '';
    elements.jobCompanyInput.value = '';
    elements.jobRoleInput.value = '';
    elements.jobStatusSelect.value = 'Applied';
    elements.jobDateInput.value = new Date().toISOString().split('T')[0];
    elements.jobNotesTextarea.value = '';
    
    elements.modalTitle.textContent = 'Track New Application';
    elements.deleteJobBtn.classList.add('hidden');
    elements.jobModal.classList.remove('hidden');
  });

  // Close modals
  elements.closeModalBtn.addEventListener('click', () => {
    elements.jobModal.classList.add('hidden');
  });

  // Handle modal submit Form
  elements.jobForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('save-job-btn');
    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;

    const payload = {
      id: elements.jobIdInput.value || 'job-' + Date.now(),
      company: elements.jobCompanyInput.value.trim(),
      role: elements.jobRoleInput.value.trim(),
      status: elements.jobStatusSelect.value,
      dateApplied: elements.jobDateInput.value,
      notes: elements.jobNotesTextarea.value.trim()
    };

    try {
      const res = await authenticatedFetch(`${API_BASE}/api/tracker`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Could not update job pipeline.');
      
      showToast('Application updated successfully!', 'success');
      elements.jobModal.classList.add('hidden');
      await loadTrackerJobs();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      saveBtn.textContent = 'Save Application';
      saveBtn.disabled = false;
    }
  });

  // Handle delete job trigger
  elements.deleteJobBtn.addEventListener('click', async () => {
    const id = elements.jobIdInput.value;
    if (!id) return;
    
    if (!confirm('Are you sure you want to delete this tracked application?')) return;

    elements.deleteJobBtn.textContent = 'Deleting...';
    elements.deleteJobBtn.disabled = true;

    try {
      const res = await authenticatedFetch(`${API_BASE}/api/tracker/delete`, {
        method: 'POST',
        body: JSON.stringify({ id })
      });

      if (!res.ok) throw new Error();
      
      showToast('Application deleted.', 'success');
      elements.jobModal.classList.add('hidden');
      await loadTrackerJobs();
    } catch (err) {
      showToast('Failed to delete application.', 'error');
    } finally {
      elements.deleteJobBtn.textContent = 'Delete Application';
      elements.deleteJobBtn.disabled = false;
    }
  });
}

function openEditJobModal(job) {
  elements.jobIdInput.value = job.id;
  elements.jobCompanyInput.value = job.company;
  elements.jobRoleInput.value = job.role;
  elements.jobStatusSelect.value = job.status;
  elements.jobDateInput.value = job.dateApplied || '';
  elements.jobNotesTextarea.value = job.notes || '';

  elements.modalTitle.textContent = 'Edit Application Details';
  elements.deleteJobBtn.classList.remove('hidden');
  elements.jobModal.classList.remove('hidden');
}

// ----------------- RESPONSE TEMPLATE ASSISTANT -----------------

function setupAssistantHandlers() {
  // Bind template tabs clicks
  elements.tmplButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.tmplButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.assistantType = btn.getAttribute('data-type');
      generateTemplateDraft();
    });
  });

  elements.regenerateTmplBtn.addEventListener('click', () => {
    generateTemplateDraft();
  });

  // Copy trigger
  elements.copyDraftBtn.addEventListener('click', () => {
    elements.templateEditor.select();
    document.execCommand('copy');
    
    // Animate copy toast
    elements.copyStatus.classList.remove('hidden');
    setTimeout(() => {
      elements.copyStatus.classList.add('hidden');
    }, 2000);
    showToast('Copied draft to clipboard!', 'success');
  });
}

async function generateTemplateDraft() {
  const company = elements.tmplCompany.value.trim() || 'Recruiting Team';
  const role = elements.tmplRole.value.trim() || 'Software Engineer';
  const type = state.assistantType;

  elements.templateEditor.value = 'Generating professional response draft...';
  
  try {
    const res = await authenticatedFetch(`${API_BASE}/api/generate-response`, {
      method: 'POST',
      body: JSON.stringify({ company, role, category: type })
    });
    if (!res.ok) throw new Error('AI generation helper failed.');
    
    const data = await res.json();
    elements.templateEditor.value = data.draft || '';
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ----------------- GENERAL GLOBAL UI TOAST NOTIFICATION -----------------

function showToast(text, type = 'info') {
  const toast = document.getElementById('global-toast');
  if (!toast) return;

  toast.textContent = text;
  toast.className = `toast-message ${type}`;
  toast.classList.remove('hidden');

  // Trigger smooth progressive bounce
  toast.style.animation = 'none';
  void toast.offsetWidth;
  toast.style.animation = 'toast-entrance 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';

  // Automatically fade after 3 seconds
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 4000);
}

// Helper to escape HTML to prevent XSS injection
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
}
