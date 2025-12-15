'use strict';

/**
 * HTML Formatter for mat-a11y
 *
 * Clean, sortable table report for management:
 * - Sortable columns (click headers)
 * - No icons/emojis
 * - Issue points prioritization
 * - Expandable issue details
 */

const path = require('path');
const { normalizeResults, getEntitiesByIssuePoints, getCheckWeight } = require('./result-utils');

function format(results, options = {}) {
  const normalized = normalizeResults(results);

  const isFile = normalized.entities.length === 1 && normalized.entities[0]?.kind === 'file';
  if (isFile) {
    return formatFileHTML(results, normalized);
  }

  return formatEntityHTML(results, normalized);
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

function groupIssuesByCheck(issues) {
  const groups = new Map();
  for (const issue of issues || []) {
    const key = issue?.check || 'unknown';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(issue);
  }
  return groups;
}

function sortIssueGroupsByWeight(groups) {
  return Array.from(groups.entries()).sort((a, b) => {
    return getCheckWeight(b[0]) - getCheckWeight(a[0]);
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Extract line number from issue message
 * Messages contain "Found: <element> (line X)" at the end
 */
function extractLineNumber(message) {
  if (!message) return null;
  const match = message.match(/\(line\s+(\d+)\)\s*$/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Get the first line of the message (the main error description)
 */
function getMessageSummary(message) {
  if (!message) return '';
  return message.split('\n')[0].replace(/^\[(Error|Warning|Info)\]\s*/, '');
}

function formatEntityHTML(results, normalized) {
  const d = normalized.distribution;
  const modeLabel = getModeLabel(results);
  const title = getTitle(results, normalized);

  const optimization = results.optimization || {};
  const hasOptimization = optimization.enabled && optimization.originalCount !== optimization.optimizedCount;

  const entities = normalized.entities || [];
  const sortedEntities = getEntitiesByIssuePoints(entities, entities.length);

  let totalIssuePoints = 0;
  for (const e of sortedEntities) {
    totalIssuePoints += e.issuePoints?.totalPoints || 0;
  }

  // Build table rows
  let tableRows = '';
  for (let i = 0; i < sortedEntities.length; i++) {
    const entity = sortedEntities[i];
    const issueCount = entity.issues?.length || 0;
    const points = entity.issuePoints || { basePoints: 0, usageCount: 1, totalPoints: 0 };
    const issueGroups = groupIssuesByCheck(entity.issues);
    const topChecks = sortIssueGroupsByWeight(issueGroups).slice(0, 3);

    const scoreClass = entity.auditScore >= 90 ? 'pass' : entity.auditScore >= 50 ? 'warn' : 'fail';
    const pointsDisplay = points.usageCount > 1
      ? `${points.totalPoints} (${points.basePoints} x ${points.usageCount})`
      : `${points.basePoints}`;

    // Build issue details for expandable row (show first 5, "View more" for rest)
    const issueDetails = sortIssueGroupsByWeight(issueGroups).map(([check, issues]) => {
      const visibleIssues = issues.slice(0, 5);
      const hiddenIssues = issues.slice(5);
      const groupId = `group-${i}-${check.replace(/[^a-zA-Z0-9]/g, '')}`;

      const formatIssue = (issue) => {
        const line = extractLineNumber(issue.message);
        const lineStr = line ? `<span class="line-num">:${line}</span>` : '';
        const msg = getMessageSummary(issue.message);
        return `<li>${escapeHtml(msg)}${lineStr}</li>`;
      };

      let html = `<div class="issue-group">
        <strong>${escapeHtml(check)}</strong> (${issues.length})
        <ul>
          ${visibleIssues.map(formatIssue).join('')}`;

      if (hiddenIssues.length > 0) {
        html += `
          <div class="hidden-issues" id="${groupId}" style="display:none;">
            ${hiddenIssues.map(formatIssue).join('')}
          </div>
          <li class="view-more-item"><button class="view-more-btn" onclick="toggleMore('${groupId}', this)">View ${hiddenIssues.length} more</button></li>`;
      }

      html += `</ul></div>`;
      return html;
    }).join('');

    tableRows += `
      <tr class="component-row" data-points="${points.totalPoints}" data-issues="${issueCount}" data-score="${entity.auditScore}" data-name="${escapeHtml(entity.label).toLowerCase()}">
        <td class="col-name">
          <button class="expand-btn" onclick="toggleRow(this)" aria-expanded="false" aria-label="Expand details for ${escapeHtml(entity.label)}">
            <span aria-hidden="true">+</span>
          </button>
          ${escapeHtml(entity.label)}
        </td>
        <td class="col-points">${pointsDisplay}</td>
        <td class="col-issues">${issueCount}</td>
        <td class="col-score"><span class="score-badge ${scoreClass}">${entity.auditScore}%</span></td>
        <td class="col-checks">${topChecks.map(([check, issues]) => `<span class="check-tag">${escapeHtml(check)} (${issues.length})</span>`).join(' ')}</td>
      </tr>
      <tr class="details-row" style="display: none;">
        <td colspan="5">
          <div class="details-content">${issueDetails || '<em>No issues</em>'}</div>
        </td>
      </tr>`;
  }

  const totalIssues = entities.reduce((sum, e) => sum + (e.issues?.length || 0), 0);

  let optimizationNote = '';
  if (hasOptimization) {
    const reduction = Math.round((1 - optimization.optimizedCount / optimization.originalCount) * 100);
    optimizationNote = `<p class="optimization-note">Root Cause Analysis: ${optimization.originalCount} issues reduced to ${optimization.optimizedCount} unique fixes (${reduction}% reduction)</p>`;
  }

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
      --pass-bg: #dcfce7;
      --warn: #f59e0b;
      --warn-bg: #fef3c7;
      --fail: #ef4444;
      --fail-bg: #fee2e2;
      --border: #e5e7eb;
      --text: #111827;
      --text-muted: #6b7280;
      --bg: #ffffff;
      --bg-alt: #f9fafb;
      --bg-hover: #f3f4f6;
    }

    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
      color: var(--text);
      line-height: 1.5;
      background: var(--bg);
    }

    h1 { margin: 0 0 0.5rem; font-size: 1.5rem; font-weight: 600; }
    .subtitle { color: var(--text-muted); margin: 0 0 1.5rem; font-size: 0.875rem; }

    /* Summary stats */
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .stat-card {
      background: var(--bg-alt);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1rem;
    }
    .stat-value { font-size: 1.75rem; font-weight: 700; }
    .stat-label { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .stat-card.highlight { background: var(--fail-bg); border-color: var(--fail); }
    .stat-card.highlight .stat-value { color: var(--fail); }

    .optimization-note {
      background: #eff6ff;
      border: 1px solid #3b82f6;
      padding: 0.75rem 1rem;
      border-radius: 6px;
      margin-bottom: 1.5rem;
      font-size: 0.875rem;
      color: #1e40af;
    }

    /* Controls */
    .controls {
      display: flex;
      gap: 0.75rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }
    .controls input, .controls select {
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--border);
      border-radius: 6px;
      font-size: 0.875rem;
      min-height: 44px;
    }
    .controls input { width: 250px; }

    /* Table */
    .table-container { overflow-x: auto; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    th, td {
      padding: 0.75rem 1rem;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    th {
      background: var(--bg-alt);
      font-weight: 600;
      cursor: pointer;
      user-select: none;
      white-space: nowrap;
    }
    th:hover { background: var(--bg-hover); }
    th .sort-icon { margin-left: 0.25rem; color: var(--text-muted); }
    th.sorted .sort-icon { color: var(--text); }

    .component-row:hover, .component-row:focus-within { background: var(--bg-hover); }

    .col-name { min-width: 200px; }
    .col-points { text-align: right; font-weight: 600; color: var(--fail); min-width: 100px; }
    .col-issues { text-align: right; min-width: 80px; }
    .col-score { text-align: center; min-width: 80px; }
    .col-checks { min-width: 250px; }

    .expand-btn {
      background: none;
      border: 1px solid var(--border);
      border-radius: 4px;
      min-width: 44px;
      min-height: 44px;
      cursor: pointer;
      margin-right: 0.5rem;
      font-size: 0.875rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .expand-btn:hover { background: var(--bg-hover); }
    .expand-btn:focus { outline: 2px solid #3b82f6; outline-offset: 2px; }

    /* Visually hidden text for screen readers */
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    .score-badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-weight: 600;
      font-size: 0.75rem;
    }
    .score-badge.pass { background: var(--pass-bg); color: #166534; }
    .score-badge.warn { background: var(--warn-bg); color: #92400e; }
    .score-badge.fail { background: var(--fail-bg); color: #991b1b; }

    .check-tag {
      display: inline-block;
      background: var(--bg-alt);
      border: 1px solid var(--border);
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
      font-size: 0.75rem;
      margin: 0.125rem;
    }

    .details-row td { padding: 0; background: var(--bg-alt); }
    .details-content {
      padding: 1rem 1rem 1rem 3rem;
      max-height: 300px;
      overflow-y: auto;
    }
    .issue-group { margin-bottom: 1rem; }
    .issue-group ul { margin: 0.5rem 0 0 1.5rem; padding: 0; list-style: none; }
    .issue-group li { margin-bottom: 0.25rem; color: var(--text-muted); font-size: 0.8rem; }
    .issue-group li::before { content: "•"; margin-right: 0.5rem; }
    .hidden-issues { display: none; }
    .hidden-issues li { margin-bottom: 0.25rem; }
    .view-more-item { list-style: none; margin-top: 0.5rem; }
    .view-more-item::before { content: none; }
    .view-more-btn {
      background: none;
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      cursor: pointer;
      color: var(--text-muted);
    }
    .view-more-btn:hover { background: var(--bg-hover); }
    .view-more-btn:focus { outline: 2px solid #3b82f6; outline-offset: 2px; }

    /* Focus styles for interactive elements */
    th:focus { outline: 2px solid #3b82f6; outline-offset: -2px; }
    input:focus, select:focus { outline: 2px solid #3b82f6; outline-offset: 0; border-color: #3b82f6; }
    a:focus { outline: 2px solid #3b82f6; outline-offset: 2px; }
    .line-num { color: #6366f1; font-weight: 600; margin-left: 0.5rem; }

    .disclaimer {
      margin-top: 2rem;
      padding: 0.75rem 1rem;
      background: var(--bg-alt);
      border: 1px solid var(--border);
      border-radius: 6px;
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    footer {
      margin-top: 1rem;
      font-size: 0.75rem;
      color: var(--text-muted);
      text-align: center;
    }

    @media print {
      .controls { display: none; }
      .expand-btn { display: none; }
      .details-row { display: table-row !important; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="subtitle">${modeLabel} | ${normalized.total || entities.length} components | Tier: ${(normalized.tier || 'material').toUpperCase()}</p>

  <div class="summary">
    <div class="stat-card highlight">
      <div class="stat-value">${totalIssuePoints}</div>
      <div class="stat-label">Issue Points</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${totalIssues}</div>
      <div class="stat-label">Total Issues</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${d.failing || 0}</div>
      <div class="stat-label">Failing</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${d.warning || 0}</div>
      <div class="stat-label">Needs Work</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${d.passing || 0}</div>
      <div class="stat-label">Passing</div>
    </div>
  </div>

  ${optimizationNote}

  <div class="controls">
    <label for="search" class="sr-only">Search components</label>
    <input type="text" id="search" placeholder="Search components..." oninput="filterTable()">
    <label for="filter" class="sr-only">Filter by status</label>
    <select id="filter" onchange="filterTable()">
      <option value="all">All Components</option>
      <option value="fail">Failing (&lt;50%)</option>
      <option value="warn">Needs Work (50-89%)</option>
      <option value="pass">Passing (90%+)</option>
    </select>
  </div>

  <div class="table-container">
    <table id="components-table">
      <thead>
        <tr>
          <th onclick="sortTable('name')" onkeydown="handleHeaderKey(event, 'name')" data-col="name" tabindex="0" role="button" aria-label="Sort by component name">Component <span class="sort-icon" aria-hidden="true">↕</span></th>
          <th onclick="sortTable('points')" onkeydown="handleHeaderKey(event, 'points')" data-col="points" class="sorted" tabindex="0" role="button" aria-label="Sort by issue points, currently sorted descending">Issue Points <span class="sort-icon" aria-hidden="true">↓</span></th>
          <th onclick="sortTable('issues')" onkeydown="handleHeaderKey(event, 'issues')" data-col="issues" tabindex="0" role="button" aria-label="Sort by issue count">Issues <span class="sort-icon" aria-hidden="true">↕</span></th>
          <th onclick="sortTable('score')" onkeydown="handleHeaderKey(event, 'score')" data-col="score" tabindex="0" role="button" aria-label="Sort by score">Score <span class="sort-icon" aria-hidden="true">↕</span></th>
          <th>Top Issues</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  </div>

  <div class="disclaimer">
    <strong>Disclaimer:</strong> This analysis is provided "as is" without warranty. No guarantee of completeness or fitness for a particular purpose.
  </div>

  <footer>
    Generated by mat-a11y | ${new Date().toISOString()}<br>
    <span style="color: #6b7280;"><a href="https://traufix.de" style="color: #3b82f6;">traufix.de</a> | <a href="https://www.freelancermap.de/profil/robin-spanier" style="color: #3b82f6;">freelancermap.de/profil/robin-spanier</a></span>
  </footer>

  <script>
    let currentSort = { col: 'points', dir: 'desc' };

    function handleHeaderKey(event, col) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        sortTable(col);
      }
    }

    function toggleRow(btn) {
      const row = btn.closest('tr');
      const detailsRow = row.nextElementSibling;
      const isExpanded = detailsRow.style.display !== 'none';
      detailsRow.style.display = isExpanded ? 'none' : 'table-row';
      btn.querySelector('span').textContent = isExpanded ? '+' : '-';
      btn.setAttribute('aria-expanded', !isExpanded);
    }

    function toggleMore(groupId, btn) {
      const hidden = document.getElementById(groupId);
      if (hidden) {
        const isVisible = hidden.style.display !== 'none';
        hidden.style.display = isVisible ? 'none' : 'block';
        btn.textContent = isVisible ? btn.textContent.replace('Hide', 'View') : btn.textContent.replace('View', 'Hide');
      }
    }

    function filterTable() {
      const query = document.getElementById('search').value.toLowerCase();
      const filter = document.getElementById('filter').value;

      document.querySelectorAll('.component-row').forEach(row => {
        const name = row.dataset.name;
        const score = parseInt(row.dataset.score);

        let matchesFilter = true;
        if (filter === 'fail') matchesFilter = score < 50;
        else if (filter === 'warn') matchesFilter = score >= 50 && score < 90;
        else if (filter === 'pass') matchesFilter = score >= 90;

        const matchesSearch = name.includes(query);
        const show = matchesFilter && matchesSearch;

        row.style.display = show ? '' : 'none';
        row.nextElementSibling.style.display = 'none'; // hide details when filtering
      });
    }

    function sortTable(col) {
      const tbody = document.querySelector('#components-table tbody');
      const rows = Array.from(tbody.querySelectorAll('.component-row'));

      // Toggle direction if same column
      if (currentSort.col === col) {
        currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort.col = col;
        currentSort.dir = col === 'name' ? 'asc' : 'desc';
      }

      rows.sort((a, b) => {
        let aVal, bVal;
        if (col === 'name') {
          aVal = a.dataset.name;
          bVal = b.dataset.name;
        } else if (col === 'points') {
          aVal = parseInt(a.dataset.points);
          bVal = parseInt(b.dataset.points);
        } else if (col === 'issues') {
          aVal = parseInt(a.dataset.issues);
          bVal = parseInt(b.dataset.issues);
        } else if (col === 'score') {
          aVal = parseInt(a.dataset.score);
          bVal = parseInt(b.dataset.score);
        }

        let cmp = 0;
        if (typeof aVal === 'string') cmp = aVal.localeCompare(bVal);
        else cmp = aVal - bVal;

        return currentSort.dir === 'asc' ? cmp : -cmp;
      });

      // Reorder DOM
      rows.forEach(row => {
        const details = row.nextElementSibling;
        tbody.appendChild(row);
        tbody.appendChild(details);
      });

      // Update header indicators
      document.querySelectorAll('th[data-col]').forEach(th => {
        th.classList.remove('sorted');
        th.querySelector('.sort-icon').textContent = '↕';
        const colName = th.dataset.col;
        th.setAttribute('aria-label', 'Sort by ' + colName);
      });
      const th = document.querySelector('th[data-col="' + col + '"]');
      th.classList.add('sorted');
      th.querySelector('.sort-icon').textContent = currentSort.dir === 'asc' ? '↑' : '↓';
      th.setAttribute('aria-label', 'Sort by ' + col + ', currently sorted ' + (currentSort.dir === 'asc' ? 'ascending' : 'descending'));
    }
  </script>
</body>
</html>`;
}

function formatFileHTML(results, normalized) {
  const s = results.summary || {};
  const auditScore = typeof s.auditScore === 'number' ? s.auditScore : (normalized.entities[0]?.auditScore || 0);
  const scoreClass = auditScore >= 90 ? 'pass' : auditScore >= 50 ? 'warn' : 'fail';

  const issueGroups = groupIssuesByCheck(normalized.issues);
  let issuesHtml = '';

  for (const [check, issues] of sortIssueGroupsByWeight(issueGroups)) {
    issuesHtml += `
      <div class="issue-group">
        <strong>${escapeHtml(check)}</strong> (${issues.length})
        <ul>
          ${issues.map(issue => `<li>${escapeHtml(issue.message?.split('\n')[0] || '')}</li>`).join('')}
        </ul>
      </div>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>mat-a11y Analysis Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; }
    h1 { margin: 0 0 1rem; }
    .score { font-size: 3rem; font-weight: 700; margin: 2rem 0; text-align: center; }
    .score.pass { color: #22c55e; }
    .score.warn { color: #f59e0b; }
    .score.fail { color: #ef4444; }
    .issue-group { margin: 1rem 0; }
    .issue-group ul { margin: 0.5rem 0 0 1.5rem; }
    .issue-group li { margin-bottom: 0.25rem; color: #666; }
  </style>
</head>
<body>
  <h1>mat-a11y Analysis Report</h1>
  <p>${s.filesChecked || 0} files | Tier: ${(normalized.tier || 'basic').toUpperCase()}</p>
  <div class="score ${scoreClass}">${auditScore}%</div>
  ${issuesHtml || '<p>No issues found.</p>'}
</body>
</html>`;
}

module.exports = {
  name: 'html',
  description: 'Interactive HTML report with sortable table',
  category: 'docs',
  output: 'html',
  fileExtension: '.html',
  mimeType: 'text/html',
  format
};
