'use strict';

/**
 * PDF Formatter for mat-a11y
 *
 * Executive summary report optimized for printing/PDF export.
 * Clean, professional layout for management and stakeholders.
 */

const { normalizeResults } = require('./result-utils');

function format(results, options = {}) {
  const normalized = normalizeResults(results);
  const entities = normalized.entities || [];

  // Calculate severity counts (matching GUI logic)
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

  const totalIssues = critical + high + medium;
  const componentCount = entities.length;
  const auditScore = results.auditScore || normalized.entities[0]?.auditScore || 0;

  // Group issues by check for top issues section
  const issuesByCheck = new Map();
  for (const entity of entities) {
    for (const issue of (entity.issues || [])) {
      const check = issue.check || 'unknown';
      if (!issuesByCheck.has(check)) {
        issuesByCheck.set(check, {
          check,
          count: 0,
          impact: issue.severity || issue.impact || 'medium',
          components: new Set()
        });
      }
      const entry = issuesByCheck.get(check);
      entry.count++;
      entry.components.add(entity.label);
    }
  }

  // Sort by count descending, take top 10
  const topIssues = Array.from(issuesByCheck.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Generate top issues HTML
  const topIssuesHtml = topIssues.map((issue, i) => {
    const impactClass = issue.impact === 'critical' ? 'critical' :
                        issue.impact === 'high' ? 'high' : 'medium';
    return `
      <tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(issue.check)}</td>
        <td class="count">${issue.count}</td>
        <td><span class="impact-badge ${impactClass}">${issue.impact}</span></td>
        <td>${issue.components.size}</td>
      </tr>`;
  }).join('');

  // Score rating
  const scoreRating = auditScore >= 90 ? 'Excellent' :
                      auditScore >= 70 ? 'Good' :
                      auditScore >= 50 ? 'Needs Improvement' : 'Critical';
  const scoreClass = auditScore >= 90 ? 'excellent' :
                     auditScore >= 70 ? 'good' :
                     auditScore >= 50 ? 'warning' : 'critical';

  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Accessibility Audit Report - ${date}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
    }

    /* Header */
    .report-header {
      text-align: center;
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 2px solid #e5e7eb;
    }
    .report-title {
      font-size: 1.75rem;
      font-weight: 700;
      color: #111827;
      margin-bottom: 0.5rem;
    }
    .report-subtitle {
      color: #6b7280;
      font-size: 0.875rem;
    }
    .report-date {
      color: #9ca3af;
      font-size: 0.75rem;
      margin-top: 0.5rem;
    }

    /* Score Section */
    .score-section {
      text-align: center;
      margin: 2rem 0;
      padding: 1.5rem;
      background: #f9fafb;
      border-radius: 12px;
    }
    .score-value {
      font-size: 4rem;
      font-weight: 800;
      line-height: 1;
    }
    .score-value.excellent { color: #059669; }
    .score-value.good { color: #0891b2; }
    .score-value.warning { color: #d97706; }
    .score-value.critical { color: #dc2626; }
    .score-label {
      font-size: 1rem;
      color: #6b7280;
      margin-top: 0.5rem;
    }
    .score-rating {
      font-size: 1.25rem;
      font-weight: 600;
      margin-top: 0.25rem;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin: 2rem 0;
    }
    .stat-box {
      text-align: center;
      padding: 1rem;
      background: #f9fafb;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }
    .stat-box.critical { background: #fef2f2; border-color: #fecaca; }
    .stat-box.high { background: #fffbeb; border-color: #fde68a; }
    .stat-box.medium { background: #eff6ff; border-color: #bfdbfe; }
    .stat-number {
      font-size: 2rem;
      font-weight: 700;
    }
    .stat-box.critical .stat-number { color: #dc2626; }
    .stat-box.high .stat-number { color: #d97706; }
    .stat-box.medium .stat-number { color: #2563eb; }
    .stat-name {
      font-size: 0.75rem;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* Section */
    .section {
      margin: 2rem 0;
    }
    .section-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #111827;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #e5e7eb;
    }

    /* Table */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    th, td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    th {
      background: #f9fafb;
      font-weight: 600;
      color: #374151;
    }
    td.count {
      font-weight: 600;
      text-align: center;
    }

    .impact-badge {
      display: inline-block;
      padding: 0.125rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: capitalize;
    }
    .impact-badge.critical { background: #fef2f2; color: #dc2626; }
    .impact-badge.high { background: #fffbeb; color: #d97706; }
    .impact-badge.medium { background: #eff6ff; color: #2563eb; }

    /* Summary */
    .summary-text {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 1rem;
      margin: 1.5rem 0;
    }
    .summary-text.warning {
      background: #fffbeb;
      border-color: #fde68a;
    }
    .summary-text.critical {
      background: #fef2f2;
      border-color: #fecaca;
    }

    /* Footer */
    .report-footer {
      margin-top: 3rem;
      padding-top: 1.5rem;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 0.75rem;
      color: #9ca3af;
    }
    .report-footer a {
      color: #3b82f6;
      text-decoration: none;
    }

    /* Print styles */
    @media print {
      body { padding: 0; }
      .score-section { break-inside: avoid; }
      .stats-grid { break-inside: avoid; }
      table { break-inside: avoid; }
    }

    @page {
      margin: 1.5cm;
    }
  </style>
</head>
<body>
  <header class="report-header">
    <h1 class="report-title">Accessibility Audit Report</h1>
    <p class="report-subtitle">mat-a11y Analysis Summary</p>
    <p class="report-date">Generated on ${date}</p>
  </header>

  <section class="score-section">
    <div class="score-value ${scoreClass}">${auditScore}</div>
    <div class="score-label">Accessibility Score</div>
    <div class="score-rating">${scoreRating}</div>
  </section>

  <div class="stats-grid">
    <div class="stat-box">
      <div class="stat-number">${totalIssues}</div>
      <div class="stat-name">Total Issues</div>
    </div>
    <div class="stat-box critical">
      <div class="stat-number">${critical}</div>
      <div class="stat-name">Critical</div>
    </div>
    <div class="stat-box high">
      <div class="stat-number">${high}</div>
      <div class="stat-name">High</div>
    </div>
    <div class="stat-box medium">
      <div class="stat-number">${medium}</div>
      <div class="stat-name">Medium</div>
    </div>
  </div>

  <div class="summary-text ${auditScore < 50 ? 'critical' : auditScore < 70 ? 'warning' : ''}">
    <strong>Summary:</strong>
    ${totalIssues === 0
      ? 'Congratulations! No accessibility issues were detected in your project.'
      : `This audit found ${totalIssues} accessibility issues across ${componentCount} components. ${critical > 0 ? `There are ${critical} critical issues that should be addressed immediately.` : ''}`
    }
  </div>

  <section class="section">
    <h2 class="section-title">Top Issues by Frequency</h2>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Issue Type</th>
          <th>Count</th>
          <th>Severity</th>
          <th>Components</th>
        </tr>
      </thead>
      <tbody>
        ${topIssuesHtml || '<tr><td colspan="5" style="text-align:center;color:#6b7280;">No issues found</td></tr>'}
      </tbody>
    </table>
  </section>

  <section class="section">
    <h2 class="section-title">Recommendations</h2>
    <ol style="padding-left: 1.5rem; color: #374151;">
      ${critical > 0 ? '<li><strong>Address critical issues first</strong> - These create significant barriers for users with disabilities.</li>' : ''}
      ${high > 0 ? '<li><strong>Review high-severity issues</strong> - These impact user experience significantly.</li>' : ''}
      <li><strong>Run regular audits</strong> - Integrate accessibility checks into your CI/CD pipeline.</li>
      <li><strong>Test with real users</strong> - Automated tools catch ~30% of issues; manual testing is essential.</li>
    </ol>
  </section>

  <footer class="report-footer">
    <p>Generated by mat-a11y | <a href="https://traufix.de">traufix.de</a></p>
    <p style="margin-top: 0.5rem;">Built by Robin Spanier | <a href="https://www.freelancermap.de/profil/robin-spanier">Available for hire</a></p>
  </footer>

  <script>
    // Auto-print when opened with ?print=true
    (function() {
      const params = new URLSearchParams(window.location.search);
      if (params.get('print') === 'true') {
        window.addEventListener('load', function() {
          setTimeout(function() { window.print(); }, 500);
        });
      }
    })();
  </script>
</body>
</html>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = {
  name: 'pdf',
  description: 'Executive summary report optimized for PDF export',
  category: 'docs',
  output: 'html',
  fileExtension: '.html',
  mimeType: 'text/html',
  format
};
