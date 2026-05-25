// ApplyTrack // Premium Application Logic Client

// Global Application State
const state = {
  activePanel: 'panel-dashboard',
  emails: [],
  trackedJobs: [],
  selectedEmail: null,
  activeFilter: 'All',
  settings: {},
  assistantType: 'Interview', // Active template type
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
  daysValueLabel: document.getElementById('days-value'),
  
  // Tracker Board
  kanbanColumns: document.querySelectorAll('.kanban-cards-container'),
  openAddJobBtn: document.getElementById('open-add-job-modal'),
  jobModal: document.getElementById('job-modal'),
  closeModalBtn: document.getElementById('close-modal-btn'),
  cancelModalBtn: document.getElementById('cancel-modal-btn'),
  jobForm: document.getElementById('job-form'),
  jobIdInput: document.getElementById('job-id'),
  jobCompanyInput: document.getElementById('job-company'),
  jobRoleInput: document.getElementById('job-role'),
  jobStatusSelect: document.getElementById('job-status'),
  jobDateInput: document.getElementById('job-date'),
  jobNotesTextarea: document.getElementById('job-notes'),
  modalTitle: document.getElementById('modal-title'),
  
  // Response Assistant
  tmplCompany: document.getElementById('tmpl-company'),
  tmplRole: document.getElementById('tmpl-role'),
  templateEditor: document.getElementById('template-editor'),
  tmplButtons: document.querySelectorAll('.tmpl-btn'),
  regenerateTmplBtn: document.getElementById('regenerate-tmpl-btn'),
  copyDraftBtn: document.getElementById('copy-draft-btn'),
  copyStatus: document.getElementById('copy-status'),
  
  // Guide Modals
  showGuideBtn: document.getElementById('show-guide-btn'),
  guideModal: document.getElementById('guide-modal'),
  closeGuideBtn: document.getElementById('close-guide-btn'),
  gotItBtn: document.getElementById('got-it-btn'),
  themeToggleBtn: document.getElementById('theme-toggle-btn')
};

// API Base URL (Assumed local since running on same Node server)
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
  
  // Initial Loads
  await loadSettings();
  await syncData(); // Auto sync (loads demo or IMAP data based on loaded settings)
});

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
      
      // Update sidebar active buttons
      elements.navButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Connect metric cards to email filter triggers
  document.querySelectorAll('.metric-card').forEach(card => {
    card.addEventListener('click', () => {
      const filter = card.getAttribute('data-filter');
      switchPanel('panel-dashboard');
      
      // Trigger matching filter tag click
      const tag = document.querySelector(`.filter-tag[data-filter="${filter}"]`);
      if (tag) tag.click();
    });
  });
}

function switchPanel(panelId) {
  state.activePanel = panelId;
  
  // Toggle panel visibility
  elements.panels.forEach(p => p.classList.remove('active'));
  const targetPanel = document.getElementById(panelId);
  targetPanel.classList.add('active');
  
  // Update Title and Subtitle dynamically
  let title = 'Dashboard';
  let subtitle = 'Overview of your job application pipeline';
  
  if (panelId === 'panel-tracker') {
    title = 'Application Tracker';
    subtitle = 'Manage and visualize your hiring pipeline';
    loadTrackerData(); // Refresh tracker data when viewing
  } else if (panelId === 'panel-assistant') {
    title = 'Response Assistant';
    subtitle = 'Instant professional reply templates';
  } else if (panelId === 'panel-settings') {
    title = 'IMAP Configuration';
    subtitle = 'Securely link and customize your email scanner';
  }
  
  elements.panelTitle.textContent = title;
  elements.panelSubtitle.textContent = subtitle;
}

// ----------------- SETTINGS MANAGEMENT -----------------
async function loadSettings() {
  try {
    const res = await fetch(`${API_BASE}/api/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    
    state.settings = await res.json();
    
    // Fill Settings Inputs
    elements.settingsEmail.value = state.settings.email || '';
    // Show masked password if already set
    if (state.settings.hasPassword) {
      elements.settingsPassword.value = '********';
    } else {
      elements.settingsPassword.value = '';
    }
    elements.settingsHost.value = state.settings.host || 'imap.gmail.com';
    elements.settingsPort.value = state.settings.port || 993;
    elements.settingsTls.checked = state.settings.tls !== false;
    elements.settingsDays.value = state.settings.daysToFetch || 30;
    elements.settingsLimit.value = state.settings.limit || 50;
    elements.settingsDemo.checked = !state.settings.demoMode; // Active toggle: Checked means Live IMAP (Not Demo)
    
    elements.daysValueLabel.textContent = `${elements.settingsDays.value} Days`;
    
    updateAppModeBadge();
  } catch (err) {
    console.error('Error loading settings:', err);
    showToast('Failed to load settings from server', 'error');
  }
}

function setupSettingsHandlers() {
  // Sync slider label
  elements.settingsDays.addEventListener('input', (e) => {
    elements.daysValueLabel.textContent = `${e.target.value} Days`;
  });
  
  // Form submission
  elements.settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const updatedSettings = {
      email: elements.settingsEmail.value.trim(),
      password: elements.settingsPassword.value,
      host: elements.settingsHost.value.trim(),
      port: parseInt(elements.settingsPort.value),
      tls: elements.settingsTls.checked,
      daysToFetch: parseInt(elements.settingsDays.value),
      limit: parseInt(elements.settingsLimit.value),
      demoMode: !elements.settingsDemo.checked // Checked Live -> demoMode False
    };
    
    try {
      const res = await fetch(`${API_BASE}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      });
      
      const result = await res.json();
      if (result.success) {
        showToast('Configuration saved successfully!', 'success');
        await loadSettings(); // Reload
        await syncData(); // Auto reload emails with new settings
      } else {
        showToast(result.message || 'Failed to save settings', 'error');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      showToast('Error connecting to local server settings API', 'error');
    }
  });
}

function updateAppModeBadge() {
  if (state.settings.demoMode) {
    elements.appModeBadge.className = 'mode-badge';
    elements.appModeBadge.innerHTML = '<span class="pulse-ring"></span>Sandbox Demo';
    
    elements.connectionBadge.innerHTML = '<span class="status-indicator yellow"></span><span class="status-text">Demo Mode Active</span>';
  } else {
    elements.appModeBadge.className = 'mode-badge live';
    elements.appModeBadge.innerHTML = '<span class="pulse-ring"></span>Live IMAP Mode';
    
    elements.connectionBadge.innerHTML = '<span class="status-indicator green"></span><span class="status-text">Live Sync Ready</span>';
  }
}

// ----------------- EMAIL SYNCHRONIZATION -----------------
async function syncData() {
  elements.syncBtn.classList.add('syncing');
  elements.syncBtn.disabled = true;
  
  // Update status text dynamically
  elements.connectionBadge.innerHTML = '<span class="status-indicator yellow"></span><span class="status-text">Syncing...</span>';

  // Render initial list spinner
  elements.emailContainer.innerHTML = `
    <div class="loading-placeholder">
      <span class="spinner"></span>
      Searching your mailbox for career emails...
    </div>
  `;

  try {
    const res = await fetch(`${API_BASE}/api/emails`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'IMAP connection failed');
    }
    
    const data = await res.json();
    state.emails = data.emails || [];
    
    renderEmailList();
    renderMetrics();
    
    // Auto-update message logic
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
      <div class="empty-state">
        <svg style="width: 40px; height: 40px; color: var(--color-red); margin-bottom: 10px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <h4>IMAP Connection Failed</h4>
        <p>${err.message || 'Please check your email credentials, server address, and port in settings.'}</p>
        <button class="btn-secondary" style="margin-top: 10px; font-size: 11px; padding: 6px 12px;" onclick="switchPanel('panel-settings')">Fix Settings</button>
      </div>
    `;
    showToast('Failed to sync. Please check secure settings.', 'error');
  } finally {
    elements.syncBtn.classList.remove('syncing');
    elements.syncBtn.disabled = false;
  }
}

function setupSyncHandlers() {
  elements.syncBtn.addEventListener('click', async () => {
    await syncData();
    // Also load tracker data if we synced
    if (state.activePanel === 'panel-tracker') {
      await loadTrackerData();
    }
  });

  // Setup email filter tag clicks
  elements.filterTags.forEach(tag => {
    tag.addEventListener('click', () => {
      elements.filterTags.forEach(t => t.classList.remove('active'));
      tag.classList.add('active');
      state.activeFilter = tag.getAttribute('data-filter');
      renderEmailList();
    });
  });
}

// ----------------- METRICS RENDER -----------------
function renderMetrics() {
  // Totals computed from emails list
  const total = state.emails.length;
  const assessments = state.emails.filter(e => e.category === 'Assessment').length;
  const interviews = state.emails.filter(e => e.category === 'Interview').length;
  const offers = state.emails.filter(e => e.category === 'Offer').length;

  elements.statTotal.textContent = total;
  elements.statAssessments.textContent = assessments;
  elements.statInterviews.textContent = interviews;
  elements.statOffers.textContent = offers;
}

// ----------------- EMAIL LIST RENDERING -----------------
function renderEmailList() {
  elements.emailContainer.innerHTML = '';
  
  // Filter emails based on filter state
  const filteredEmails = state.emails.filter(email => {
    if (state.activeFilter === 'All') return true;
    return email.category === state.activeFilter;
  });

  if (filteredEmails.length === 0) {
    elements.emailContainer.innerHTML = `
      <div class="empty-state">
        <svg style="width:36px; height:36px; color: var(--text-muted); margin-bottom: 8px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
        <h4>No Emails Found</h4>
        <p>No job application emails found matching category "${state.activeFilter}".</p>
      </div>
    `;
    return;
  }

  filteredEmails.forEach(email => {
    const card = document.createElement('div');
    card.className = `email-card category-${email.category.toLowerCase()}`;
    if (state.selectedEmail && state.selectedEmail.id === email.id) {
      card.classList.add('selected');
    }

    const formattedDate = formatDate(email.date);

    card.innerHTML = `
      <div class="email-card-header">
        <span class="sender-name" title="${email.from}">${email.company}</span>
        <span class="email-date">${formattedDate}</span>
      </div>
      <div class="email-subject" title="${email.subject}">${email.subject}</div>
      <div class="email-snippet">${email.snippet}</div>
      <div class="badge-row">
        <span class="email-badge badge-${email.category.toLowerCase()}">${email.category}</span>
        ${email.status === 'unread' ? '<span class="unread-dot"></span>' : ''}
      </div>
    `;

    card.addEventListener('click', () => {
      // Mark read locally
      email.status = 'read';
      state.selectedEmail = email;
      
      // Update selected class in DOM
      document.querySelectorAll('.email-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      
      // Clear unread indicator
      const dot = card.querySelector('.unread-dot');
      if (dot) dot.remove();

      renderEmailDetail(email);
    });

    elements.emailContainer.appendChild(card);
  });
}

function formatEmailBodyAndActions(email) {
  const bodyText = email.body || '';
  
  // Regex to extract raw URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const rawUrls = bodyText.match(urlRegex) || [];
  
  // Clean trailing punctuation from URLs
  const urls = [...new Set(rawUrls.map(url => {
    let clean = url;
    while (clean && /[.,;:)\]}>]$/.test(clean)) {
      clean = clean.slice(0, -1);
    }
    return clean;
  }))].filter(url => url.length > 8);

  let formattedBody = escapeHtml(bodyText);
  const detectedActions = [];

  urls.forEach(url => {
    let label = 'Visit Portal';
    let icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`;
    let type = 'general';
    let brand = '';

    const lowerUrl = url.toLowerCase();
    
    // Categorize and brand URLs
    if (lowerUrl.includes('linkedin.com')) {
      brand = 'linkedin';
      type = 'linkedin';
      icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>`;
      if (lowerUrl.includes('/view/') || lowerUrl.includes('/jobs/')) {
        label = 'View Job on LinkedIn';
      } else {
        label = 'LinkedIn Careers';
      }
    } else if (lowerUrl.includes('hackerrank.com') || lowerUrl.includes('codility.com') || lowerUrl.includes('codesignal.com') || lowerUrl.includes('assessment') || lowerUrl.includes('challenge')) {
      brand = 'assessment';
      type = 'assessment';
      label = 'Start Coding Challenge';
      icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`;
    } else if (lowerUrl.includes('calendly.com') || lowerUrl.includes('zoom.us') || lowerUrl.includes('meet.google') || lowerUrl.includes('scheduler') || lowerUrl.includes('calendar')) {
      brand = 'calendar';
      type = 'schedule';
      label = 'Schedule Interview';
      icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;
    } else if (lowerUrl.includes('google.com') && lowerUrl.includes('goc')) {
      brand = 'google';
      type = 'assessment';
      label = 'Google Online Challenge';
      icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`;
    } else if (lowerUrl.includes('greenhouse.io') || lowerUrl.includes('lever.co') || lowerUrl.includes('workday') || lowerUrl.includes('smartrecruiters.com')) {
      brand = 'portal';
      type = 'portal';
      label = 'Application Dashboard';
      icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line></svg>`;
    }

    detectedActions.push({ url, label, icon, type, brand });
  });

  // Shorten and swap raw inline links inside body text
  urls.forEach(url => {
    let displayUrl = url;
    try {
      const urlObj = new URL(url);
      displayUrl = urlObj.hostname + urlObj.pathname;
      if (urlObj.pathname === '/' || urlObj.pathname === '') {
        displayUrl = urlObj.hostname;
      }
      if (displayUrl.endsWith('/')) {
        displayUrl = displayUrl.slice(0, -1);
      }
      if (displayUrl.length > 50) {
        displayUrl = displayUrl.substring(0, 47) + '...';
      }
    } catch (e) {
      if (displayUrl.length > 50) {
        displayUrl = displayUrl.substring(0, 47) + '...';
      }
    }

    const escapedUrl = escapeHtml(url);
    const replacementLink = `<a href="${url}" target="_blank" class="email-inline-link" title="${escapeHtml(url)}">${escapeHtml(displayUrl)}</a>`;
    formattedBody = formattedBody.split(escapedUrl).join(replacementLink);
  });

  return {
    bodyHtml: formattedBody,
    actions: detectedActions
  };
}

function renderEmailDetail(email) {
  const { bodyHtml, actions } = formatEmailBodyAndActions(email);

  let actionsPanelHtml = '';
  if (actions.length > 0) {
    actionsPanelHtml = `
      <div class="email-actions-box">
        <div class="actions-box-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
          <span>Quick Access & Recruiter Portals</span>
        </div>
        <div class="actions-buttons-grid">
          ${actions.map(act => `
            <a href="${act.url}" target="_blank" class="action-portal-btn type-${act.type}">
              <span class="portal-icon">${act.icon}</span>
              <span class="portal-label">${act.label}</span>
            </a>
          `).join('')}
        </div>
      </div>
    `;
  }

  elements.emailReader.innerHTML = `
    <div class="reader-details">
      <div class="reader-header">
        <div class="reader-title-row">
          <h2>${email.subject}</h2>
          <span class="email-badge badge-${email.category.toLowerCase()}">${email.category}</span>
        </div>
        <div class="reader-meta-row">
          <div class="reader-sender">
            <strong>${email.company}</strong>
            <span class="sender-raw">${email.from}</span>
          </div>
          <div class="reader-date">${formatFullDate(email.date)}</div>
        </div>
      </div>
      
      ${actionsPanelHtml}
      
      <div class="reader-body-scroller">${bodyHtml}</div>
      
      <div class="reader-actions-row">
        <div class="helper-text">
          Target Role: <span>${email.role}</span>
        </div>
        <button class="assistant-trigger-btn" id="reader-reply-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          Smart Assistant Reply
        </button>
      </div>
    </div>
  `;

  // Hook reply assistant button click
  document.getElementById('reader-reply-btn').addEventListener('click', () => {
    // Fill template assistant fields
    elements.tmplCompany.value = email.company;
    elements.tmplRole.value = email.role;
    
    // Auto active corresponding category tab
    let templateCategory = 'FollowUp';
    if (['Interview', 'Rejection', 'Assessment', 'Offer'].includes(email.category)) {
      templateCategory = email.category;
    }
    
    state.assistantType = templateCategory;
    elements.tmplButtons.forEach(btn => {
      if (btn.getAttribute('data-type') === templateCategory) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    switchPanel('panel-assistant');
    generateAssistantResponse();
  });
}

// ----------------- PIPELINE TRACKER (KANBAN) -----------------
async function loadTrackerData() {
  try {
    const res = await fetch(`${API_BASE}/api/tracker`);
    if (!res.ok) throw new Error('Failed to fetch tracker jobs');
    
    state.trackedJobs = await res.json();
    renderTrackerBoard();
  } catch (err) {
    console.error('Error fetching tracker data:', err);
    showToast('Failed to load application tracker pipeline', 'error');
  }
}

function renderTrackerBoard() {
  // Clear all boards
  const columns = ['Applied', 'Assessment', 'Interviewing', 'Offer', 'Rejected'];
  columns.forEach(col => {
    const container = document.getElementById(`cards-${col}`);
    container.innerHTML = '';
    
    // Clear title count
    document.getElementById(`count-${col}`).textContent = '0';
  });

  // Fill board
  state.trackedJobs.forEach(job => {
    const container = document.getElementById(`cards-${job.status}`);
    if (!container) return; // Unknown status
    
    const card = document.createElement('div');
    card.className = 'job-card';
    card.setAttribute('draggable', 'true');
    card.setAttribute('data-id', job.id);
    
    card.innerHTML = `
      <div class="job-card-company">${escapeHtml(job.company)}</div>
      <div class="job-card-role">${escapeHtml(job.role)}</div>
      <div class="job-card-meta">
        <span class="job-card-date">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          ${job.dateApplied}
        </span>
        <div class="job-card-actions">
          <button class="card-icon-btn edit" title="Edit Application">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
          </button>
          <button class="card-icon-btn delete" title="Delete Tracked Job">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          </button>
        </div>
      </div>
    `;

    // Connect Actions
    card.querySelector('.edit').addEventListener('click', (e) => {
      e.stopPropagation();
      openEditJobModal(job);
    });

    card.querySelector('.delete').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm(`Are you sure you want to stop tracking your ${job.role} application at ${job.company}?`)) {
        await deleteTrackedJob(job.id);
      }
    });

    // Drag-Drop handlers
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);

    container.appendChild(card);
  });

  // Update counts
  columns.forEach(col => {
    const list = document.getElementById(`cards-${col}`);
    const count = list.children.length;
    document.getElementById(`count-${col}`).textContent = count;
  });
}

// ----------------- DRAG AND DROP KANBAN ENGINE -----------------
let draggedCardId = null;

function handleDragStart(e) {
  draggedCardId = this.getAttribute('data-id');
  this.style.opacity = '0.4';
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', draggedCardId);
}

function handleDragEnd(e) {
  this.style.opacity = '1';
  elements.kanbanColumns.forEach(col => col.classList.remove('drag-over'));
}

function setupTrackerHandlers() {
  elements.kanbanColumns.forEach(col => {
    col.addEventListener('dragover', (e) => {
      e.preventDefault();
      col.classList.add('drag-over');
    });

    col.addEventListener('dragleave', () => {
      col.classList.remove('drag-over');
    });

    col.addEventListener('drop', async (e) => {
      e.preventDefault();
      col.classList.remove('drag-over');
      
      const id = e.dataTransfer.getData('text/plain');
      const newStatus = col.getAttribute('data-status');
      
      // Find and update status locally first for instantaneous UX
      const jobIndex = state.trackedJobs.findIndex(j => j.id === id);
      if (jobIndex > -1 && state.trackedJobs[jobIndex].status !== newStatus) {
        const originalJob = { ...state.trackedJobs[jobIndex] };
        
        // Update local state
        state.trackedJobs[jobIndex].status = newStatus;
        renderTrackerBoard();
        
        // Push update to server
        try {
          const res = await fetch(`${API_BASE}/api/tracker`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state.trackedJobs[jobIndex])
          });
          
          const data = await res.json();
          if (!data.success) {
            throw new Error(data.message || 'Server rejected board movement');
          }
          showToast(`Moved ${originalJob.company} to ${newStatus}`, 'success');
        } catch (err) {
          console.error('Failed to save drag drop update:', err);
          // Rollback
          state.trackedJobs[jobIndex] = originalJob;
          renderTrackerBoard();
          showToast('Failed to save status update to local database', 'error');
        }
      }
    });
  });
}

// Save manually added/edited job
async function saveJobApplication(jobData) {
  try {
    const res = await fetch(`${API_BASE}/api/tracker`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jobData)
    });
    
    const data = await res.json();
    if (data.success) {
      showToast(jobData.id ? 'Job details updated!' : 'Successfully tracked new application!', 'success');
      hideModal(elements.jobModal);
      await loadTrackerData();
    } else {
      showToast(data.message || 'Failed to save job details', 'error');
    }
  } catch (err) {
    console.error('Error saving job:', err);
    showToast('Failed to connect to local database server', 'error');
  }
}

async function deleteTrackedJob(id) {
  try {
    const res = await fetch(`${API_BASE}/api/tracker/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Application deleted successfully', 'info');
      await loadTrackerData();
    } else {
      showToast('Failed to delete job', 'error');
    }
  } catch (err) {
    console.error('Error deleting job:', err);
    showToast('Failed to connect to server to delete application', 'error');
  }
}

// ----------------- RESPONSE ASSISTANT -----------------
function setupAssistantHandlers() {
  // Selector buttons
  elements.tmplButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.tmplButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.assistantType = btn.getAttribute('data-type');
      generateAssistantResponse();
    });
  });

  // Regenerate Button
  elements.regenerateTmplBtn.addEventListener('click', () => {
    generateAssistantResponse();
  });

  // Copy Draft button
  elements.copyDraftBtn.addEventListener('click', () => {
    elements.templateEditor.select();
    navigator.clipboard.writeText(elements.templateEditor.value)
      .then(() => {
        elements.copyStatus.classList.remove('hidden');
        setTimeout(() => {
          elements.copyStatus.classList.add('hidden');
        }, 2000);
      })
      .catch(err => {
        console.error('Could not copy text: ', err);
        showToast('Clipboard block! Please select and copy manually.', 'error');
      });
  });
}

async function generateAssistantResponse() {
  const company = elements.tmplCompany.value.trim() || 'Example Company';
  const role = elements.tmplRole.value.trim() || 'Software Engineer';
  
  elements.templateEditor.value = "Drafting with template parameters...";

  try {
    const res = await fetch(`${API_BASE}/api/generate-response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: state.assistantType,
        company,
        role
      })
    });
    
    const data = await res.json();
    if (data.success) {
      elements.templateEditor.value = data.draft;
    } else {
      elements.templateEditor.value = "Error generating template response.";
    }
  } catch (err) {
    console.error('Error generating template response:', err);
    elements.templateEditor.value = "Server connection lost. Could not fetch template.";
  }
}

// ----------------- MODAL POPUP TRIGGERS -----------------
function setupModalHandlers() {
  // Track Job Modal Triggers
  elements.openAddJobBtn.addEventListener('click', openAddJobModal);
  elements.closeModalBtn.addEventListener('click', () => hideModal(elements.jobModal));
  elements.cancelModalBtn.addEventListener('click', () => hideModal(elements.jobModal));
  
  // Submit Job Form
  elements.jobForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const jobData = {
      company: elements.jobCompanyInput.value.trim(),
      role: elements.jobRoleInput.value.trim(),
      status: elements.jobStatusSelect.value,
      dateApplied: elements.jobDateInput.value,
      notes: elements.jobNotesTextarea.value.trim()
    };
    
    // If editing
    if (elements.jobIdInput.value) {
      jobData.id = elements.jobIdInput.value;
    }
    
    saveJobApplication(jobData);
  });

  // Guide Modal Triggers
  elements.showGuideBtn.addEventListener('click', () => showModal(elements.guideModal));
  elements.closeGuideBtn.addEventListener('click', () => hideModal(elements.guideModal));
  elements.gotItBtn.addEventListener('click', () => hideModal(elements.guideModal));
}

function openAddJobModal() {
  elements.jobForm.reset();
  elements.jobIdInput.value = '';
  elements.modalTitle.textContent = 'Track New Application';
  elements.jobDateInput.value = new Date().toISOString().split('T')[0]; // Default today
  showModal(elements.jobModal);
}

function openEditJobModal(job) {
  elements.jobIdInput.value = job.id;
  elements.jobCompanyInput.value = job.company;
  elements.jobRoleInput.value = job.role;
  elements.jobStatusSelect.value = job.status;
  elements.jobDateInput.value = job.dateApplied;
  elements.jobNotesTextarea.value = job.notes || '';
  
  elements.modalTitle.textContent = `Edit ${job.company} Details`;
  showModal(elements.jobModal);
}

function showModal(modalEl) {
  modalEl.classList.remove('hidden');
}

function hideModal(modalEl) {
  modalEl.classList.add('hidden');
}

// ----------------- UTILITY FUNCTIONS -----------------
function formatDate(dateString) {
  const d = new Date(dateString);
  const now = new Date();
  
  // If date is today, show time
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // If this year, show "May 25"
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
  
  // Otherwise show full date
  return d.toLocaleDateString([], { year: '2-digit', month: 'numeric', day: 'numeric' });
}

function formatFullDate(dateString) {
  const d = new Date(dateString);
  return d.toLocaleDateString([], { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Premium Toast Notification
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = 'toast-message';
  
  if (type === 'error') {
    toast.style.background = 'var(--color-red)';
    toast.style.boxShadow = '0 4px 15px rgba(248, 113, 113, 0.3)';
    toast.style.color = '#fff';
  } else if (type === 'info') {
    toast.style.background = 'var(--color-blue)';
    toast.style.boxShadow = '0 4px 15px rgba(59, 130, 246, 0.3)';
    toast.style.color = '#fff';
  }
  
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideUp 0.3s ease reverse forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
