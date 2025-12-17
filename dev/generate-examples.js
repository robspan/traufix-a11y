#!/usr/bin/env node
/**
 * Generate all formatter outputs for example-outputs folder
 * Uses component-based analysis (same as CLI default)
 *
 * Also generates the GUI demo from the real GUI files (single source of truth).
 *
 * Usage: node dev/generate-examples.js <path-to-angular-project>
 */
const fs = require('fs');
const path = require('path');
const { analyzeByComponent } = require('../src/core/componentAnalyzer.js');
const { loadAllFormatters } = require('../src/formatters/index.js');
const { optimizeIssues, getOptimizationSummary } = require('../src/core/issueOptimizer.js');

const targetPath = process.argv[2] || '.';
const outputDir = path.join(__dirname, '..', 'example-outputs');
const guiSrcDir = path.join(__dirname, '..', 'gui', 'public');
const guiDemoDir = path.join(outputDir, 'gui');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('Component-based analysis of:', targetPath);
console.log('Output to:', outputDir);
console.log('');

// Remove old _report-* files to avoid stale duplicates
const existing = fs.readdirSync(outputDir).filter(n => n.startsWith('_report-'));
for (const f of existing) {
  try { fs.unlinkSync(path.join(outputDir, f)); } catch (e) { /* ignore */ }
}

// Run component analysis (same as CLI default)
let results;
try {
  results = analyzeByComponent(targetPath, { tier: 'full' });
} catch (e) {
  console.error('Analysis failed:', e && e.message ? e.message : e);
  process.exit(1);
}

if (results.error) {
  console.error(results.error);
  process.exit(2);
}

console.log(`Analyzed ${results.totalComponentsScanned} components (${results.componentCount} with issues)\n`);

// Optimize issues by collapsing to root cause
const optimizedResults = optimizeIssues(results, targetPath, { enabled: true });
const summary = getOptimizationSummary(optimizedResults);
if (summary) console.log(summary + '\n');

// Load all formatters
const formatters = loadAllFormatters();

// Generate each format
for (const [name, formatter] of formatters) {
  try {
    const output = formatter.format(optimizedResults);
    const ext = formatter.fileExtension || '.txt';
    const filename = `_report-${name}${ext}`;
    const filepath = path.join(outputDir, filename);

    fs.writeFileSync(filepath, output);
    console.log(`✓ ${name} → ${filename}`);
  } catch (e) {
    console.error(`✗ ${name}: ${e.message}`);
  }
}

// =============================================================================
// Generate GUI Demo (from real GUI files - single source of truth)
// =============================================================================

console.log('\n--- Generating GUI Demo ---');

if (!fs.existsSync(guiDemoDir)) {
  fs.mkdirSync(guiDemoDir, { recursive: true });
}

// 1. Copy styles.css directly (identical)
const stylesSrc = path.join(guiSrcDir, 'styles.css');
const stylesDest = path.join(guiDemoDir, 'styles.css');
fs.copyFileSync(stylesSrc, stylesDest);
console.log('✓ styles.css (copied)');

// 2. Transform index.html for demo mode
const htmlSrc = fs.readFileSync(path.join(guiSrcDir, 'index.html'), 'utf8');
const demoHtml = transformHtmlForDemo(htmlSrc, optimizedResults);
fs.writeFileSync(path.join(guiDemoDir, 'index.html'), demoHtml);
console.log('✓ index.html (transformed for demo)');

// 3. Generate demo app.js
const demoAppJs = generateDemoAppJs(optimizedResults);
fs.writeFileSync(path.join(guiDemoDir, 'app.js'), demoAppJs);
console.log('✓ app.js (generated for demo)');

console.log('\nDone!');

// =============================================================================
// Demo Generation Helpers
// =============================================================================

function transformHtmlForDemo(html, results) {
  // Add demo banner after <body>
  const demoBanner = `
  <div class="demo-banner" role="alert">
    <p>
      <span class="demo-badge">DEMO</span>
      This is a static preview. To scan your own project: <a href="https://www.npmjs.com/package/mat-a11y">npx mat-a11y</a>
    </p>
  </div>
  <style>
    .demo-banner { background: linear-gradient(135deg, #1a56db 0%, #7c3aed 100%); color: white; padding: 0.75rem 1.5rem; text-align: center; }
    .demo-banner p { margin: 0; font-size: 0.9rem; }
    .demo-banner a { color: white; font-weight: 600; text-decoration: underline; }
    .demo-banner a:hover { text-decoration: none; }
    .demo-badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 600; margin-right: 0.5rem; }
  </style>`;

  let result = html;

  // Insert demo banner after <body>
  result = result.replace('<body>', '<body>' + demoBanner);

  // Update title
  result = result.replace(
    '<title>mat-a11y - Accessibility Dashboard</title>',
    '<title>mat-a11y - Accessibility Dashboard (Demo)</title>'
  );

  // Update meta description
  result = result.replace(
    'content="mat-a11y Accessibility Dashboard - Check your Angular application for accessibility issues"',
    'content="mat-a11y Accessibility Dashboard Demo - Preview the GUI interface"'
  );

  // Change button text
  result = result.replace('Start Accessibility Check', 'Run Demo Scan');
  result = result.replace('New Scan', 'Run Again');

  // Make path input show demo info
  result = result.replace(
    'placeholder="Current directory"',
    'value="demo-project" readonly'
  );
  result = result.replace(
    '<span class="path-current" id="current-path-display"></span>',
    '<span class="path-current" id="current-path-display">Demo: Real results from a production Angular app</span>'
  );

  // Update path hint
  result = result.replace(
    'Enter the path to your Angular project, or leave empty to scan the current directory',
    'This demo shows real scan results from a production Angular application'
  );

  // Hide export search in demo (not implemented)
  result = result.replace(
    '<div class="export-search expert-only">',
    '<div class="export-search expert-only" hidden>'
  );

  return result;
}

function generateDemoAppJs(results) {
  // Calculate actual issue count from components (after optimization)
  // This matches what the HTML formatter displays
  let actualIssueCount = 0;
  if (Array.isArray(results.components)) {
    for (const comp of results.components) {
      actualIssueCount += (comp.issues?.length || 0);
    }
  }

  // Embed the results directly in the demo JS
  const embeddedResults = JSON.stringify({
    totalIssues: actualIssueCount,  // Use actual count from components
    componentCount: results.componentCount || 0,
    totalComponentsScanned: results.totalComponentsScanned || 0,
    audits: results.audits || [],
    auditScore: results.auditScore || null
  });

  return `/**
 * mat-a11y GUI Demo - Auto-generated from real GUI
 * This file is generated by: node dev/generate-examples.js
 *
 * Static demo version that works without a server.
 * Uses embedded results from a real scan.
 */

(function() {
  'use strict';

  // Embedded scan results (from real analysis)
  const DEMO_RESULTS = ${embeddedResults};

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
    scanPanel: document.querySelector('.scan-panel'),
    progressPanel: document.getElementById('progress-panel'),
    progressText: document.getElementById('progress-text'),
    progressStages: document.querySelectorAll('.progress-stage'),
    resultsPanel: document.getElementById('results-panel'),
    errorPanel: document.getElementById('error-panel'),
    previewPanel: document.getElementById('preview-panel'),
    previewFormatName: document.getElementById('preview-format-name'),
    previewContent: document.getElementById('preview-content'),
    previewCode: document.getElementById('preview-code'),
    previewInfo: document.getElementById('preview-info'),
    previewBackBtn: document.getElementById('preview-back-btn'),
    previewCopyBtn: document.getElementById('preview-copy-btn'),
    previewDownloadBtn: document.getElementById('preview-download-btn'),
    newScanBtn: document.getElementById('new-scan-btn'),
    totalIssues: document.getElementById('total-issues'),
    componentsCount: document.getElementById('components-count'),
    statIssuesSimple: document.getElementById('stat-issues-simple'),
    statComponentsSimple: document.getElementById('stat-components-simple'),
    statScoreSimple: document.getElementById('stat-score-simple'),
    statFiles: document.getElementById('stat-files'),
    statTime: document.getElementById('stat-time'),
    statChecks: document.getElementById('stat-checks'),
    statCritical: document.getElementById('stat-critical'),
    statHigh: document.getElementById('stat-high'),
    statMedium: document.getElementById('stat-medium')
  };

  // Current preview state
  let currentPreview = { content: '', filename: '', mimeType: '', format: '' };

  // ==========================================================================
  // Progress Animation
  // ==========================================================================

  const PROGRESS_MESSAGES = [
    { stage: 'find', text: 'Finding component files...' },
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
    }, 400); // Fast for demo
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
    if (elements.errorPanel) elements.errorPanel.hidden = panelName !== 'error';
    if (elements.previewPanel) elements.previewPanel.hidden = panelName !== 'preview';

    window.scrollTo(0, 0);

    if (panelName === 'results') {
      elements.resultsPanel.focus();
      announceToScreenReader('Demo scan complete. Results are now available.');
    } else if (panelName === 'progress') {
      announceToScreenReader('Simulating accessibility scan...');
    }
  }

  function announceToScreenReader(message) {
    const el = document.createElement('div');
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-atomic', 'true');
    el.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }

  // ==========================================================================
  // Dark Mode
  // ==========================================================================

  function initDarkMode() {
    const saved = localStorage.getItem('mat-a11y-dark-mode');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (saved === 'true' || (saved === null && systemDark)) {
      document.body.classList.add('dark-mode');
    }

    if (elements.darkModeBtn) {
      elements.darkModeBtn.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('dark-mode');
        localStorage.setItem('mat-a11y-dark-mode', isDark);
        announceToScreenReader(isDark ? 'Dark mode enabled' : 'Light mode enabled');
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
    const saved = localStorage.getItem('mat-a11y-expert-mode');
    if (saved === 'true') {
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
    let cmd = 'npx mat-a11y';
    if (tier !== 'full') cmd += ' --tier ' + tier;
    elements.cliPreview.textContent = cmd;
  }

  function initCliCopy() {
    if (!elements.copyCliBtn) return;

    elements.copyCliBtn.addEventListener('click', async () => {
      const cmd = elements.cliPreview?.textContent || '';
      try {
        await navigator.clipboard.writeText(cmd);
        elements.copyCliBtn.classList.add('copied');
        const original = elements.copyCliBtn.innerHTML;
        elements.copyCliBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied!';
        announceToScreenReader('Command copied');
        setTimeout(() => {
          elements.copyCliBtn.classList.remove('copied');
          elements.copyCliBtn.innerHTML = original;
        }, 2000);
      } catch (e) {
        console.warn('Copy failed:', e);
      }
    });
  }

  // ==========================================================================
  // Collapsible Sections
  // ==========================================================================

  function initCollapsibles() {
    document.querySelectorAll('.collapsible-header').forEach(header => {
      header.addEventListener('click', () => {
        const expanded = header.getAttribute('aria-expanded') === 'true';
        const contentId = header.getAttribute('aria-controls');
        const content = document.getElementById(contentId);
        header.setAttribute('aria-expanded', !expanded);
        if (content) content.hidden = expanded;
      });
    });
  }

  // ==========================================================================
  // Demo Scan
  // ==========================================================================

  function initScanForm() {
    elements.scanForm.addEventListener('submit', handleDemoScan);
    elements.newScanBtn.addEventListener('click', () => showPanel('scan'));

    document.querySelectorAll('input[name="tier"]').forEach(radio => {
      radio.addEventListener('change', updateCliPreview);
    });
  }

  async function handleDemoScan(e) {
    e.preventDefault();

    showPanel('progress');
    startProgressAnimation();
    elements.scanButton.disabled = true;

    // Simulate scan time
    await new Promise(r => setTimeout(r, 1800));

    stopProgressAnimation();
    displayResults(DEMO_RESULTS);
    showPanel('results');
    elements.scanButton.disabled = false;
  }

  function displayResults(results) {
    const total = results.totalIssues || 0;
    const comps = results.componentCount || 0;
    const files = results.totalComponentsScanned || 0;
    const score = results.auditScore;

    // Summary
    if (elements.totalIssues) elements.totalIssues.textContent = total;
    if (elements.componentsCount) elements.componentsCount.textContent = comps;

    // Simple mode stats
    if (elements.statIssuesSimple) elements.statIssuesSimple.textContent = total;
    if (elements.statComponentsSimple) elements.statComponentsSimple.textContent = comps;
    if (elements.statScoreSimple) {
      elements.statScoreSimple.textContent = score !== null && score !== undefined ? score : '--';
      if (score !== null && score !== undefined) {
        const color = score >= 80 ? 'var(--color-success)' : score >= 50 ? 'var(--color-warning)' : 'var(--color-error)';
        elements.statScoreSimple.style.color = color;
      }
    }

    // Expert stats
    if (elements.statFiles) elements.statFiles.textContent = files;
    if (elements.statTime) elements.statTime.textContent = '1.8s';
    if (elements.statChecks) elements.statChecks.textContent = results.audits?.length || 82;

    // Count by severity
    let critical = 0, high = 0, medium = 0;
    if (results.audits) {
      for (const audit of results.audits) {
        const w = audit.weight || 5;
        const issues = audit.issues || 0;
        if (w >= 10) critical += issues;
        else if (w >= 7) high += issues;
        else medium += issues;
      }
    }

    if (elements.statCritical) elements.statCritical.textContent = critical;
    if (elements.statHigh) elements.statHigh.textContent = high;
    if (elements.statMedium) elements.statMedium.textContent = medium;

    // Update success icon
    const icon = document.querySelector('.success-icon');
    if (icon) {
      if (total === 0) {
        icon.style.background = 'var(--color-success-bg)';
        icon.style.color = 'var(--color-success)';
        icon.innerHTML = '&#10003;';
      } else if (total <= 10) {
        icon.style.background = 'var(--color-warning-bg)';
        icon.style.color = 'var(--color-warning)';
        icon.innerHTML = '!';
      } else {
        icon.style.background = 'var(--color-error-bg)';
        icon.style.color = 'var(--color-error)';
        icon.innerHTML = '!!';
      }
    }
  }

  // ==========================================================================
  // Export & Preview (Demo Mode - fetch sample files)
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

  const FORMAT_FILES = {
    'html': { file: '../_report-html.html', mime: 'text/html' },
    'pdf': { file: '../_report-pdf.html', mime: 'text/html' },
    'ai': { file: '../_report-ai.backlog.txt', mime: 'text/plain' },
    'json': { file: '../_report-json.json', mime: 'application/json' },
    'csv': { file: '../_report-csv.csv', mime: 'text/csv' },
    'markdown': { file: '../_report-markdown.md', mime: 'text/markdown' },
    'sarif': { file: '../_report-sarif.sarif.json', mime: 'application/json' },
    'junit': { file: '../_report-junit.xml', mime: 'application/xml' },
    'github-annotations': { file: '../_report-github-annotations.txt', mime: 'text/plain' },
    'gitlab-codequality': { file: '../_report-gitlab-codequality.json', mime: 'application/json' },
    'checkstyle': { file: '../_report-checkstyle.xml', mime: 'application/xml' },
    'sonarqube': { file: '../_report-sonarqube.json', mime: 'application/json' },
    'prometheus': { file: '../_report-prometheus.prom', mime: 'text/plain' },
    'grafana-json': { file: '../_report-grafana-json.json', mime: 'application/json' },
    'datadog': { file: '../_report-datadog.json', mime: 'application/json' },
    'slack': { file: '../_report-slack.json', mime: 'application/json' },
    'discord': { file: '../_report-discord.json', mime: 'application/json' },
    'teams': { file: '../_report-teams.json', mime: 'application/json' }
  };

  function getFormatType(format) {
    if (['json', 'sarif', 'gitlab-codequality', 'grafana-json', 'datadog', 'slack', 'discord', 'teams', 'sonarqube'].includes(format)) {
      return 'json';
    }
    if (['junit', 'checkstyle'].includes(format)) {
      return 'xml';
    }
    if (format === 'prometheus') {
      return 'prometheus';
    }
    if (format === 'ai' || format === 'github-annotations') {
      return 'ai';
    }
    if (format === 'csv') {
      return 'csv';
    }
    if (format === 'markdown') {
      return 'markdown';
    }
    return 'text';
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function highlightJSON(json) {
    return json.replace(
      /("(\\\\u[a-zA-Z0-9]{4}|\\\\[^u]|[^\\\\"])*"(\\s*:)?|\\b(true|false|null)\\b|-?\\d+(?:\\.\\d*)?(?:[eE][+\\-]?\\d+)?)/g,
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
        return '<span class="' + cls + '">' + escapeHtml(match) + '</span>';
      }
    );
  }

  function highlightXML(xml) {
    return escapeHtml(xml)
      .replace(/(&lt;\\/?)(\\w+)/g, '$1<span class="tag">$2</span>')
      .replace(/(\\w+)(=)(&quot;[^&]*&quot;)/g, '<span class="attr">$1</span>$2<span class="string">$3</span>')
      .replace(/(&lt;!--[\\s\\S]*?--&gt;)/g, '<span class="comment">$1</span>');
  }

  function highlightAI(text) {
    return escapeHtml(text)
      .replace(/^(#.*)$/gm, '<span class="comment">$1</span>')
      .replace(/^(════+)$/gm, '<span class="separator">$1</span>')
      .replace(/^(COMPONENT:)(.+)(\\[\\d+pts\\])$/gm, '<span class="keyword">$1</span><span class="component">$2</span><span class="number">$3</span>')
      .replace(/^(FILES?:)(.*)$/gm, '<span class="keyword">$1</span><span class="path">$2</span>')
      .replace(/^(\\[w\\d+\\])\\s*(\\w+):/gm, '<span class="weight">$1</span> <span class="check">$2</span>:')
      .replace(/^(→.*)$/gm, '<span class="fix">$1</span>');
  }

  function highlightPrometheus(text) {
    return escapeHtml(text)
      .replace(/^(#.*)$/gm, '<span class="comment">$1</span>')
      .replace(/^(\\w+)(\\{[^}]*\\})?\\s+(\\d+\\.?\\d*)$/gm, '<span class="metric">$1</span>$2 <span class="number">$3</span>')
      .replace(/(\\w+)=("[^"]*")/g, '<span class="label">$1</span>=<span class="string">$2</span>');
  }

  function highlightCSV(text) {
    const lines = escapeHtml(text).split('\\n');
    if (lines.length === 0) return text;
    const header = '<span class="header">' + lines[0] + '</span>';
    const body = lines.slice(1).map(line => {
      return line.split(',').map((cell, i) => {
        if (/^\\d+$/.test(cell.trim())) return '<span class="number">' + cell + '</span>';
        return cell;
      }).join(',');
    }).join('\\n');
    return header + '\\n' + body;
  }

  function highlightMarkdown(text) {
    return escapeHtml(text)
      .replace(/^(#{1,6}\\s.*)$/gm, '<span class="heading">$1</span>')
      .replace(/^(\\|.*)$/gm, '<span class="table">$1</span>')
      .replace(/(\\*\\*[^*]+\\*\\*)/g, '<span class="bold">$1</span>')
      .replace(/(\\\`[^\\\`]+\\\`)/g, '<span class="code">$1</span>')
      .replace(/^([-*]\\s.*)$/gm, '<span class="list">$1</span>');
  }

  function highlightContent(content, formatType) {
    switch (formatType) {
      case 'json': return highlightJSON(content);
      case 'xml': return highlightXML(content);
      case 'ai': return highlightAI(content);
      case 'prometheus': return highlightPrometheus(content);
      case 'csv': return highlightCSV(content);
      case 'markdown': return highlightMarkdown(content);
      default: return escapeHtml(content);
    }
  }

  function initExport() {
    document.querySelectorAll('.export-btn').forEach(btn => {
      btn.addEventListener('click', () => handleExport(btn));
    });
  }

  async function handleExport(btn) {
    const format = btn.dataset.format;
    if (!format) return;

    const formatInfo = FORMAT_FILES[format];
    if (!formatInfo) return;

    // For HTML/PDF, open directly in new tab
    if (format === 'html' || format === 'pdf') {
      window.open(formatInfo.file, '_blank');
      return;
    }

    // Show loading state
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'Loading...';

    try {
      // Fetch the sample file
      const response = await fetch(formatInfo.file);
      if (!response.ok) throw new Error('Failed to load');
      const content = await response.text();

      // Get filename from path
      const filename = formatInfo.file.split('/').pop();

      // Show preview
      showExportPreview(format, content, filename, formatInfo.mime);
    } catch (err) {
      console.warn('Failed to load preview:', err);
      // Fallback: open in new tab
      window.open(formatInfo.file, '_blank');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalHTML;
    }
  }

  function showExportPreview(format, content, filename, mimeType) {
    currentPreview = { content, filename, mimeType, format };

    // Update title
    const formatName = FORMAT_NAMES[format] || format.toUpperCase();
    if (elements.previewFormatName) {
      elements.previewFormatName.textContent = formatName + ' Preview';
    }

    // Set format type for styling
    const formatType = getFormatType(format);
    if (elements.previewPanel) {
      elements.previewPanel.setAttribute('data-format-type', formatType);
    }

    // Calculate stats
    const lines = content.split('\\n').length;
    const size = new Blob([content]).size;
    const sizeStr = size > 1024 * 1024
      ? (size / 1024 / 1024).toFixed(1) + ' MB'
      : size > 1024
        ? (size / 1024).toFixed(1) + ' KB'
        : size + ' bytes';

    // Truncate large content
    const PREVIEW_LINE_LIMIT = 500;
    const PREVIEW_CHAR_LIMIT = 50000;
    let displayContent = content;
    let isTruncated = false;

    if (lines > PREVIEW_LINE_LIMIT || content.length > PREVIEW_CHAR_LIMIT) {
      isTruncated = true;
      const contentLines = content.split('\\n');
      displayContent = contentLines.slice(0, PREVIEW_LINE_LIMIT).join('\\n');
      if (displayContent.length > PREVIEW_CHAR_LIMIT) {
        displayContent = displayContent.substring(0, PREVIEW_CHAR_LIMIT);
      }
    }

    // Format and display with syntax highlighting
    if (elements.previewCode) {
      // Pretty-print JSON if not truncated
      if (formatType === 'json' && !isTruncated) {
        try {
          const parsed = JSON.parse(content);
          displayContent = JSON.stringify(parsed, null, 2);
        } catch { /* keep as-is */ }
      }

      const truncateNotice = isTruncated ? '<span class="truncate-notice">\\n\\n... (truncated)</span>' : '';
      elements.previewCode.innerHTML = highlightContent(displayContent, formatType) + truncateNotice;
    }

    // Update info
    if (elements.previewInfo) {
      let infoText = lines.toLocaleString() + ' lines | ' + sizeStr + ' | ' + filename;
      if (isTruncated) {
        infoText += ' | Showing first ' + PREVIEW_LINE_LIMIT + ' lines';
      }
      elements.previewInfo.textContent = infoText;
    }

    showPanel('preview');
  }

  function initPreview() {
    if (elements.previewBackBtn) {
      elements.previewBackBtn.addEventListener('click', () => showPanel('results'));
    }

    if (elements.previewCopyBtn) {
      elements.previewCopyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(currentPreview.content);
          elements.previewCopyBtn.classList.add('btn-copy-success');
          const original = elements.previewCopyBtn.innerHTML;
          elements.previewCopyBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied!';
          announceToScreenReader('Content copied to clipboard');
          setTimeout(() => {
            elements.previewCopyBtn.classList.remove('btn-copy-success');
            elements.previewCopyBtn.innerHTML = original;
          }, 2000);
        } catch (err) {
          alert('Failed to copy: ' + err.message);
        }
      });
    }

    if (elements.previewDownloadBtn) {
      elements.previewDownloadBtn.addEventListener('click', () => {
        const blob = new Blob([currentPreview.content], { type: currentPreview.mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = currentPreview.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        announceToScreenReader('Downloaded ' + currentPreview.filename);
      });
    }
  }

  // ==========================================================================
  // Keyboard Navigation
  // ==========================================================================

  function initKeyboardNav() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        // Preview -> Results
        if (elements.previewPanel && !elements.previewPanel.hidden) {
          showPanel('results');
          return;
        }
        // Results -> Scan
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
    initExport();
    initPreview();
    initKeyboardNav();
    initCliCopy();
    initCollapsibles();
    updateCliPreview();

    elements.resultsPanel.setAttribute('tabindex', '-1');
    if (elements.previewPanel) {
      elements.previewPanel.setAttribute('tabindex', '-1');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
`;
}
