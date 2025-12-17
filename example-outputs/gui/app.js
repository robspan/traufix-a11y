/**
 * mat-a11y GUI Demo
 *
 * Static demo version for GitHub Pages.
 * Shows the GUI interface with real scan results from example-outputs.
 */

(function() {
  'use strict';

  // ==========================================================================
  // DOM Elements
  // ==========================================================================

  const elements = {
    expertToggle: document.getElementById('expert-mode'),
    darkModeBtn: document.getElementById('dark-mode-btn'),
    scanForm: document.getElementById('scan-form'),
    scanButton: document.getElementById('scan-button'),
    copyCliBtn: document.getElementById('copy-cli'),
    cliPreview: document.getElementById('cli-preview'),
    // Panels
    scanPanel: document.querySelector('.scan-panel'),
    progressPanel: document.getElementById('progress-panel'),
    progressText: document.getElementById('progress-text'),
    progressStages: document.querySelectorAll('.progress-stage'),
    resultsPanel: document.getElementById('results-panel'),
    newScanBtn: document.getElementById('new-scan-btn'),
    // Results elements
    totalIssues: document.getElementById('total-issues'),
    componentsCount: document.getElementById('components-count'),
    statFiles: document.getElementById('stat-files'),
    statTime: document.getElementById('stat-time'),
    statChecks: document.getElementById('stat-checks'),
    statCritical: document.getElementById('stat-critical'),
    statHigh: document.getElementById('stat-high'),
    statMedium: document.getElementById('stat-medium'),
    successIcon: document.querySelector('.success-icon'),
    resultsTitle: document.querySelector('.results-title')
  };

  // Store loaded example data
  let exampleData = null;

  // ==========================================================================
  // Progress Animation
  // ==========================================================================

  const PROGRESS_MESSAGES = [
    { stage: 'find', text: 'Finding files in your project...' },
    { stage: 'analyze', text: 'Analyzing component structure...' },
    { stage: 'check', text: 'Running accessibility checks...' },
    { stage: 'report', text: 'Generating report...' }
  ];

  let progressInterval = null;

  function startProgressAnimation() {
    let currentStage = 0;
    updateProgressStage(currentStage);

    progressInterval = setInterval(() => {
      currentStage++;
      if (currentStage < PROGRESS_MESSAGES.length) {
        updateProgressStage(currentStage);
      }
    }, 600);
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

  function stopProgressAnimation() {
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }

    elements.progressStages.forEach(el => {
      el.classList.add('completed');
      el.removeAttribute('aria-current');
    });
  }

  // ==========================================================================
  // UI State Management
  // ==========================================================================

  function showPanel(panelName) {
    elements.scanPanel.hidden = panelName !== 'scan';
    elements.progressPanel.hidden = panelName !== 'progress';
    elements.resultsPanel.hidden = panelName !== 'results';

    if (panelName === 'results') {
      elements.resultsPanel.focus();
      announceToScreenReader('Demo scan complete. Sample results are now available.');
    } else if (panelName === 'progress') {
      announceToScreenReader('Simulating accessibility scan. Please wait.');
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

  // ==========================================================================
  // Dark Mode
  // ==========================================================================

  function initDarkMode() {
    const savedMode = localStorage.getItem('mat-a11y-dark-mode');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedMode === 'true') {
      document.body.classList.add('dark-mode');
    } else if (savedMode === 'false') {
      document.body.classList.remove('dark-mode');
    } else {
      if (systemPrefersDark) {
        document.body.classList.add('dark-mode');
      }
    }

    if (elements.darkModeBtn) {
      elements.darkModeBtn.addEventListener('click', () => {
        const isDark = document.body.classList.contains('dark-mode');

        if (isDark) {
          document.body.classList.remove('dark-mode');
          localStorage.setItem('mat-a11y-dark-mode', 'false');
          announceToScreenReader('Light mode enabled');
        } else {
          document.body.classList.add('dark-mode');
          localStorage.setItem('mat-a11y-dark-mode', 'true');
          announceToScreenReader('Dark mode enabled');
        }
      });
    }

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

      announceToScreenReader(isExpert ? 'Expert mode enabled' : 'Expert mode disabled');
    });
  }

  // ==========================================================================
  // CLI Preview
  // ==========================================================================

  function updateCliPreview() {
    if (!elements.cliPreview) return;

    const tier = document.querySelector('input[name="tier"]:checked')?.value || 'full';
    let command = 'npx mat-a11y';

    if (tier !== 'full') {
      command += ` --tier ${tier}`;
    }

    elements.cliPreview.textContent = command;
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

        header.setAttribute('aria-expanded', !isExpanded);

        if (content) {
          content.hidden = isExpanded;
        }

        announceToScreenReader(isExpanded ? 'Section collapsed' : 'Section expanded');
      });
    });
  }

  // ==========================================================================
  // Demo Scan Form
  // ==========================================================================

  function initScanForm() {
    elements.scanForm.addEventListener('submit', handleDemoScan);
    elements.newScanBtn.addEventListener('click', () => showPanel('scan'));

    // Update CLI preview when tier changes
    document.querySelectorAll('input[name="tier"]').forEach(radio => {
      radio.addEventListener('change', updateCliPreview);
    });
  }

  async function handleDemoScan(e) {
    e.preventDefault();

    showPanel('progress');
    startProgressAnimation();
    elements.scanButton.disabled = true;

    // Load example data if not already loaded
    if (!exampleData) {
      try {
        const response = await fetch('../_report-json.json');
        exampleData = await response.json();
      } catch (err) {
        console.warn('Could not load example data:', err);
      }
    }

    // Simulate scan time (shorter since we're loading real data)
    await new Promise(resolve => setTimeout(resolve, 2000));

    stopProgressAnimation();
    displayResults();
    showPanel('results');
    elements.scanButton.disabled = false;
  }

  function displayResults() {
    if (!exampleData) {
      // Fallback to hardcoded values if fetch failed
      return;
    }

    // Update summary
    if (elements.totalIssues) {
      elements.totalIssues.textContent = exampleData.totalIssues || 0;
    }
    if (elements.componentsCount) {
      elements.componentsCount.textContent = exampleData.componentCount || 0;
    }

    // Update success icon based on issue count
    if (elements.successIcon) {
      const issues = exampleData.totalIssues || 0;
      if (issues === 0) {
        elements.successIcon.style.background = 'var(--color-success-bg)';
        elements.successIcon.style.color = 'var(--color-success)';
        elements.successIcon.innerHTML = '&#10003;';
      } else if (issues <= 50) {
        elements.successIcon.style.background = 'var(--color-warning-bg)';
        elements.successIcon.style.color = 'var(--color-warning)';
        elements.successIcon.innerHTML = '!';
      } else {
        elements.successIcon.style.background = 'var(--color-error-bg)';
        elements.successIcon.style.color = 'var(--color-error)';
        elements.successIcon.innerHTML = '!!';
      }
    }

    // Update title to show it's real data
    if (elements.resultsTitle) {
      elements.resultsTitle.textContent = 'Scan Complete (traufix.de)';
    }

    // Update scan statistics
    if (elements.statFiles) {
      elements.statFiles.textContent = exampleData.totalComponentsScanned || 307;
    }
    if (elements.statTime) {
      elements.statTime.textContent = '2.1s';
    }
    if (elements.statChecks) {
      elements.statChecks.textContent = exampleData.audits?.length || 82;
    }

    // Count issues by severity from audits
    let critical = 0, high = 0, medium = 0;
    if (exampleData.audits) {
      for (const audit of exampleData.audits) {
        const weight = audit.weight || 5;
        const issues = audit.issues || 0;
        if (weight >= 10) {
          critical += issues;
        } else if (weight >= 7) {
          high += issues;
        } else {
          medium += issues;
        }
      }
    }

    if (elements.statCritical) elements.statCritical.textContent = critical;
    if (elements.statHigh) elements.statHigh.textContent = high;
    if (elements.statMedium) elements.statMedium.textContent = medium;
  }

  // ==========================================================================
  // Keyboard Navigation
  // ==========================================================================

  function initKeyboardNav() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!elements.resultsPanel.hidden) {
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
    initKeyboardNav();
    initCliCopy();
    initCollapsibles();
    updateCliPreview();

    elements.resultsPanel.setAttribute('tabindex', '-1');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
