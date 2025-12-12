'use strict';

/**
 * Documentation & Report Formatters
 *
 * Formats for: Markdown, HTML, PDF, CSV, Confluence, Jira, Notion
 */

/**
 * Markdown - General purpose
 */
function markdown(results, options = {}) {
  const title = options.title || 'mat-a11y Accessibility Report';
  let md = `# ${title}\n\n`;

  md += `**Tier:** ${results.tier}\n`;
  md += `**Sitemap:** ${results.sitemapPath}\n`;
  md += `**Generated:** ${new Date().toISOString()}\n\n`;

  // Summary
  md += `## Summary\n\n`;
  const d = results.distribution;
  md += `| Metric | Value |\n|--------|-------|\n`;
  md += `| URLs Analyzed | ${results.urlCount} |\n`;
  md += `| Passing (90-100%) | ${d.passing} |\n`;
  md += `| Warning (50-89%) | ${d.warning} |\n`;
  md += `| Failing (<50%) | ${d.failing} |\n\n`;

  // Distribution chart (ASCII)
  const total = results.urlCount || 1;
  const passingBar = '█'.repeat(Math.round((d.passing / total) * 20));
  const warningBar = '▓'.repeat(Math.round((d.warning / total) * 20));
  const failingBar = '░'.repeat(Math.round((d.failing / total) * 20));
  md += `\`\`\`\nPassing: ${passingBar} ${d.passing}\nWarning: ${warningBar} ${d.warning}\nFailing: ${failingBar} ${d.failing}\n\`\`\`\n\n`;

  // Worst URLs
  if (results.worstUrls && results.worstUrls.length > 0) {
    md += `## Priority Fixes\n\n`;
    for (const url of results.worstUrls) {
      if (url.score >= 90) continue;
      md += `### ${url.path} (${url.score}%)\n\n`;
      md += `| Check | Errors |\n|-------|--------|\n`;
      for (const issue of url.topIssues) {
        md += `| \`${issue.check}\` | ${issue.count} |\n`;
      }
      md += '\n';
    }
  }

  // All URLs
  md += `## All URLs\n\n`;
  md += `| URL | Score | Status |\n|-----|-------|--------|\n`;
  for (const url of (results.urls || [])) {
    const icon = url.auditScore >= 90 ? '✅' : url.auditScore >= 50 ? '⚠️' : '❌';
    md += `| ${url.path} | ${url.auditScore}% | ${icon} |\n`;
  }

  // Internal pages
  if (results.internal && results.internal.count > 0) {
    md += `\n## Internal Pages (not in sitemap)\n\n`;
    md += `*${results.internal.count} routes not in sitemap*\n\n`;
    const id = results.internal.distribution;
    md += `| Passing | Warning | Failing |\n|---------|---------|--------|\n`;
    md += `| ${id.passing} | ${id.warning} | ${id.failing} |\n`;
  }

  return md;
}

/**
 * Markdown Table - Simple condensed format
 */
function markdownTable(results, options = {}) {
  let md = `| URL | Score | Issues |\n|-----|-------|--------|\n`;

  for (const url of (results.urls || [])) {
    const issueCount = url.issues ? url.issues.length : 0;
    md += `| ${url.path} | ${url.auditScore}% | ${issueCount} |\n`;
  }

  return md;
}

/**
 * Markdown Badges - Shield.io compatible
 */
function markdownBadges(results, options = {}) {
  const d = results.distribution;
  const passRate = Math.round((d.passing / results.urlCount) * 100) || 0;

  let color = 'red';
  if (passRate >= 90) color = 'brightgreen';
  else if (passRate >= 70) color = 'green';
  else if (passRate >= 50) color = 'yellow';
  else if (passRate >= 30) color = 'orange';

  let md = '';
  md += `![mat-a11y](https://img.shields.io/badge/mat--a11y-${passRate}%25-${color})\n`;
  md += `![URLs](https://img.shields.io/badge/URLs-${results.urlCount}-blue)\n`;
  md += `![Passing](https://img.shields.io/badge/Passing-${d.passing}-brightgreen)\n`;
  md += `![Warning](https://img.shields.io/badge/Warning-${d.warning}-yellow)\n`;
  md += `![Failing](https://img.shields.io/badge/Failing-${d.failing}-red)\n`;

  return md;
}

/**
 * HTML Dashboard - Full interactive page
 */
function htmlDashboard(results, options = {}) {
  const title = options.title || 'mat-a11y Report';
  const d = results.distribution;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; color: #333; line-height: 1.6; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; margin-bottom: 30px; border-radius: 8px; }
    .header h1 { font-size: 2.5em; margin-bottom: 10px; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
    .stat { background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .stat .value { font-size: 3em; font-weight: bold; }
    .stat .label { color: #666; }
    .stat.passing .value { color: #22c55e; }
    .stat.warning .value { color: #eab308; }
    .stat.failing .value { color: #ef4444; }
    .section { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .section h2 { margin-bottom: 15px; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f8f9fa; font-weight: 600; }
    tr:hover { background: #f8f9fa; }
    .score { font-weight: bold; padding: 4px 8px; border-radius: 4px; }
    .score.pass { background: #dcfce7; color: #166534; }
    .score.warn { background: #fef3c7; color: #92400e; }
    .score.fail { background: #fee2e2; color: #991b1b; }
    .bar { height: 24px; border-radius: 4px; display: flex; overflow: hidden; margin-top: 10px; }
    .bar-pass { background: #22c55e; }
    .bar-warn { background: #eab308; }
    .bar-fail { background: #ef4444; }
    .footer { text-align: center; color: #666; padding: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔍 ${title}</h1>
      <p>Tier: ${results.tier.toUpperCase()} | ${results.urlCount} URLs analyzed</p>
    </div>

    <div class="stats">
      <div class="stat"><div class="value">${results.urlCount}</div><div class="label">URLs Analyzed</div></div>
      <div class="stat passing"><div class="value">${d.passing}</div><div class="label">Passing</div></div>
      <div class="stat warning"><div class="value">${d.warning}</div><div class="label">Warning</div></div>
      <div class="stat failing"><div class="value">${d.failing}</div><div class="label">Failing</div></div>
    </div>

    <div class="section">
      <h2>Distribution</h2>
      <div class="bar">
        <div class="bar-pass" style="width: ${(d.passing / results.urlCount * 100) || 0}%"></div>
        <div class="bar-warn" style="width: ${(d.warning / results.urlCount * 100) || 0}%"></div>
        <div class="bar-fail" style="width: ${(d.failing / results.urlCount * 100) || 0}%"></div>
      </div>
    </div>

    <div class="section">
      <h2>All URLs</h2>
      <table>
        <thead><tr><th>URL</th><th>Score</th><th>Issues</th></tr></thead>
        <tbody>
${(results.urls || []).map(url => {
  const cls = url.auditScore >= 90 ? 'pass' : url.auditScore >= 50 ? 'warn' : 'fail';
  return `          <tr><td>${url.path}</td><td><span class="score ${cls}">${url.auditScore}%</span></td><td>${url.issues?.length || 0}</td></tr>`;
}).join('\n')}
        </tbody>
      </table>
    </div>

    <div class="footer">
      Generated by mat-a11y on ${new Date().toISOString()}
    </div>
  </div>
</body>
</html>`;
}

/**
 * CSV - Spreadsheet compatible
 */
function csv(results, options = {}) {
  const delimiter = options.delimiter || ',';
  const lines = [];

  // Header
  lines.push(['URL', 'Score', 'Status', 'Issues', 'Top Issue', 'Files'].join(delimiter));

  // Rows
  for (const url of (results.urls || [])) {
    const status = url.auditScore >= 90 ? 'passing' : url.auditScore >= 50 ? 'warning' : 'failing';
    const topIssue = url.issues && url.issues[0] ? url.issues[0].check : '';
    const files = url.files ? url.files.join(';') : '';

    lines.push([
      `"${url.path}"`,
      url.auditScore,
      status,
      url.issues ? url.issues.length : 0,
      topIssue,
      `"${files}"`
    ].join(delimiter));
  }

  return lines.join('\n');
}

/**
 * TSV - Tab-separated (Excel-friendly)
 */
function tsv(results, options = {}) {
  return csv(results, { delimiter: '\t' });
}

/**
 * XLSX-compatible JSON
 * Can be easily converted to Excel
 */
function xlsx(results, options = {}) {
  const sheets = {
    Summary: [
      { Metric: 'URLs Analyzed', Value: results.urlCount },
      { Metric: 'Passing', Value: results.distribution.passing },
      { Metric: 'Warning', Value: results.distribution.warning },
      { Metric: 'Failing', Value: results.distribution.failing },
      { Metric: 'Tier', Value: results.tier },
      { Metric: 'Generated', Value: new Date().toISOString() }
    ],
    URLs: (results.urls || []).map(url => ({
      URL: url.path,
      Score: url.auditScore,
      Status: url.auditScore >= 90 ? 'passing' : url.auditScore >= 50 ? 'warning' : 'failing',
      Issues: url.issues ? url.issues.length : 0,
      Component: url.component || ''
    })),
    Issues: []
  };

  // Flatten issues
  for (const url of (results.urls || [])) {
    for (const issue of (url.issues || [])) {
      sheets.Issues.push({
        URL: url.path,
        Check: issue.check,
        File: issue.file,
        Line: issue.line || 1,
        Message: issue.message.replace(/^\[(Error|Warning|Info)\]\s*/, '')
      });
    }
  }

  return JSON.stringify(sheets, null, 2);
}

/**
 * Confluence Wiki Markup
 * @see https://confluence.atlassian.com/doc/confluence-wiki-markup-251003035.html
 */
function confluence(results, options = {}) {
  let wiki = `h1. mat-a11y Accessibility Report\n\n`;

  wiki += `{info}Tier: ${results.tier} | URLs: ${results.urlCount} | Generated: ${new Date().toISOString()}{info}\n\n`;

  // Summary panel
  const d = results.distribution;
  wiki += `{panel:title=Summary}\n`;
  wiki += `||Metric||Value||\n`;
  wiki += `|URLs Analyzed|${results.urlCount}|\n`;
  wiki += `|Passing|{color:green}${d.passing}{color}|\n`;
  wiki += `|Warning|{color:orange}${d.warning}{color}|\n`;
  wiki += `|Failing|{color:red}${d.failing}{color}|\n`;
  wiki += `{panel}\n\n`;

  // URLs table
  wiki += `h2. All URLs\n\n`;
  wiki += `||URL||Score||Status||\n`;
  for (const url of (results.urls || [])) {
    const status = url.auditScore >= 90 ? '{color:green}✓{color}' :
                   url.auditScore >= 50 ? '{color:orange}⚠{color}' : '{color:red}✗{color}';
    wiki += `|${url.path}|${url.auditScore}%|${status}|\n`;
  }

  return wiki;
}

/**
 * Jira Markdown
 */
function jira(results, options = {}) {
  let text = `h2. mat-a11y Accessibility Report\n\n`;

  const d = results.distribution;
  text += `||Metric||Value||\n`;
  text += `|URLs|${results.urlCount}|\n`;
  text += `|Passing|${d.passing}|\n`;
  text += `|Warning|${d.warning}|\n`;
  text += `|Failing|${d.failing}|\n\n`;

  if (d.failing > 0) {
    text += `h3. Failing URLs\n\n`;
    for (const url of results.urls.filter(u => u.auditScore < 50)) {
      text += `* *${url.path}* (${url.auditScore}%)\n`;
    }
  }

  return text;
}

/**
 * Notion Markdown
 */
function notion(results, options = {}) {
  // Notion uses standard markdown with some extras
  let md = markdown(results, options);

  // Add Notion-specific callouts
  const d = results.distribution;
  let callout = '';
  if (d.failing > 0) {
    callout = `> ❌ **${d.failing} URLs are failing** and need immediate attention.\n\n`;
  } else if (d.warning > 0) {
    callout = `> ⚠️ **${d.warning} URLs need work** but none are critically failing.\n\n`;
  } else {
    callout = `> ✅ **All ${d.passing} URLs are passing!**\n\n`;
  }

  return callout + md;
}

/**
 * PDF-ready HTML
 * Optimized for PDF generation with puppeteer/wkhtmltopdf
 */
function pdf(results, options = {}) {
  const html = htmlDashboard(results, options);
  // Add print-friendly styles
  return html.replace('</style>', `
    @media print {
      body { background: white; }
      .container { max-width: 100%; padding: 0; }
      .header { break-after: avoid; }
      .section { break-inside: avoid; }
    }
  </style>`);
}

module.exports = {
  markdown,
  'markdown-table': markdownTable,
  'markdown-badges': markdownBadges,
  'html-dashboard': htmlDashboard,
  csv,
  tsv,
  xlsx,
  confluence,
  jira,
  notion,
  pdf
};
