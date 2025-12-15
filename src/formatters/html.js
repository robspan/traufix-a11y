'use strict';

/**
 * HTML Formatter for mat-a11y
 * 
 * Interactive HTML report with:
 * - Expandable component sections
 * - Clickable file links (VS Code protocol)
 * - Search/filter functionality
 * - Full issue details
 */

const path = require('path');
const { normalizeResults, getPriorityEntities, getCheckWeight } = require('./result-utils');

/**
 * Format results as HTML report
 * 
 * @param {object} results - Analysis results from mat-a11y
 * @param {object} options - Formatter options
 * @returns {string} HTML document
 */
function format(results, options = {}) {
  const normalized = normalizeResults(results);

  const isFile = normalized.entities.length === 1 && normalized.entities[0]?.kind === 'file';
  if (isFile) {
    return formatNormalizedFileHTML(results, normalized);
  }

  return formatNormalizedEntityHTML(results, normalized);
}

function getModeLabel(results) {
  const isDeep = results?.deepResolve && results.deepResolve.enabled;
  return isDeep ? 'Page-level' : 'Component-level';
}

function getTitle(results, normalized) {
  const isDeep = results?.deepResolve && results.deepResolve.enabled;
  if (normalized.entities[0]?.kind === 'file') return 'mat-a11y Analysis Report';
  return isDeep ? 'mat-a11y Page Analysis' : 'mat-a11y Component Analysis';
}

function getItemLabel(normalized) {
  const kind = normalized.entities[0]?.kind;
  if (kind === 'component') return { singular: 'Component', plural: 'components' };
  return { singular: 'Route', plural: 'routes' };
}

function groupIssuesByCheck(issues) {
  const groups = new Map();
  for (const issue of issues || []) {
    const key = issue?.check || 'unknown';
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(issue);
  }
  return groups;
}

/**
 * Sort issue groups by check weight (highest weight first)
 * @param {Map} groups - Map of check name to issues
 * @returns {Array} Sorted array of [check, issues] tuples
 */
function sortIssueGroupsByWeight(groups) {
  return Array.from(groups.entries()).sort((a, b) => {
    const weightA = getCheckWeight(a[0]);
    const weightB = getCheckWeight(b[0]);
    return weightB - weightA;  // Highest weight first
  });
}

function getSeverityClass(check) {
  const weight = getCheckWeight(check);
  if (weight >= 10) return 'severity-critical';
  if (weight >= 7) return 'severity-high';
  if (weight >= 5) return 'severity-medium';
  return 'severity-low';
}

function getSeverityLabel(check) {
  const weight = getCheckWeight(check);
  if (weight >= 10) return 'Critical';
  if (weight >= 7) return 'High';
  if (weight >= 5) return 'Medium';
  return 'Low';
}

function formatFilePath(filePath) {
  if (!filePath) return '';
  return filePath.replace(/\\/g, '/');
}

function makeVSCodeLink(filePath) {
  if (!filePath) return '#';
  const normalized = filePath.replace(/\\/g, '/');
  return `vscode://file/${encodeURIComponent(normalized)}`;
}

function getFileName(filePath) {
  if (!filePath) return '';
  return path.basename(filePath);
}

function formatNormalizedEntityHTML(results, normalized) {
  const d = normalized.distribution;
  const modeLabel = getModeLabel(results);
  const title = getTitle(results, normalized);
  const itemLabel = getItemLabel(normalized);

  // Optimization info
  const optimization = results.optimization || {};
  const hasOptimization = optimization.enabled && optimization.originalCount !== optimization.optimizedCount;

  // Build component cards HTML (sorted by priority: weight + usage)
  let componentsHtml = '';
  const entities = normalized.entities || [];
  const prioritizedEntities = getPriorityEntities(entities, entities.length);
  
  for (let i = 0; i < prioritizedEntities.length; i++) {
    const entity = prioritizedEntities[i];
    const scoreClass = entity.auditScore >= 90 ? 'pass' : entity.auditScore >= 50 ? 'warn' : 'fail';
    const issueCount = entity.issues?.length || 0;
    const issueGroups = groupIssuesByCheck(entity.issues);
    
    // Get file paths for the component
    const files = entity.files || [];
    const tsFile = entity.tsFile || '';
    
    componentsHtml += `
    <div class="component-card" data-component="${escapeHtml(entity.label)}" data-score="${entity.auditScore}" data-issues="${issueCount}">
      <div class="component-header" onclick="toggleComponent(this)">
        <div class="component-info">
          <span class="component-name">${escapeHtml(entity.label)}</span>
          <span class="component-meta">${issueCount} issue${issueCount !== 1 ? 's' : ''}</span>
        </div>
        <div class="component-score ${scoreClass}">${entity.auditScore}%</div>
        <span class="toggle-icon">▶</span>
      </div>
      <div class="component-body" style="display: none;">
        ${(tsFile || files.length) ? `<div class="component-files">
          <strong>Component Files:</strong>
          ${tsFile ? `<a href="${makeVSCodeLink(tsFile)}" class="file-link" title="${escapeHtml(formatFilePath(tsFile))}">${escapeHtml(getFileName(tsFile))}</a>` : ''}
          ${files.map(f => `<a href="${makeVSCodeLink(f)}" class="file-link" title="${escapeHtml(formatFilePath(f))}">${escapeHtml(getFileName(f))}</a>`).join('')}
        </div>` : ''}
        <div class="issue-groups">
          ${sortIssueGroupsByWeight(issueGroups).map(([check, issues]) => `
            <div class="issue-group ${getSeverityClass(check)}">
              <div class="issue-group-header" onclick="toggleIssueGroup(this)">
                <span class="issue-check">${escapeHtml(check)}</span>
                <span class="issue-count">${issues.length}</span>
                <span class="toggle-icon">▶</span>
              </div>
              <div class="issue-list" style="display: none;">
                ${issues.map(issue => `
                  <div class="issue-item">
                    <a href="${makeVSCodeLink(issue.file)}" class="issue-file" title="${escapeHtml(formatFilePath(issue.file || ''))}">${escapeHtml(getFileName(issue.file))}</a>
                    <div class="issue-message">${escapeHtml(issue.message?.split('\n')[0] || '')}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>`;
  }

  // Fix priorities section (bang for buck: weight + usage) - reuse already sorted list
  let prioritiesHtml = '';
  const top10 = prioritizedEntities.slice(0, 10);
  if (top10.length > 0) {
    prioritiesHtml = '<div class="priorities-section"><h3>🎯 Fix Priorities</h3><div class="priority-list">';
    for (let i = 0; i < top10.length; i++) {
      const entity = top10[i];
      const issueGroups = groupIssuesByCheck(entity.issues);
      const topIssues = sortIssueGroupsByWeight(issueGroups).slice(0, 3);
      const affectedCount = Array.isArray(entity.affected) ? entity.affected.length : 0;

      prioritiesHtml += `
        <div class="priority-item">
          <div class="priority-header">
            <span class="priority-rank">${i + 1}.</span>
            <span class="priority-name">${escapeHtml(entity.label)}</span>
            <span class="priority-score">${entity.auditScore}%</span>
          </div>
          <div class="priority-meta">${entity.issues.length} issues${affectedCount ? ` · affects ${affectedCount} route${affectedCount !== 1 ? 's' : ''}` : ''}</div>
          <div class="priority-issues">
            ${topIssues.map(([check, issues]) => `<span class="priority-issue">${escapeHtml(check)} (${issues.length})</span>`).join('')}
          </div>
        </div>`;
    }
    prioritiesHtml += '</div></div>';
  }

  // Optimization summary
  let optimizationHtml = '';
  if (hasOptimization) {
    const reduction = Math.round((1 - optimization.optimizedCount / optimization.originalCount) * 100);
    optimizationHtml = `
      <div class="optimization-banner">
        <strong>🔧 Root Cause Analysis:</strong> ${optimization.originalCount} issues → ${optimization.optimizedCount} unique fixes (${reduction}% reduction)
      </div>`;
  }

  return generateHTML({
    title,
    subtitle: `${normalized.total || 0} ${itemLabel.plural} | ${modeLabel} | Tier: ${(normalized.tier || 'material').toUpperCase()}`,
    distribution: d,
    totalIssues: normalized.issues?.length || entities.reduce((sum, e) => sum + (e.issues?.length || 0), 0),
    componentCount: entities.length,
    content: optimizationHtml + prioritiesHtml + `
      <div class="components-section">
        <div class="section-header">
          <h3>📦 ${escapeHtml(itemLabel.plural[0].toUpperCase() + itemLabel.plural.slice(1))} (${entities.length})</h3>
          <div class="controls">
            <input type="text" id="search" placeholder="Search components..." oninput="filterComponents(this.value)">
            <select id="filter" onchange="filterByScore(this.value)">
              <option value="all">All</option>
              <option value="fail">Failing (&lt;50%)</option>
              <option value="warn">Needs Work (50-89%)</option>
              <option value="pass">Passing (90-100%)</option>
            </select>
            <button onclick="expandAll()">Expand All</button>
            <button onclick="collapseAll()">Collapse All</button>
          </div>
        </div>
        <div id="components-container">
          ${componentsHtml}
        </div>
      </div>`
  });
}

function formatNormalizedFileHTML(results, normalized) {
  const s = results.summary || {};
  const auditScore = typeof s.auditScore === 'number' ? s.auditScore : (normalized.entities[0]?.auditScore || 0);

  let issuesHtml = '';
  if (normalized.issues && normalized.issues.length > 0) {
    const issueGroups = groupIssuesByCheck(normalized.issues);
    
    issuesHtml = '<div class="issues-section"><h3>Issues Found</h3>';
    for (const [check, issues] of issueGroups) {
      issuesHtml += `
        <div class="issue-group ${getSeverityClass(check)}">
          <div class="issue-group-header" onclick="toggleIssueGroup(this)">
            <span class="issue-check">${escapeHtml(check)}</span>
            <span class="issue-count">${issues.length}</span>
            <span class="toggle-icon">▶</span>
          </div>
          <div class="issue-list" style="display: none;">
            ${issues.map(issue => `
              <div class="issue-item">
                <a href="${makeVSCodeLink(issue.file)}" class="issue-file">${escapeHtml(getFileName(issue.file))}</a>
                <div class="issue-message">${escapeHtml(issue.message?.split('\n')[0] || '')}</div>
              </div>
            `).join('')}
          </div>
        </div>`;
    }
    issuesHtml += '</div>';
  }

  return generateHTML({
    title: getTitle(results, normalized),
    subtitle: `${s.filesChecked || 0} files | Tier: ${(normalized.tier || 'basic').toUpperCase()}`,
    distribution: normalized.distribution,
    totalIssues: normalized.issues?.length || 0,
    componentCount: 1,
    content: `<div class="score-box"><div class="score ${auditScore >= 90 ? 'pass' : auditScore >= 50 ? 'warn' : 'fail'}">${auditScore}%</div><div class="score-label">Audit Score</div></div>` + issuesHtml
  });
}

/**
 * Generate HTML document wrapper
 */
function generateHTML({ title, subtitle, distribution, totalIssues, componentCount, content }) {
  const d = distribution || { passing: 0, warning: 0, failing: 0 };
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="generator" content="mat-a11y">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      --pass: #22c55e;
      --pass-bg: #f0fdf4;
      --warn: #f59e0b;
      --warn-bg: #fffbeb;
      --fail: #ef4444;
      --fail-bg: #fef2f2;
      --border: #e5e5e5;
      --text: #1a1a1a;
      --text-muted: #666;
      --bg: #ffffff;
      --bg-alt: #f9fafb;
    }
    
    * { box-sizing: border-box; }
    body { 
      font-family: system-ui, -apple-system, sans-serif; 
      max-width: 1200px; 
      margin: 0 auto; 
      padding: 1rem; 
      color: var(--text); 
      line-height: 1.5;
      background: var(--bg);
    }
    
    /* Header */
    .header { 
      position: sticky; 
      top: 0; 
      background: var(--bg); 
      padding: 1rem 0; 
      border-bottom: 2px solid var(--border);
      z-index: 100;
      margin-bottom: 1.5rem;
    }
    h1 { margin: 0 0 0.25rem; font-size: 1.75rem; }
    .subtitle { color: var(--text-muted); margin: 0; font-size: 0.875rem; }
    
    /* Stats bar */
    .stats-bar {
      display: flex;
      gap: 2rem;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border);
    }
    .stat { display: flex; align-items: baseline; gap: 0.5rem; }
    .stat-value { font-size: 1.5rem; font-weight: bold; }
    .stat-label { color: var(--text-muted); font-size: 0.875rem; }
    
    /* Distribution cards */
    .distribution { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin: 1.5rem 0; }
    .dist-card { padding: 1.25rem; border-radius: 12px; text-align: center; cursor: pointer; transition: transform 0.15s; }
    .dist-card:hover { transform: scale(1.02); }
    .dist-card.pass { background: var(--pass-bg); border: 2px solid var(--pass); }
    .dist-card.warn { background: var(--warn-bg); border: 2px solid var(--warn); }
    .dist-card.fail { background: var(--fail-bg); border: 2px solid var(--fail); }
    .dist-value { font-size: 2rem; font-weight: bold; }
    .dist-card.pass .dist-value { color: var(--pass); }
    .dist-card.warn .dist-value { color: var(--warn); }
    .dist-card.fail .dist-value { color: var(--fail); }
    .dist-label { font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem; }
    
    /* Optimization banner */
    .optimization-banner {
      background: #eff6ff;
      border: 1px solid #3b82f6;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
      font-size: 0.875rem;
    }
    
    /* Priorities */
    .priorities-section { margin-bottom: 2rem; }
    .priorities-section h3 { margin: 0 0 1rem; }
    .priority-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .priority-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem 1rem;
      background: var(--bg-alt);
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .priority-item:hover { background: #e5e7eb; }
    .priority-rank {
      width: 28px;
      height: 28px;
      background: var(--text);
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 0.875rem;
    }
    .priority-info { flex: 1; }
    .priority-name { font-weight: 600; }
    .priority-issues { font-size: 0.75rem; color: var(--text-muted); }
    .priority-score { font-weight: bold; font-size: 0.875rem; }
    .priority-score.pass { color: var(--pass); }
    .priority-score.warn { color: var(--warn); }
    .priority-score.fail { color: var(--fail); }
    
    /* Section header with controls */
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .section-header h3 { margin: 0; }
    .controls { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .controls input, .controls select, .controls button {
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--border);
      border-radius: 6px;
      font-size: 0.875rem;
    }
    .controls input { width: 200px; }
    .controls button { 
      background: var(--bg-alt); 
      cursor: pointer;
      transition: background 0.15s;
    }
    .controls button:hover { background: #e5e7eb; }
    
    /* Component cards */
    .component-card {
      border: 1px solid var(--border);
      border-radius: 8px;
      margin-bottom: 0.5rem;
      overflow: hidden;
    }
    .component-card.hidden { display: none; }
    .component-header {
      display: flex;
      align-items: center;
      padding: 0.75rem 1rem;
      background: var(--bg-alt);
      cursor: pointer;
      user-select: none;
    }
    .component-header:hover { background: #e5e7eb; }
    .component-info { flex: 1; }
    .component-name { font-weight: 600; }
    .component-meta { margin-left: 0.75rem; font-size: 0.75rem; color: var(--text-muted); }
    .component-score { 
      font-weight: bold; 
      font-size: 0.875rem; 
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      margin-right: 0.75rem;
    }
    .component-score.pass { background: var(--pass-bg); color: var(--pass); }
    .component-score.warn { background: var(--warn-bg); color: var(--warn); }
    .component-score.fail { background: var(--fail-bg); color: var(--fail); }
    .toggle-icon { 
      color: var(--text-muted); 
      font-size: 0.75rem;
      transition: transform 0.15s;
    }
    .component-card.expanded .toggle-icon { transform: rotate(90deg); }
    
    .component-body { padding: 1rem; border-top: 1px solid var(--border); }
    .component-files { margin-bottom: 1rem; font-size: 0.875rem; }
    .file-link {
      display: inline-block;
      margin: 0.25rem 0.5rem 0.25rem 0;
      padding: 0.25rem 0.5rem;
      background: #e0f2fe;
      color: #0369a1;
      border-radius: 4px;
      text-decoration: none;
      font-size: 0.75rem;
    }
    .file-link:hover { background: #bae6fd; }
    
    /* Issue groups */
    .issue-groups { display: flex; flex-direction: column; gap: 0.5rem; }
    .issue-group { border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
    .issue-group.severity-high { border-left: 3px solid var(--fail); }
    .issue-group.severity-medium { border-left: 3px solid var(--warn); }
    .issue-group-header {
      display: flex;
      align-items: center;
      padding: 0.5rem 0.75rem;
      background: var(--bg-alt);
      cursor: pointer;
    }
    .issue-group-header:hover { background: #e5e7eb; }
    .issue-check { flex: 1; font-weight: 500; font-size: 0.875rem; }
    .issue-count {
      background: var(--text);
      color: white;
      padding: 0.125rem 0.5rem;
      border-radius: 10px;
      font-size: 0.75rem;
      margin-right: 0.5rem;
    }
    .issue-group.expanded .toggle-icon { transform: rotate(90deg); }
    
    .issue-list { padding: 0.5rem 0.75rem; }
    .issue-item { 
      padding: 0.5rem 0; 
      border-bottom: 1px solid var(--border);
      font-size: 0.875rem;
    }
    .issue-item:last-child { border-bottom: none; }
    .issue-file {
      display: inline-block;
      margin-bottom: 0.25rem;
      color: #0369a1;
      text-decoration: none;
      font-size: 0.75rem;
    }
    .issue-file:hover { text-decoration: underline; }
    .issue-message { color: var(--text-muted); font-size: 0.8125rem; }
    
    /* Score box for file mode */
    .score-box { text-align: center; margin: 2rem 0; }
    .score { font-size: 4rem; font-weight: bold; }
    .score.pass { color: var(--pass); }
    .score.warn { color: var(--warn); }
    .score.fail { color: var(--fail); }
    .score-label { color: var(--text-muted); }
    
    /* Footer */
    .disclaimer { 
      background: var(--warn-bg); 
      border: 1px solid var(--warn); 
      padding: 0.75rem 1rem; 
      margin-top: 2rem; 
      border-radius: 6px; 
      font-size: 0.75rem; 
    }
    footer { margin-top: 1.5rem; color: #999; font-size: 0.75rem; text-align: center; }
    
    /* Print styles */
    @media print {
      .header { position: static; }
      .controls { display: none; }
      .component-body { display: block !important; }
      .issue-list { display: block !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(title)}</h1>
    <p class="subtitle">${escapeHtml(subtitle)}</p>
    <div class="stats-bar">
      <div class="stat">
        <span class="stat-value">${totalIssues || 0}</span>
        <span class="stat-label">issues</span>
      </div>
      <div class="stat">
        <span class="stat-value">${componentCount || 0}</span>
        <span class="stat-label">components</span>
      </div>
      <div class="stat">
        <span class="stat-value">${d.failing || 0}</span>
        <span class="stat-label">failing</span>
      </div>
    </div>
  </div>
  
  <div class="distribution">
    <div class="dist-card pass" onclick="filterByScore('pass')">
      <div class="dist-value">${d.passing}</div>
      <div class="dist-label">Passing (90-100%)</div>
    </div>
    <div class="dist-card warn" onclick="filterByScore('warn')">
      <div class="dist-value">${d.warning}</div>
      <div class="dist-label">Needs Work (50-89%)</div>
    </div>
    <div class="dist-card fail" onclick="filterByScore('fail')">
      <div class="dist-value">${d.failing}</div>
      <div class="dist-label">Failing (&lt;50%)</div>
    </div>
  </div>
  
  ${content}
  
  <div class="disclaimer">
    <strong>Disclaimer:</strong> This analysis is provided "as is" without warranty. 
    No guarantee of completeness or fitness for a particular purpose.
  </div>
  
  <footer>Generated by mat-a11y | ${new Date().toISOString()}</footer>
  
  <script>
    // Toggle component expansion
    function toggleComponent(header) {
      const card = header.closest('.component-card');
      const body = card.querySelector('.component-body');
      const isExpanded = body.style.display !== 'none';
      body.style.display = isExpanded ? 'none' : 'block';
      card.classList.toggle('expanded', !isExpanded);
    }
    
    // Toggle issue group expansion
    function toggleIssueGroup(header) {
      const group = header.closest('.issue-group');
      const list = group.querySelector('.issue-list');
      const isExpanded = list.style.display !== 'none';
      list.style.display = isExpanded ? 'none' : 'block';
      group.classList.toggle('expanded', !isExpanded);
    }
    
    // Expand all components
    function expandAll() {
      document.querySelectorAll('.component-card').forEach(card => {
        card.querySelector('.component-body').style.display = 'block';
        card.classList.add('expanded');
      });
    }
    
    // Collapse all components
    function collapseAll() {
      document.querySelectorAll('.component-card').forEach(card => {
        card.querySelector('.component-body').style.display = 'none';
        card.classList.remove('expanded');
      });
    }
    
    // Filter components by search
    function filterComponents(query) {
      const q = query.toLowerCase();
      document.querySelectorAll('.component-card').forEach(card => {
        const name = card.dataset.component.toLowerCase();
        card.classList.toggle('hidden', !name.includes(q));
      });
    }
    
    // Filter by score category
    function filterByScore(category) {
      document.getElementById('filter').value = category;
      document.querySelectorAll('.component-card').forEach(card => {
        const score = parseInt(card.dataset.score);
        let show = true;
        if (category === 'pass') show = score >= 90;
        else if (category === 'warn') show = score >= 50 && score < 90;
        else if (category === 'fail') show = score < 50;
        card.classList.toggle('hidden', !show);
      });
    }
    
    // Scroll to component
    function scrollToComponent(name) {
      const card = document.querySelector('[data-component="' + name + '"]');
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.querySelector('.component-body').style.display = 'block';
        card.classList.add('expanded');
        card.style.boxShadow = '0 0 0 3px #3b82f6';
        setTimeout(() => card.style.boxShadow = '', 2000);
      }
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        document.getElementById('search')?.focus();
      }
      if (e.key === 'Escape') {
        document.getElementById('search').value = '';
        filterComponents('');
        document.getElementById('filter').value = 'all';
        filterByScore('all');
      }
    });
  </script>
</body>
</html>`;
}

/**
 * Escape HTML entities
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = {
  name: 'html',
  description: 'Interactive HTML report with expandable sections and file links',
  category: 'docs',
  output: 'html',
  fileExtension: '.html',
  mimeType: 'text/html',
  format
};
