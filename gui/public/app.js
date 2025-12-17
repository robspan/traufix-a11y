/**
 * mat-a11y GUI Frontend
 *
 * Accessible JavaScript for the accessibility dashboard.
 */

(function() {
  'use strict';

  // ==========================================================================
  // State
  // ==========================================================================

  let currentResults = null;
  let tierInfo = null;
  let progressInterval = null;

  // ==========================================================================
  // DOM Elements
  // ==========================================================================

  const elements = {
    expertToggle: document.getElementById('expert-mode'),
    darkModeBtn: document.getElementById('dark-mode-btn'),
    scanForm: document.getElementById('scan-form'),
    scanButton: document.getElementById('scan-button'),
    scanPath: document.getElementById('scan-path'),
    currentPathDisplay: document.getElementById('current-path-display'),
    ignorePatterns: document.getElementById('ignore-patterns'),
    // Expert mode elements
    analysisModeRadios: document.querySelectorAll('input[name="analysis-mode"]'),
    sitemapOptions: document.getElementById('sitemap-options'),
    deepResolve: document.getElementById('deep-resolve'),
    collapseRootCause: document.getElementById('collapse-root-cause'),
    workerMode: document.getElementById('worker-mode'),
    singleCheck: document.getElementById('single-check'),
    severityFilter: document.getElementById('severity-filter'),
    cliPreview: document.getElementById('cli-preview'),
    copyCliBtn: document.getElementById('copy-cli'),
    // Panels
    scanPanel: document.querySelector('.scan-panel'),
    progressPanel: document.getElementById('progress-panel'),
    progressText: document.getElementById('progress-text'),
    progressStages: document.querySelectorAll('.progress-stage'),
    resultsPanel: document.getElementById('results-panel'),
    errorPanel: document.getElementById('error-panel'),
    errorMessage: document.getElementById('error-message'),
    errorRetryBtn: document.getElementById('error-retry-btn'),
    newScanBtn: document.getElementById('new-scan-btn'),
    // Preview panel
    previewPanel: document.getElementById('preview-panel'),
    previewFormatName: document.getElementById('preview-format-name'),
    previewContentWrapper: document.getElementById('preview-content-wrapper'),
    previewContent: document.getElementById('preview-content'),
    previewCode: document.getElementById('preview-code'),
    previewInfo: document.getElementById('preview-info'),
    previewBackBtn: document.getElementById('preview-back-btn'),
    previewCopyBtn: document.getElementById('preview-copy-btn'),
    previewDownloadBtn: document.getElementById('preview-download-btn'),
    // Results summary
    totalIssues: document.getElementById('total-issues'),
    componentsCount: document.getElementById('components-count'),
    // Simple mode stats
    statIssuesSimple: document.getElementById('stat-issues-simple'),
    statComponentsSimple: document.getElementById('stat-components-simple'),
    statScoreSimple: document.getElementById('stat-score-simple'),
    // Expert mode stats
    statFiles: document.getElementById('stat-files'),
    statTime: document.getElementById('stat-time'),
    statChecks: document.getElementById('stat-checks'),
    statCritical: document.getElementById('stat-critical'),
    statHigh: document.getElementById('stat-high'),
    statMedium: document.getElementById('stat-medium'),
    // Export search
    exportSearch: document.getElementById('export-search'),
    exportNoResults: document.getElementById('export-no-results'),
    exportGroups: document.querySelectorAll('.export-group'),
    exportBtns: document.querySelectorAll('.export-btn')
  };

  // Current preview data (for copy/download)
  let currentPreview = {
    content: '',
    filename: '',
    mimeType: '',
    format: ''
  };

  // Track scan start time
  let scanStartTime = null;

  // ==========================================================================
  // API Functions
  // ==========================================================================

  async function fetchJSON(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  async function loadTierInfo() {
    try {
      const data = await fetchJSON('/api/tiers');
      tierInfo = data.tiers;
      updateTierCounts();
    } catch (err) {
      console.warn('Could not load tier info:', err);
    }
  }

  async function loadCurrentDirectory() {
    try {
      const data = await fetchJSON('/api/cwd');
      if (data.cwd) {
        elements.currentPathDisplay.textContent = `Current: ${data.cwd}`;
      }
    } catch (err) {
      console.warn('Could not load current directory:', err);
    }
  }

  async function loadChecks() {
    try {
      const data = await fetchJSON('/api/checks');
      populateSingleCheckDropdown(data.checks || []);
    } catch (err) {
      console.warn('Could not load checks:', err);
    }
  }

  function populateSingleCheckDropdown(checks) {
    const select = elements.singleCheck;
    if (!select) return;

    // Keep the default option
    select.innerHTML = '<option value="">All checks (default)</option>';

    // Group checks by category if available
    const grouped = {};
    for (const check of checks) {
      const category = check.category || 'Other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(check);
    }

    // Add options grouped by category
    for (const [category, categoryChecks] of Object.entries(grouped).sort()) {
      const optgroup = document.createElement('optgroup');
      optgroup.label = category;

      for (const check of categoryChecks) {
        const option = document.createElement('option');
        option.value = check.id;
        option.textContent = check.name || check.id;
        optgroup.appendChild(option);
      }

      select.appendChild(optgroup);
    }
  }

  // ==========================================================================
  // Progress Stage Animation
  // ==========================================================================

  const PROGRESS_MESSAGES = [
    { stage: 'find', text: 'Finding files in your project...' },
    { stage: 'analyze', text: 'Analyzing component structure...' },
    { stage: 'check', text: 'Running accessibility checks...' },
    { stage: 'report', text: 'Generating report...' }
  ];

  function startProgressAnimation() {
    let currentStage = 0;
    updateProgressStage(currentStage);

    progressInterval = setInterval(() => {
      currentStage++;
      if (currentStage < PROGRESS_MESSAGES.length) {
        updateProgressStage(currentStage);
      }
    }, 1500);
  }

  function updateProgressStage(stageIndex) {
    const message = PROGRESS_MESSAGES[stageIndex];
    if (elements.progressText) {
      elements.progressText.textContent = message.text;
    }

    elements.progressStages.forEach((el, i) => {
      el.classList.remove('completed');
      el.removeAttribute('aria-current');

      if (i < stageIndex) {
        el.classList.add('completed');
      } else if (i === stageIndex) {
        el.setAttribute('aria-current', 'step');
      }
    });
  }

  // Minimum delay between stages for visual feedback (GUI only)
  const MIN_STAGE_DELAY = 100;

  async function stopProgressAnimation() {
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }

    // Find current stage
    let currentStage = 0;
    elements.progressStages.forEach((el, i) => {
      if (el.classList.contains('completed')) {
        currentStage = i + 1;
      }
    });

    // Animate through remaining stages with minimum delay for visual feedback
    for (let i = currentStage; i < PROGRESS_MESSAGES.length; i++) {
      updateProgressStage(i);
      await new Promise(resolve => setTimeout(resolve, MIN_STAGE_DELAY));
    }

    // Mark all stages as completed
    elements.progressStages.forEach(el => {
      el.classList.add('completed');
      el.removeAttribute('aria-current');
    });
  }

  // ==========================================================================
  // Settings Persistence (localStorage)
  // ==========================================================================

  const SETTINGS_KEY = 'mat-a11y-scan-settings';

  function saveSettings() {
    const settings = {
      tier: document.querySelector('input[name="tier"]:checked')?.value,
      path: elements.scanPath.value,
      ignorePatterns: elements.ignorePatterns.value,
      analysisMode: document.querySelector('input[name="analysis-mode"]:checked')?.value,
      deepResolve: elements.deepResolve?.checked,
      collapseRootCause: elements.collapseRootCause?.checked,
      workerMode: elements.workerMode?.value,
      singleCheck: elements.singleCheck?.value
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  function loadSettings() {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (!saved) return;

      const settings = JSON.parse(saved);

      // Restore tier
      if (settings.tier) {
        const tierRadio = document.querySelector(`input[name="tier"][value="${settings.tier}"]`);
        if (tierRadio) tierRadio.checked = true;
      }

      // Restore path
      if (settings.path && elements.scanPath) {
        elements.scanPath.value = settings.path;
      }

      // Restore ignore patterns
      if (settings.ignorePatterns && elements.ignorePatterns) {
        elements.ignorePatterns.value = settings.ignorePatterns;
      }

      // Restore analysis mode
      if (settings.analysisMode) {
        const modeRadio = document.querySelector(`input[name="analysis-mode"][value="${settings.analysisMode}"]`);
        if (modeRadio) {
          modeRadio.checked = true;
          // Show/hide sitemap options
          if (elements.sitemapOptions) {
            elements.sitemapOptions.hidden = settings.analysisMode !== 'sitemap';
          }
        }
      }

      // Restore checkboxes
      if (elements.deepResolve && settings.deepResolve !== undefined) {
        elements.deepResolve.checked = settings.deepResolve;
      }
      if (elements.collapseRootCause && settings.collapseRootCause !== undefined) {
        elements.collapseRootCause.checked = settings.collapseRootCause;
      }

      // Restore selects
      if (elements.workerMode && settings.workerMode) {
        elements.workerMode.value = settings.workerMode;
      }
      if (elements.singleCheck && settings.singleCheck) {
        elements.singleCheck.value = settings.singleCheck;
      }
    } catch (err) {
      console.warn('Could not load settings:', err);
    }
  }

  async function runScan(options) {
    return fetchJSON('/api/scan', {
      method: 'POST',
      body: JSON.stringify(options)
    });
  }

  async function exportResults(format, results) {
    return fetchJSON('/api/export', {
      method: 'POST',
      body: JSON.stringify({ format, results })
    });
  }

  // ==========================================================================
  // UI State Management
  // ==========================================================================

  function showPanel(panelName) {
    elements.scanPanel.hidden = panelName !== 'scan';
    elements.progressPanel.hidden = panelName !== 'progress';
    elements.resultsPanel.hidden = panelName !== 'results';
    elements.errorPanel.hidden = panelName !== 'error';
    elements.previewPanel.hidden = panelName !== 'preview';

    // Scroll to top so header is visible
    window.scrollTo(0, 0);

    // Focus management for accessibility
    if (panelName === 'results') {
      elements.resultsPanel.focus();
      announceToScreenReader('Scan complete. Results are now available.');
    } else if (panelName === 'error') {
      elements.errorPanel.focus();
    } else if (panelName === 'progress') {
      announceToScreenReader('Scanning for accessibility issues. Please wait.');
    } else if (panelName === 'preview') {
      elements.previewContent.focus();
      announceToScreenReader('Export preview loaded. Use copy or download buttons.');
    }
  }

  function announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
    announcement.textContent = message;
    document.body.appendChild(announcement);

    setTimeout(() => announcement.remove(), 1000);
  }

  function updateTierCounts() {
    if (!tierInfo) return;

    for (const [tier, info] of Object.entries(tierInfo)) {
      const countEl = document.querySelector(`[data-count="${tier}"]`);
      if (countEl) {
        countEl.textContent = info.checkCount;
      }
    }
  }

  // ==========================================================================
  // Dark Mode
  // ==========================================================================

  function initDarkMode() {
    const savedMode = localStorage.getItem('mat-a11y-dark-mode');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Apply mode: use saved preference if exists, otherwise follow system
    if (savedMode === 'true') {
      document.body.classList.add('dark-mode');
    } else if (savedMode === 'false') {
      document.body.classList.remove('dark-mode');
    } else {
      // No saved preference - follow system
      if (systemPrefersDark) {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }
    }

    // Listen for button click - toggle and save explicit preference
    if (elements.darkModeBtn) {
      elements.darkModeBtn.addEventListener('click', () => {
        const isDark = document.body.classList.contains('dark-mode');

        if (isDark) {
          // Switch to light mode
          document.body.classList.remove('dark-mode');
          localStorage.setItem('mat-a11y-dark-mode', 'false');
          announceToScreenReader('Light mode enabled');
        } else {
          // Switch to dark mode
          document.body.classList.add('dark-mode');
          localStorage.setItem('mat-a11y-dark-mode', 'true');
          announceToScreenReader('Dark mode enabled');
        }
      });
    }

    // Listen for system preference changes (only if user hasn't set a preference)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (localStorage.getItem('mat-a11y-dark-mode') === null) {
        document.body.classList.toggle('dark-mode', e.matches);
      }
    });
  }

  // ==========================================================================
  // Expert Mode
  // ==========================================================================

  function initExpertMode() {
    const savedMode = localStorage.getItem('mat-a11y-expert-mode');
    if (savedMode === 'true') {
      elements.expertToggle.checked = true;
      document.body.classList.add('expert-mode');
    }

    elements.expertToggle.addEventListener('change', (e) => {
      const isExpert = e.target.checked;
      document.body.classList.toggle('expert-mode', isExpert);
      localStorage.setItem('mat-a11y-expert-mode', isExpert);
      updateCliPreview();

      // Reset export filtering when mode changes
      resetExportSearch();

      announceToScreenReader(isExpert ? 'Expert mode enabled' : 'Expert mode disabled');
    });

    // Analysis mode toggle - show/hide sitemap options
    elements.analysisModeRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const isSitemap = e.target.value === 'sitemap';
        elements.sitemapOptions.hidden = !isSitemap;
        updateCliPreview();
      });
    });

    // Update CLI preview when any option changes
    const optionInputs = [
      elements.scanPath,
      elements.ignorePatterns,
      elements.workerMode,
      elements.singleCheck,
      elements.severityFilter,
      elements.deepResolve,
      elements.collapseRootCause
    ];

    optionInputs.forEach(el => {
      if (el) {
        el.addEventListener('change', updateCliPreview);
        el.addEventListener('input', updateCliPreview);
      }
    });

    document.querySelectorAll('input[name="tier"]').forEach(radio => {
      radio.addEventListener('change', updateCliPreview);
    });
  }

  // ==========================================================================
  // CLI Preview
  // ==========================================================================

  function updateCliPreview() {
    if (!elements.cliPreview) return;

    const parts = ['mat-a11y'];

    // Path
    const pathValue = elements.scanPath?.value.trim();
    if (pathValue) {
      parts.push(`"${pathValue}"`);
    }

    // Tier
    const tier = document.querySelector('input[name="tier"]:checked')?.value || 'full';
    if (tier !== 'full') {
      parts.push(`--tier ${tier}`);
    }

    // Analysis mode (expert only)
    if (elements.expertToggle?.checked) {
      const analysisMode = document.querySelector('input[name="analysis-mode"]:checked')?.value;
      if (analysisMode === 'sitemap') {
        parts.push('--sitemap');
        if (elements.deepResolve?.checked) {
          parts.push('--deep');
        }
      } else if (analysisMode === 'file-based') {
        parts.push('--mode file');
      }

      // Workers
      const workerMode = elements.workerMode?.value;
      if (workerMode && workerMode !== 'sync') {
        parts.push(`--workers ${workerMode}`);
      }

      // Single check
      const singleCheck = elements.singleCheck?.value;
      if (singleCheck) {
        parts.push(`--check ${singleCheck}`);
      }

      // Ignore patterns
      const ignoreValue = elements.ignorePatterns?.value.trim();
      if (ignoreValue) {
        parts.push(`--ignore "${ignoreValue}"`);
      }

      // No collapse
      if (!elements.collapseRootCause?.checked) {
        parts.push('--no-collapse');
      }

      // Severity filter
      const severity = elements.severityFilter?.value;
      if (severity) {
        parts.push(`--severity ${severity}`);
      }
    }

    elements.cliPreview.textContent = parts.join(' ');
  }

  function initCliCopy() {
    if (!elements.copyCliBtn) return;

    elements.copyCliBtn.addEventListener('click', async () => {
      const command = elements.cliPreview?.textContent || '';
      try {
        await navigator.clipboard.writeText(command);
        elements.copyCliBtn.classList.add('copied');
        elements.copyCliBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          Copied!
        `;
        announceToScreenReader('Command copied to clipboard');

        setTimeout(() => {
          elements.copyCliBtn.classList.remove('copied');
          elements.copyCliBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Copy
          `;
        }, 2000);
      } catch (err) {
        console.warn('Could not copy to clipboard:', err);
      }
    });
  }

  // ==========================================================================
  // Collapsible Sections
  // ==========================================================================

  function initCollapsibles() {
    const collapsibleHeaders = document.querySelectorAll('.collapsible-header');

    collapsibleHeaders.forEach(header => {
      header.addEventListener('click', () => {
        const isExpanded = header.getAttribute('aria-expanded') === 'true';
        const contentId = header.getAttribute('aria-controls');
        const content = document.getElementById(contentId);

        // Toggle state
        header.setAttribute('aria-expanded', !isExpanded);

        if (content) {
          if (isExpanded) {
            content.hidden = true;
          } else {
            content.hidden = false;
          }
        }

        announceToScreenReader(isExpanded ? 'Section collapsed' : 'Section expanded');
      });
    });

    // Load saved collapse states from localStorage
    const savedStates = JSON.parse(localStorage.getItem('mat-a11y-collapse-states') || '{}');
    collapsibleHeaders.forEach(header => {
      const contentId = header.getAttribute('aria-controls');
      if (savedStates[contentId] === false) {
        header.setAttribute('aria-expanded', 'false');
        const content = document.getElementById(contentId);
        if (content) content.hidden = true;
      }
    });

    // Save states on change
    collapsibleHeaders.forEach(header => {
      header.addEventListener('click', () => {
        const states = {};
        document.querySelectorAll('.collapsible-header').forEach(h => {
          const id = h.getAttribute('aria-controls');
          states[id] = h.getAttribute('aria-expanded') === 'true';
        });
        localStorage.setItem('mat-a11y-collapse-states', JSON.stringify(states));
      });
    });
  }

  // ==========================================================================
  // Scan Form
  // ==========================================================================

  function initScanForm() {
    elements.scanForm.addEventListener('submit', handleScan);
    elements.newScanBtn.addEventListener('click', () => showPanel('scan'));
    elements.errorRetryBtn.addEventListener('click', () => showPanel('scan'));
  }

  async function handleScan(e) {
    e.preventDefault();

    const tier = document.querySelector('input[name="tier"]:checked')?.value || 'full';
    const pathValue = elements.scanPath.value.trim();
    const ignoreValue = elements.ignorePatterns.value.trim();

    const options = { tier };

    if (pathValue) {
      options.path = pathValue;
    }

    if (ignoreValue) {
      options.ignore = ignoreValue.split(',').map(s => s.trim()).filter(Boolean);
    }

    // Expert mode options (only send if expert mode is enabled)
    const isExpertMode = elements.expertToggle.checked;
    if (isExpertMode) {
      // Analysis mode
      const analysisMode = document.querySelector('input[name="analysis-mode"]:checked')?.value;
      if (analysisMode) {
        options.analysisMode = analysisMode;
      }

      // Sitemap options (only if sitemap mode)
      if (analysisMode === 'sitemap' && elements.deepResolve.checked) {
        options.deep = true;
      }

      // SCSS root cause collapse (default is true, send false if unchecked)
      if (!elements.collapseRootCause.checked) {
        options.noCollapse = true;
      }

      // Worker mode
      const workerMode = elements.workerMode.value;
      if (workerMode && workerMode !== 'sync') {
        options.workers = workerMode;
      }

      // Single check
      const singleCheck = elements.singleCheck.value;
      if (singleCheck) {
        options.singleCheck = singleCheck;
      }

      // Severity filter
      const severityFilter = elements.severityFilter?.value;
      if (severityFilter) {
        options.minSeverity = severityFilter;
      }
    }

    // Save settings before scanning
    saveSettings();

    showPanel('progress');
    startProgressAnimation();
    elements.scanButton.disabled = true;
    scanStartTime = Date.now();

    try {
      const results = await runScan(options);

      await stopProgressAnimation();

      if (results.error) {
        throw new Error(results.error);
      }

      currentResults = results;
      currentResults.scanTime = Date.now() - scanStartTime;
      renderResults(results);
      showPanel('results');
    } catch (err) {
      await stopProgressAnimation();
      elements.errorMessage.textContent = err.message || 'An error occurred while scanning.';
      showPanel('error');
    } finally {
      elements.scanButton.disabled = false;
    }
  }

  // ==========================================================================
  // Results Rendering
  // ==========================================================================

  function renderResults(results) {
    const components = results.components || [];
    const totalIssues = results.totalIssues || 0;

    // Update summary text
    elements.totalIssues.textContent = totalIssues;
    elements.componentsCount.textContent = components.length;

    // Update success icon color based on issues
    const successIcon = document.querySelector('.success-icon');
    if (successIcon) {
      if (totalIssues === 0) {
        successIcon.style.background = 'var(--color-success-bg)';
        successIcon.style.color = 'var(--color-success)';
        successIcon.innerHTML = '&#10003;';
      } else if (totalIssues <= 10) {
        successIcon.style.background = 'var(--color-warning-bg)';
        successIcon.style.color = 'var(--color-warning)';
        successIcon.innerHTML = '!';
      } else {
        successIcon.style.background = 'var(--color-error-bg)';
        successIcon.style.color = 'var(--color-error)';
        successIcon.innerHTML = '!!';
      }
    }

    // Update scan statistics
    updateScanStats(results);
  }

  function updateScanStats(results) {
    const totalIssues = results.totalIssues || 0;
    const componentCount = results.componentCount || results.components?.length || 0;
    const fileCount = results.filesScanned || results.totalComponentsScanned || componentCount;
    const score = results.auditScore || null;

    // Simple mode stats
    if (elements.statIssuesSimple) {
      elements.statIssuesSimple.textContent = totalIssues;
    }
    if (elements.statComponentsSimple) {
      elements.statComponentsSimple.textContent = componentCount;
    }
    if (elements.statScoreSimple) {
      elements.statScoreSimple.textContent = score !== null ? score : '--';
      // Color code the score
      if (score !== null) {
        const scoreCard = elements.statScoreSimple.closest('.stat-card');
        if (scoreCard) {
          scoreCard.classList.remove('stat-issues'); // Remove red
          if (score >= 80) {
            elements.statScoreSimple.style.color = 'var(--color-success)';
          } else if (score >= 50) {
            elements.statScoreSimple.style.color = 'var(--color-warning)';
          } else {
            elements.statScoreSimple.style.color = 'var(--color-error)';
          }
        }
      }
    }

    // Expert mode stats
    if (elements.statFiles) {
      elements.statFiles.textContent = fileCount;
    }

    // Scan time
    if (elements.statTime) {
      const timeMs = results.scanTime || 0;
      const timeSec = (timeMs / 1000).toFixed(1);
      elements.statTime.textContent = timeSec + 's';
    }

    // Checks run
    if (elements.statChecks) {
      const checksRun = results.checksRun || results.audits?.length || 82;
      elements.statChecks.textContent = checksRun;
    }

    // Count issues by severity
    let critical = 0, high = 0, medium = 0;

    if (results.issueSummary) {
      for (const issue of results.issueSummary) {
        const impact = issue.impact || 'medium';
        const count = issue.count || 0;
        if (impact === 'critical') critical += count;
        else if (impact === 'high') high += count;
        else medium += count;
      }
    } else if (results.components) {
      for (const comp of results.components) {
        for (const issue of (comp.issues || [])) {
          const impact = issue.severity || issue.impact || 'medium';
          if (impact === 'critical') critical++;
          else if (impact === 'high') high++;
          else medium++;
        }
      }
    }

    if (elements.statCritical) elements.statCritical.textContent = critical;
    if (elements.statHigh) elements.statHigh.textContent = high;
    if (elements.statMedium) elements.statMedium.textContent = medium;

    // Expert totals
    if (elements.totalIssues) elements.totalIssues.textContent = totalIssues;
    if (elements.componentsCount) elements.componentsCount.textContent = componentCount;
  }

  // ==========================================================================
  // Export Functions
  // ==========================================================================

  function initExport() {
    document.querySelectorAll('.export-btn').forEach(btn => {
      btn.addEventListener('click', handleExport);
    });

    // Export search functionality
    if (elements.exportSearch) {
      elements.exportSearch.addEventListener('input', handleExportSearch);
    }
  }

  // Container for search results
  let searchResultsContainer = null;

  /**
   * Reset the export search - clear input and show all groups
   */
  function resetExportSearch() {
    if (elements.exportSearch) {
      elements.exportSearch.value = '';
    }
    if (searchResultsContainer) {
      searchResultsContainer.hidden = true;
      searchResultsContainer.innerHTML = '';
    }
    document.querySelectorAll('.export-group').forEach(group => group.hidden = false);
    if (elements.exportNoResults) {
      elements.exportNoResults.hidden = true;
    }
  }

  function handleExportSearch(e) {
    const query = e.target.value.toLowerCase().trim();

    // Get or create search results container
    if (!searchResultsContainer) {
      searchResultsContainer = document.getElementById('export-search-results');
      if (!searchResultsContainer) {
        searchResultsContainer = document.createElement('div');
        searchResultsContainer.id = 'export-search-results';
        searchResultsContainer.className = 'export-search-results';
        // Insert after search bar
        const searchBar = document.querySelector('.export-search');
        if (searchBar) {
          searchBar.after(searchResultsContainer);
        }
      }
    }

    // Only filter if 3+ characters
    if (query.length < 3) {
      // Show all groups, hide search results
      searchResultsContainer.hidden = true;
      searchResultsContainer.innerHTML = '';
      document.querySelectorAll('.export-group').forEach(group => group.hidden = false);
      elements.exportNoResults.hidden = true;
      return;
    }

    // Calculate scores for all buttons
    const scored = [];
    elements.exportBtns.forEach(btn => {
      const format = btn.dataset.format || '';
      const keywords = btn.dataset.keywords || '';
      const label = btn.querySelector('.export-label')?.textContent || '';
      const desc = btn.querySelector('.export-desc')?.textContent || '';

      // Get all searchable terms
      const terms = `${format} ${keywords} ${label} ${desc}`.toLowerCase().split(/\s+/);

      // Get best match score across all terms
      let bestScore = 0;
      for (const term of terms) {
        const score = fuzzyMatchScore(query, term);
        if (score > bestScore) bestScore = score;
      }

      if (bestScore > 0) {
        scored.push({ btn, score: bestScore, format, label });
      }
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Hide all groups when searching
    document.querySelectorAll('.export-group').forEach(group => group.hidden = true);

    // Show search results
    if (scored.length > 0) {
      searchResultsContainer.hidden = false;
      searchResultsContainer.innerHTML = '<div class="export-options export-search-results-grid"></div>';
      const grid = searchResultsContainer.querySelector('.export-search-results-grid');

      // Clone and append buttons in ranked order
      scored.forEach(({ btn, score }) => {
        const clone = btn.cloneNode(true);
        clone.hidden = false;
        // Normalize styling - remove featured/primary styling in search results
        clone.classList.remove('btn-primary', 'btn-large');
        clone.classList.add('btn-secondary');
        clone.addEventListener('click', handleExport);
        grid.appendChild(clone);
      });

      elements.exportNoResults.hidden = true;
    } else {
      searchResultsContainer.hidden = true;
      searchResultsContainer.innerHTML = '';
      elements.exportNoResults.hidden = false;
    }
  }

  /**
   * Fuzzy match: returns a score 0-1 based on how well query matches target
   * Higher score = better match
   * "prometheus" vs "prometheus" → 1.0 (exact)
   * "yunit" vs "junit" → ~0.8 (high) - allows first char mismatch
   * "prommmeteus" vs "prometheus" → ~0.7 (good)
   */
  function fuzzyMatchScore(query, target) {
    if (!query || !target) return 0;

    // Exact match = perfect score
    if (target === query) return 1.0;

    // Substring match = very high score
    if (target.includes(query)) return 0.95;

    // Starts with query = high score
    if (target.startsWith(query.substring(0, Math.min(3, query.length)))) {
      return 0.85;
    }

    // Check if target starts with query (minus first char) - handles "yunit" → "junit"
    // If query[1:] matches target[1:] exactly, it's a strong match
    if (query.length > 1 && target.length > 1) {
      const queryRest = query.substring(1);
      const targetRest = target.substring(1);
      if (targetRest.startsWith(queryRest)) {
        return 0.9; // Very high score - only first char different
      }
      if (targetRest.includes(queryRest)) {
        return 0.85;
      }
    }

    // Count best sequential character matches (can skip chars in query)
    // Try starting from each position in query to handle first-char typos
    let bestSequential = 0;
    for (let startQ = 0; startQ < Math.min(2, query.length); startQ++) {
      let queryIdx = startQ;
      let matchedChars = 0;

      for (let i = 0; i < target.length && queryIdx < query.length; i++) {
        if (target[i] === query[queryIdx]) {
          matchedChars++;
          queryIdx++;
        }
      }

      const ratio = matchedChars / (query.length - startQ);
      // Penalize slightly for skipping start chars
      const adjustedRatio = ratio * (1 - startQ * 0.1);
      if (adjustedRatio > bestSequential) {
        bestSequential = adjustedRatio;
      }
    }

    // Character frequency similarity (handles typos like double letters)
    const freqScore = characterFrequencyScore(query, target);

    // Take the best of both approaches
    const bestScore = Math.max(bestSequential, freqScore);

    // Return score if above threshold, otherwise 0
    return bestScore >= 0.5 ? bestScore : 0;
  }

  /**
   * Calculate similarity based on character frequency
   * Handles cases like "prommmeteus" where letters are repeated wrong
   */
  function characterFrequencyScore(query, target) {
    const queryChars = new Map();
    const targetChars = new Map();

    // Count characters in query
    for (const c of query) {
      queryChars.set(c, (queryChars.get(c) || 0) + 1);
    }

    // Count characters in target
    for (const c of target) {
      targetChars.set(c, (targetChars.get(c) || 0) + 1);
    }

    // Count matching characters (min of counts)
    let matches = 0;
    for (const [char, count] of queryChars) {
      matches += Math.min(count, targetChars.get(char) || 0);
    }

    // Return ratio of matches to query length
    return matches / query.length;
  }

  async function handleExport(e) {
    const format = e.target.dataset.format || e.target.closest('.export-btn')?.dataset.format;
    if (!format || !currentResults) return;

    const btn = e.target.closest('.export-btn') || e.target;
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'Loading...';

    try {
      const result = await exportResults(format, currentResults);

      // Show preview panel instead of direct download
      await showExportPreview(format, result.content, result.filename, result.mimeType);
    } catch (err) {
      alert('Export failed: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalHTML;
    }
  }

  // ==========================================================================
  // Export Preview
  // ==========================================================================

  const FORMAT_NAMES = {
    'ai': 'AI-Ready Tasks',
    'html': 'Full Report',
    'pdf': 'PDF Summary',
    'json': 'JSON Data',
    'csv': 'CSV Spreadsheet',
    'markdown': 'Markdown',
    'sarif': 'SARIF (GitHub)',
    'junit': 'JUnit XML',
    'github-annotations': 'GitHub Annotations',
    'gitlab-codequality': 'GitLab Code Quality',
    'checkstyle': 'Checkstyle XML',
    'sonarqube': 'SonarQube',
    'prometheus': 'Prometheus Metrics',
    'grafana-json': 'Grafana JSON',
    'datadog': 'Datadog',
    'slack': 'Slack Message',
    'discord': 'Discord Message',
    'teams': 'MS Teams Message'
  };

  function getFormatType(format, mimeType) {
    if (format === 'json' || format === 'sarif' || format === 'gitlab-codequality' ||
        format === 'grafana-json' || format === 'datadog' || format === 'slack' ||
        format === 'discord' || format === 'teams' || format === 'sonarqube') {
      return 'json';
    }
    if (format === 'junit' || format === 'checkstyle' || format === 'html') {
      return 'xml';
    }
    if (format === 'prometheus') {
      return 'prometheus';
    }
    return 'text';
  }

  function highlightJSON(json) {
    // Simple JSON syntax highlighting
    return json.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = 'number';
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'key';
            match = match.replace(/:$/, '') + ':';
          } else {
            cls = 'string';
          }
        } else if (/true|false/.test(match)) {
          cls = 'boolean';
        } else if (/null/.test(match)) {
          cls = 'null';
        }
        return `<span class="${cls}">${escapeHtml(match.replace(/"/g, '&quot;').replace(/&quot;/g, '"'))}</span>`;
      }
    );
  }

  // Preview constants
  const PREVIEW_LINE_LIMIT = 500; // Max lines to show initially
  const PREVIEW_CHAR_LIMIT = 50000; // Max chars to show initially

  async function showExportPreview(format, content, filename, mimeType) {
    // Store for copy/download
    currentPreview = { content, filename, mimeType, format };

    // Update title
    const formatName = FORMAT_NAMES[format] || format.toUpperCase();
    elements.previewFormatName.textContent = formatName + ' Preview';

    // Set format type for styling
    const formatType = getFormatType(format, mimeType);
    elements.previewPanel.setAttribute('data-format-type', formatType);

    // Reset state
    elements.previewContent.hidden = false;

    // Calculate stats
    const lines = content.split('\n').length;
    const size = new Blob([content]).size;
    const sizeStr = size > 1024 * 1024
      ? `${(size / 1024 / 1024).toFixed(1)} MB`
      : size > 1024
        ? `${(size / 1024).toFixed(1)} KB`
        : `${size} bytes`;

    // HTML: save to temp file and open in new browser tab
    // PDF: use hidden iframe to trigger print dialog in same tab
    if (format === 'html' || format === 'pdf') {
      try {
        // Save HTML to temp file on server
        const response = await fetch('/api/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, format: 'html' })
        });

        if (!response.ok) throw new Error('Failed to create preview');

        const { url: previewUrl } = await response.json();

        // Add theme query parameter
        const isDarkMode = document.body.classList.contains('dark-mode');
        const theme = isDarkMode ? 'dark' : 'light';

        if (format === 'pdf') {
          // PDF: Use hidden iframe to print from same tab
          const fullUrl = `${previewUrl}?theme=${theme}`;

          // Remove any existing print iframe
          const existingIframe = document.getElementById('print-iframe');
          if (existingIframe) existingIframe.remove();

          // Create hidden iframe
          const iframe = document.createElement('iframe');
          iframe.id = 'print-iframe';
          iframe.style.cssText = 'position:fixed;top:-10000px;left:-10000px;width:1px;height:1px;';
          iframe.src = fullUrl;
          document.body.appendChild(iframe);

          // Wait for iframe to load, then print
          iframe.onload = () => {
            try {
              iframe.contentWindow.print();
              announceToScreenReader('PDF print dialog opened');
            } catch (e) {
              // Cross-origin or other error - fall back to new tab
              console.warn('Iframe print failed, opening new tab:', e);
              window.open(`${fullUrl}&print=true`, '_blank');
            }
          };
        } else {
          // HTML: Open in new tab
          const fullUrl = `${previewUrl}?theme=${theme}`;
          const newTab = window.open(fullUrl, '_blank');

          if (newTab) {
            announceToScreenReader('HTML report opened in new tab');
          } else {
            alert('Popup blocked. The HTML report will be downloaded instead.');
            downloadFile(content, filename, mimeType);
          }
        }
      } catch (err) {
        // Fallback to download if preview fails
        console.warn('Preview failed, downloading instead:', err);
        downloadFile(content, filename, mimeType);
      }
      return;
    }

    // For large files: lazy load with truncation
    let displayContent = content;
    let isTruncated = false;

    if (lines > PREVIEW_LINE_LIMIT || content.length > PREVIEW_CHAR_LIMIT) {
      isTruncated = true;
      const contentLines = content.split('\n');
      displayContent = contentLines.slice(0, PREVIEW_LINE_LIMIT).join('\n');

      // Also check char limit
      if (displayContent.length > PREVIEW_CHAR_LIMIT) {
        displayContent = displayContent.substring(0, PREVIEW_CHAR_LIMIT);
      }
    }

    // Format and display with syntax highlighting
    if (formatType === 'json') {
      try {
        // Try to pretty-print if not truncated
        if (!isTruncated) {
          const parsed = JSON.parse(content);
          displayContent = JSON.stringify(parsed, null, 2);
        }
      } catch {
        // Keep as-is if parse fails
      }
      // Always apply highlighting (works on partial JSON too)
      const truncateNotice = isTruncated ? '<span class="truncate-notice">\n\n... (truncated)</span>' : '';
      elements.previewCode.innerHTML = highlightJSON(displayContent) + truncateNotice;
    } else {
      // Plain text with optional truncate notice
      elements.previewCode.textContent = displayContent + (isTruncated ? '\n\n... (truncated)' : '');
    }

    // Update info with truncation notice
    let infoText = `${lines.toLocaleString()} lines | ${sizeStr} | ${filename}`;
    if (isTruncated) {
      infoText += ` | Showing first ${PREVIEW_LINE_LIMIT} lines`;
    }
    elements.previewInfo.textContent = infoText;

    // Show panel
    showPanel('preview');
  }

  function initPreview() {
    // Back button
    elements.previewBackBtn.addEventListener('click', () => {
      showPanel('results');
    });

    // Copy button
    elements.previewCopyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(currentPreview.content);
        elements.previewCopyBtn.classList.add('btn-copy-success');
        const originalHTML = elements.previewCopyBtn.innerHTML;
        elements.previewCopyBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          Copied!
        `;
        announceToScreenReader('Content copied to clipboard');

        setTimeout(() => {
          elements.previewCopyBtn.classList.remove('btn-copy-success');
          elements.previewCopyBtn.innerHTML = originalHTML;
        }, 2000);
      } catch (err) {
        alert('Failed to copy: ' + err.message);
      }
    });

    // Download button
    elements.previewDownloadBtn.addEventListener('click', () => {
      downloadFile(currentPreview.content, currentPreview.filename, currentPreview.mimeType);
      announceToScreenReader(`Downloaded ${currentPreview.filename}`);
    });
  }

  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ==========================================================================
  // Utility Functions
  // ==========================================================================

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ==========================================================================
  // Keyboard Navigation
  // ==========================================================================

  function initKeyboardNav() {
    document.addEventListener('keydown', (e) => {
      // Enter to start scan (only when nothing interactive is focused)
      if (e.key === 'Enter' && !elements.scanPanel.hidden) {
        const activeEl = document.activeElement;

        // Only trigger if body or scan panel is focused (no specific element selected)
        const isNeutral = activeEl === document.body ||
                         activeEl === elements.scanPanel ||
                         activeEl.classList.contains('panel');

        if (isNeutral) {
          e.preventDefault();
          elements.scanForm.requestSubmit();
        }
      }

      // Escape to go back
      if (e.key === 'Escape') {
        // Preview -> Results
        if (!elements.previewPanel.hidden) {
          showPanel('results');
          return;
        }
        // Results -> Scan
        if (!elements.resultsPanel.hidden) {
          showPanel('scan');
          elements.scanButton.focus();
        } else if (!elements.errorPanel.hidden) {
          showPanel('scan');
          elements.scanButton.focus();
        }
      }
    });
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  function init() {
    initDarkMode();
    initExpertMode();
    initScanForm();
    initExport();
    initPreview();
    initKeyboardNav();
    initCliCopy();
    initCollapsibles();
    loadTierInfo();
    loadCurrentDirectory();
    loadChecks();
    loadSettings();
    updateCliPreview();

    // Set tabindex for panels for focus management
    elements.resultsPanel.setAttribute('tabindex', '-1');
    elements.errorPanel.setAttribute('tabindex', '-1');
    elements.previewPanel.setAttribute('tabindex', '-1');
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
