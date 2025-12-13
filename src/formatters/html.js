'use strict';

/**
 * HTML Formatter for mat-a11y
 * 
 * Visual HTML report with charts and tables.
 * Great for sharing with stakeholders or local review.
 */

/**
 * Format results as HTML report
 * 
 * @param {object} results - Analysis results from mat-a11y
 * @param {object} options - Formatter options
 * @returns {string} HTML document
 */
function format(results, options = {}) {
  // Handle sitemap-based results
  if (results.urls && results.distribution) {
    return formatSitemapHTML(results);
  }
  
  // Handle route-based results
  if (results.routes && results.routeCount) {
    return formatRouteHTML(results);
  }
  
  // Handle file-based results
  return formatFileHTML(results);
}

/**
 * HTML format for sitemap-based results
 */
function formatSitemapHTML(results) {
  const d = results.distribution;

  // Generate URL table
  let urlsHtml = '<table class="data-table"><thead>' +
    '<tr><th>URL</th><th class="num">Score</th><th class="num">Audits</th></tr></thead><tbody>';

  for (const url of (results.urls || []).slice(0, 50)) {
    const color = url.auditScore >= 90 ? 'pass' : url.auditScore >= 50 ? 'warn' : 'fail';
    urlsHtml += `<tr><td>${escapeHtml(url.path)}</td>` +
      `<td class="num ${color}">${url.auditScore}%</td>` +
      `<td class="num">${url.auditsPassed}/${url.auditsTotal}</td></tr>`;
  }
  urlsHtml += '</tbody></table>';

  if (results.urls && results.urls.length > 50) {
    urlsHtml += `<p class="more">...and ${results.urls.length - 50} more URLs</p>`;
  }

  // Generate fix priorities
  let prioritiesHtml = '';
  if (results.worstUrls && results.worstUrls.length > 0) {
    prioritiesHtml = '<h3>Fix Priorities</h3><ol class="priorities">';
    for (let i = 0; i < Math.min(5, results.worstUrls.length); i++) {
      const worst = results.worstUrls[i];
      if (worst.score >= 90) continue;
      prioritiesHtml += `<li><strong>${escapeHtml(worst.path)}</strong> (${worst.score}%)<ul>`;
      for (const issue of (worst.topIssues || [])) {
        prioritiesHtml += `<li>${escapeHtml(issue.check)}: ${issue.count} errors</li>`;
      }
      prioritiesHtml += '</ul></li>';
    }
    prioritiesHtml += '</ol>';
  }

  // Generate internal routes section
  let internalHtml = '';
  if (results.internal && results.internal.count > 0) {
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

    // Internal routes table
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
    title: 'mat-a11y Accessibility Report',
    subtitle: `${results.urlCount || 0} sitemap URLs | Tier: ${(results.tier || 'material').toUpperCase()}`,
    distribution: d,
    content: '<h3>Sitemap URLs</h3>' + urlsHtml + prioritiesHtml + internalHtml
  });
}

/**
 * HTML format for route-based results
 */
function formatRouteHTML(results) {
  const passing = results.routes.filter(r => r.auditScore >= 90).length;
  const warning = results.routes.filter(r => r.auditScore >= 50 && r.auditScore < 90).length;
  const failing = results.routes.filter(r => r.auditScore < 50).length;

  // Generate routes table
  let routesHtml = '<table class="data-table"><thead>' +
    '<tr><th>Route</th><th class="num">Score</th><th class="num">Audits</th></tr></thead><tbody>';

  for (const route of results.routes.slice(0, 30)) {
    const color = route.auditScore >= 90 ? 'pass' : route.auditScore >= 50 ? 'warn' : 'fail';
    routesHtml += `<tr><td>${escapeHtml(route.path)}</td>` +
      `<td class="num ${color}">${route.auditScore}%</td>` +
      `<td class="num">${route.auditsPassed}/${route.auditsTotal}</td></tr>`;
  }
  routesHtml += '</tbody></table>';

  if (results.routes.length > 30) {
    routesHtml += `<p class="more">...and ${results.routes.length - 30} more routes</p>`;
  }

  // Fix priorities
  let prioritiesHtml = '';
  if (results.worstRoutes && results.worstRoutes.length > 0) {
    prioritiesHtml = '<h3>Fix Priorities</h3><ol class="priorities">';
    for (let i = 0; i < Math.min(5, results.worstRoutes.length); i++) {
      const worst = results.worstRoutes[i];
      if (worst.score >= 90) continue;
      prioritiesHtml += `<li><strong>${escapeHtml(worst.path)}</strong> (${worst.score}%)<ul>`;
      for (const issue of (worst.topIssues || [])) {
        prioritiesHtml += `<li>${escapeHtml(issue.check)}: ${issue.count} errors</li>`;
      }
      prioritiesHtml += '</ul></li>';
    }
    prioritiesHtml += '</ol>';
  }

  return generateHTML({
    title: 'mat-a11y Route Analysis',
    subtitle: `${results.routeCount} routes | Tier: ${(results.tier || 'material').toUpperCase()}`,
    distribution: { passing, warning, failing },
    content: '<h3>All Routes</h3>' + routesHtml + prioritiesHtml
  });
}

/**
 * HTML format for file-based results
 */
function formatFileHTML(results) {
  const s = results.summary || {};
  const auditScore = s.auditScore || 0;
  const passing = auditScore >= 90 ? 1 : 0;
  const warning = auditScore >= 50 && auditScore < 90 ? 1 : 0;
  const failing = auditScore < 50 ? 1 : 0;

  // Issues list
  let issuesHtml = '';
  if (s.issues && s.issues.length > 0) {
    issuesHtml = '<h3>Issues Found</h3><table class="data-table"><thead>' +
      '<tr><th>File</th><th>Issue</th></tr></thead><tbody>';
    for (const issue of s.issues.slice(0, 50)) {
      issuesHtml += `<tr><td>${escapeHtml(issue.file || '')}</td>` +
        `<td>${escapeHtml(issue.message || '')}</td></tr>`;
    }
    issuesHtml += '</tbody></table>';
    if (s.issues.length > 50) {
      issuesHtml += `<p class="more">...and ${s.issues.length - 50} more issues</p>`;
    }
  }

  return generateHTML({
    title: 'mat-a11y Analysis Report',
    subtitle: `${s.filesChecked || 0} files | Tier: ${(results.tier || 'basic').toUpperCase()}`,
    distribution: { passing, warning, failing },
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
