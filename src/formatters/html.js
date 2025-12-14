'use strict';

/**
 * HTML Formatter for mat-a11y
 * 
 * Visual HTML report with charts and tables.
 * Great for sharing with stakeholders or local review.
 */

const { normalizeResults, getWorstEntities } = require('./result-utils');

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

function groupTopIssues(issues, limit = 3) {
  const counts = new Map();
  for (const issue of issues || []) {
    const key = issue?.check || 'unknown';
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([check, count]) => ({ check, count }));
}

function formatNormalizedEntityHTML(results, normalized) {
  const d = normalized.distribution;
  const modeLabel = getModeLabel(results);
  const title = getTitle(results, normalized);
  const itemLabel = getItemLabel(normalized);

  // Generate entity table
  let routesHtml = '<table class="data-table"><thead>' +
    `<tr><th>${escapeHtml(itemLabel.singular)}</th><th class="num">Score</th><th class="num">Audits</th></tr></thead><tbody>`;

  for (const entity of (normalized.entities || []).slice(0, 50)) {
    const color = entity.auditScore >= 90 ? 'pass' : entity.auditScore >= 50 ? 'warn' : 'fail';
    const audits = (typeof entity.auditsPassed === 'number' && typeof entity.auditsTotal === 'number')
      ? `${entity.auditsPassed}/${entity.auditsTotal}`
      : '-';

    routesHtml += `<tr><td>${escapeHtml(entity.label)}</td>` +
      `<td class="num ${color}">${entity.auditScore}%</td>` +
      `<td class="num">${escapeHtml(audits)}</td></tr>`;
  }
  routesHtml += '</tbody></table>';

  if (normalized.entities && normalized.entities.length > 50) {
    routesHtml += `<p class="more">...and ${normalized.entities.length - 50} more ${escapeHtml(itemLabel.plural)}</p>`;
  }

  // Generate fix priorities
  let prioritiesHtml = '';
  const worst = getWorstEntities(normalized.entities, 5);
  if (worst.length > 0) {
    prioritiesHtml = '<h3>Fix Priorities</h3><ol class="priorities">';
    for (const entity of worst) {
      if (entity.auditScore >= 90) continue;
      prioritiesHtml += `<li><strong>${escapeHtml(entity.label)}</strong> (${entity.auditScore}%)<ul>`;
      for (const issue of groupTopIssues(entity.issues, 3)) {
        prioritiesHtml += `<li>${escapeHtml(issue.check)}: ${issue.count} errors</li>`;
      }
      prioritiesHtml += '</ul></li>';
    }
    prioritiesHtml += '</ol>';
  }

  // Optional internal routes section (only present for sitemap analysis)
  let internalHtml = '';
  if (results?.internal && results.internal.count > 0 && results.internal.distribution) {
    const id = results.internal.distribution;
    internalHtml = '<h2 class="section-break">Internal Routes (not in sitemap)</h2>' +
      `<p class="subtitle">${results.internal.count} routes not in sitemap.xml. ` +
      'These pages won\'t be crawled by search engines.</p>' +
      '<div class="distribution">' +
      `<div class="dist-card pass"><div class="dist-value">${id.passing}</div>` +
      '<div class="dist-label">Passing</div></div>' +
      `<div class="dist-card warn"><div class="dist-value">${id.warning}</div>` +
      '<div class="dist-label">Needs Work</div></div>' +
      `<div class="dist-card fail"><div class="dist-value">${id.failing}</div>` +
      '<div class="dist-label">Failing</div></div></div>';

    if (results.internal.routes && results.internal.routes.length > 0) {
      internalHtml += '<h3>Internal Routes</h3><table class="data-table"><thead>' +
        '<tr><th>Route</th><th class="num">Score</th><th class="num">Audits</th></tr></thead><tbody>';

      for (const route of results.internal.routes.slice(0, 30)) {
        const color = route.auditScore >= 90 ? 'pass' : route.auditScore >= 50 ? 'warn' : 'fail';
        internalHtml += `<tr><td>${escapeHtml(route.path)}</td>` +
          `<td class="num ${color}">${route.auditScore}%</td>` +
          `<td class="num">${route.auditsPassed}/${route.auditsTotal}</td></tr>`;
      }
      internalHtml += '</tbody></table>';

      if (results.internal.routes.length > 30) {
        internalHtml += `<p class="more">...and ${results.internal.routes.length - 30} more internal routes</p>`;
      }
    }
  }

  return generateHTML({
    title,
    subtitle: `${normalized.total || 0} ${itemLabel.plural} | ${modeLabel} | Tier: ${(normalized.tier || 'material').toUpperCase()}`,
    distribution: d,
    content: `<h3>${escapeHtml(itemLabel.plural[0].toUpperCase() + itemLabel.plural.slice(1))}</h3>` + routesHtml + prioritiesHtml + internalHtml
  });
}

function formatNormalizedFileHTML(results, normalized) {
  const s = results.summary || {};
  const auditScore = typeof s.auditScore === 'number' ? s.auditScore : (normalized.entities[0]?.auditScore || 0);

  let issuesHtml = '';
  if (normalized.issues && normalized.issues.length > 0) {
    issuesHtml = '<h3>Issues Found</h3><table class="data-table"><thead>' +
      '<tr><th>File</th><th>Issue</th></tr></thead><tbody>';
    for (const issue of normalized.issues.slice(0, 50)) {
      issuesHtml += `<tr><td>${escapeHtml(issue.file || '')}</td>` +
        `<td>${escapeHtml(issue.message || '')}</td></tr>`;
    }
    issuesHtml += '</tbody></table>';
    if (normalized.issues.length > 50) {
      issuesHtml += `<p class="more">...and ${normalized.issues.length - 50} more issues</p>`;
    }
  }

  return generateHTML({
    title: getTitle(results, normalized),
    subtitle: `${s.filesChecked || 0} files | Tier: ${(normalized.tier || 'basic').toUpperCase()}`,
    distribution: normalized.distribution,
    content: `<div class="score-box"><div class="score ${auditScore >= 90 ? 'pass' : auditScore >= 50 ? 'warn' : 'fail'}">${auditScore}%</div><div class="score-label">Audit Score</div></div>` + issuesHtml
  });
}

/**
 * Generate HTML document wrapper
 */
function generateHTML({ title, subtitle, distribution, content }) {
  const d = distribution || { passing: 0, warning: 0, failing: 0 };
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="generator" content="mat-a11y">
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 1000px; margin: 0 auto; padding: 2rem 1rem; color: #1a1a1a; line-height: 1.5; }
    h1 { margin: 0 0 0.5rem; }
    h2 { margin: 2rem 0 1rem; }
    h3 { margin: 1.5rem 0 1rem; color: #444; }
    .subtitle { color: #666; margin-bottom: 2rem; }
    .section-break { margin-top: 3rem; padding-top: 2rem; border-top: 2px solid #e5e5e5; }
    
    .distribution { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin: 1.5rem 0; }
    .dist-card { padding: 1.5rem; border-radius: 12px; text-align: center; }
    .dist-card.pass { background: #f0fdf4; border: 2px solid #22c55e; }
    .dist-card.warn { background: #fffbeb; border: 2px solid #f59e0b; }
    .dist-card.fail { background: #fef2f2; border: 2px solid #ef4444; }
    .dist-value { font-size: 2.5rem; font-weight: bold; }
    .dist-card.pass .dist-value { color: #22c55e; }
    .dist-card.warn .dist-value { color: #f59e0b; }
    .dist-card.fail .dist-value { color: #ef4444; }
    .dist-label { font-size: 0.875rem; color: #666; margin-top: 0.5rem; }
    
    .data-table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    .data-table th, .data-table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #e5e5e5; }
    .data-table th { background: #f5f5f5; border-bottom: 2px solid #ddd; font-weight: 600; }
    .data-table .num { text-align: right; }
    .data-table .pass { color: #22c55e; font-weight: bold; }
    .data-table .warn { color: #f59e0b; font-weight: bold; }
    .data-table .fail { color: #ef4444; font-weight: bold; }
    
    .priorities { padding-left: 1.5rem; }
    .priorities li { margin: 0.5rem 0; }
    .priorities ul { margin: 0.25rem 0; color: #666; }
    
    .score-box { text-align: center; margin: 2rem 0; }
    .score { font-size: 4rem; font-weight: bold; }
    .score.pass { color: #22c55e; }
    .score.warn { color: #f59e0b; }
    .score.fail { color: #ef4444; }
    .score-label { color: #666; }
    
    .more { color: #666; font-size: 0.875rem; }
    .disclaimer { background: #fffbeb; border: 1px solid #f59e0b; padding: 1rem; margin-top: 2rem; border-radius: 4px; font-size: 0.875rem; }
    footer { margin-top: 2rem; color: #999; font-size: 0.75rem; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="subtitle">${escapeHtml(subtitle)}</p>
  
  <div class="distribution">
    <div class="dist-card pass">
      <div class="dist-value">${d.passing}</div>
      <div class="dist-label">Passing (90-100%)</div>
    </div>
    <div class="dist-card warn">
      <div class="dist-value">${d.warning}</div>
      <div class="dist-label">Needs Work (50-89%)</div>
    </div>
    <div class="dist-card fail">
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
  description: 'Visual HTML report with charts and tables',
  category: 'docs',
  output: 'html',
  fileExtension: '.html',
  mimeType: 'text/html',
  format
};
