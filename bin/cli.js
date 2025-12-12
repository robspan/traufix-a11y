#!/usr/bin/env node

// mat-a11y CLI
// Angular Material accessibility linter.
// KEINE GEWÄHR - Use at your own risk.

const fs = require('fs');
const path = require('path');
const { analyze, analyzeByRoute, formatConsoleOutput, formatRouteResults, TIERS, DEFAULT_CONFIG } = require('../src/index.js');
const { analyzeBySitemap, formatSitemapResults, findSitemap } = require('../src/core/sitemapAnalyzer.js');

// ANSI colors
const c = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
};

// Parse args
function parseArgs(args) {
  const options = {
    files: [],
    tier: 'material',
    format: 'console',
    verbose: false,
    help: false,
    version: false,
    output: null,
    ignore: [],
    check: null,  // Single check mode
    listChecks: false,
    verified: false,    // --verified or combined --full-verified
    workers: null,      // --workers <n|auto>
    selfTest: false,    // --self-test
    jsonReport: false,  // --json: write mat-a11y-report.json
    htmlReport: false,  // --html: write mat-a11y-report.html
    fileBased: false    // --file-based: use old file-based analysis instead of route-based
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--version' || arg === '-v') options.version = true;
    else if (arg === '--verbose' || arg === '-V') options.verbose = true;
    else if (arg === '--basic' || arg === '-b') options.tier = 'basic';
    else if (arg === '--material' || arg === '-m') options.tier = 'material';
    else if (arg === '--angular' || arg === '-a') options.tier = 'angular';
    else if (arg === '--full' || arg === '-F') options.tier = 'full';
    else if (arg === '--tier' || arg === '-t') options.tier = args[++i] || 'material';
    else if (arg === '--format' || arg === '-f') options.format = args[++i] || 'console';
    else if (arg === '--output' || arg === '-o') options.output = args[++i];
    else if (arg === '--ignore' || arg === '-i') options.ignore.push(args[++i]);
    else if (arg === '--check' || arg === '-c') options.check = args[++i];
    else if (arg === '--list-checks' || arg === '-l') options.listChecks = true;
    else if (arg === '--verified') options.verified = true;
    else if (arg === '--full-verified') { options.tier = 'full'; options.verified = true; }
    else if (arg === '--workers' || arg === '-w') {
      const val = args[++i];
      options.workers = val === 'auto' ? 'auto' : parseInt(val, 10);
    }
    else if (arg === '--self-test') options.selfTest = true;
    else if (arg === '--json') options.jsonReport = true;
    else if (arg === '--html') options.htmlReport = true;
    else if (arg === '--file-based') options.fileBased = true;
    else if (!arg.startsWith('-')) options.files.push(arg);
  }

  return options;
}

// Help
function showHelp() {
  const basicCount = TIERS.basic.html.length + TIERS.basic.scss.length +
                     TIERS.basic.angular.length + TIERS.basic.material.length + TIERS.basic.cdk.length;
  const materialCount = TIERS.material.material.length;
  const angularCount = TIERS.angular.angular.length + TIERS.angular.cdk.length;
  const fullCount = TIERS.full.html.length + TIERS.full.scss.length +
                    TIERS.full.angular.length + TIERS.full.material.length + TIERS.full.cdk.length;

  console.log(`
${c.bold}mat-a11y${c.reset} - Angular Material Accessibility Linter

${c.cyan}USAGE:${c.reset}
  mat-a11y [options] <directory|file>

${c.cyan}TIERS:${c.reset}
  ${c.green}-b, --basic${c.reset}      Quick wins across all categories (${basicCount} checks) ${c.dim}[default]${c.reset}
  ${c.green}-m, --material${c.reset}   ONLY mat-* component checks (${materialCount} checks)
  ${c.green}-a, --angular${c.reset}    ONLY Angular + CDK checks (${angularCount} checks)
  ${c.green}-F, --full${c.reset}       Everything (${fullCount} checks)

${c.cyan}OPTIONS:${c.reset}
  -h, --help            Show this help
  -v, --version         Show version
  -V, --verbose         Verbose output
  -t, --tier <tier>     Set tier: basic, material, angular, full
  -i, --ignore <path>   Ignore pattern (can repeat)
  -c, --check <name>    Run only a single specific check
  -l, --list-checks     List all available checks

${c.cyan}REPORTS:${c.reset}
  --json                Write mat-a11y-report.json (for CI/CD pipelines)
  --html                Write mat-a11y-report.html (for stakeholders)

${c.cyan}ANALYSIS MODE:${c.reset}
  ${c.dim}Default: Sitemap-based (exactly what Google crawls)${c.reset}
  --file-based          Use legacy file-based analysis instead

  Analysis priority:
  1. sitemap.xml found → Analyze URLs Google will crawl (SEO focus)
  2. No sitemap → Fall back to Angular route analysis
  3. No routes → Fall back to file-based analysis

${c.cyan}VERIFICATION:${c.reset}
  --verified            Verify checks work before running (self-test)
  --full-verified       Full tier + verification (recommended for CI)
  --self-test           Only run self-test (no file analysis)

${c.cyan}PARALLELIZATION:${c.reset}
  -w, --workers <n>     Number of parallel workers (default: auto)
                        Use 'auto' for CPU count, or a number

${c.cyan}EXAMPLES:${c.reset}
  ${c.dim}# Quick wins check (default)${c.reset}
  mat-a11y ./src/app

  ${c.dim}# Only Material component checks${c.reset}
  mat-a11y ./src --material

  ${c.dim}# Only Angular/CDK checks${c.reset}
  mat-a11y ./src --angular

  ${c.dim}# Full audit${c.reset}
  mat-a11y ./src --full

  ${c.dim}# Generate JSON report for CI/CD${c.reset}
  mat-a11y ./src --json

  ${c.dim}# Run single check${c.reset}
  mat-a11y ./src --check matFormFieldLabel

  ${c.dim}# Verified full audit (recommended for CI)${c.reset}
  mat-a11y ./src --full-verified --json

${c.cyan}TIERS EXPLAINED:${c.reset}
  ${c.bold}BASIC (${basicCount} checks)${c.reset} ${c.green}[default]${c.reset}
    Quick wins - highest value/effort ratio across all categories.
    Best checks from HTML, SCSS, Angular, Material, and CDK.

  ${c.bold}MATERIAL (${materialCount} checks)${c.reset}
    ONLY Angular Material component checks.
    mat-form-field, mat-icon, mat-dialog, mat-table, etc.

  ${c.bold}ANGULAR (${angularCount} checks)${c.reset}
    ONLY Angular template + CDK accessibility checks.
    Click handlers, routerLink, focus trapping, live announcer.

  ${c.bold}FULL (${fullCount} checks)${c.reset}
    Complete audit - all 82 checks.
    HTML, SCSS, Angular, Material, and CDK.

${c.cyan}DEFAULT IGNORES:${c.reset}
  ${DEFAULT_CONFIG.ignore.join(', ')}

${c.yellow}DISCLAIMER:${c.reset}
  This software is provided "as is" without warranty.
  No guarantee of completeness or correctness.

${c.dim}https://github.com/robspan/mat-a11y${c.reset}
`);
}

// Version
function showVersion() {
  const pkg = require('../package.json');
  console.log('mat-a11y v' + pkg.version);
}

// JSON format
function formatJSON(results) {
  return JSON.stringify(results, null, 2);
}

// HTML format for sitemap-based results
function formatSitemapHTML(results) {
  const d = results.distribution;

  // Generate URL table
  let urlsHtml = '<table style="width:100%;border-collapse:collapse;margin:1rem 0"><thead>' +
    '<tr style="background:#f5f5f5"><th style="padding:0.75rem;text-align:left;border-bottom:2px solid #ddd">URL</th>' +
    '<th style="padding:0.75rem;text-align:right;border-bottom:2px solid #ddd">Score</th>' +
    '<th style="padding:0.75rem;text-align:right;border-bottom:2px solid #ddd">Audits</th></tr></thead><tbody>';

  for (const url of results.urls.slice(0, 50)) {
    const color = url.auditScore >= 90 ? '#22c55e' : url.auditScore >= 50 ? '#f59e0b' : '#ef4444';
    urlsHtml += '<tr style="border-bottom:1px solid #eee">' +
      '<td style="padding:0.75rem">' + url.path + '</td>' +
      '<td style="padding:0.75rem;text-align:right;font-weight:bold;color:' + color + '">' + url.auditScore + '%</td>' +
      '<td style="padding:0.75rem;text-align:right">' + url.auditsPassed + '/' + url.auditsTotal + '</td></tr>';
  }
  urlsHtml += '</tbody></table>';

  if (results.urls.length > 50) {
    urlsHtml += '<p style="color:#666;font-size:0.875rem">...and ' + (results.urls.length - 50) + ' more URLs</p>';
  }

  // Generate fix priorities
  let prioritiesHtml = '';
  if (results.worstUrls && results.worstUrls.length > 0) {
    prioritiesHtml = '<h3>Fix Priorities (Sitemap URLs)</h3><ol>';
    for (let i = 0; i < Math.min(5, results.worstUrls.length); i++) {
      const worst = results.worstUrls[i];
      if (worst.score >= 90) continue;
      prioritiesHtml += '<li><strong>' + worst.path + '</strong> (' + worst.score + '%)<ul>';
      for (const issue of worst.topIssues) {
        prioritiesHtml += '<li>' + issue.check + ': ' + issue.count + ' errors</li>';
      }
      prioritiesHtml += '</ul></li>';
    }
    prioritiesHtml += '</ol>';
  }

  // Generate internal routes section
  let internalHtml = '';
  if (results.internal && results.internal.count > 0) {
    const id = results.internal.distribution;
    internalHtml = '<h2 style="margin-top:3rem;padding-top:2rem;border-top:2px solid #e5e5e5">Internal Routes (not in sitemap)</h2>' +
      '<p style="color:#666;font-size:0.875rem">' + results.internal.count + ' routes found that are not in sitemap.xml. ' +
      'These pages won\'t be crawled by Google but may still be accessed by users.</p>' +
      '<div class="distribution">' +
      '<div class="dist-card passing"><div class="dist-value" style="color:#22c55e">' + id.passing + '</div>' +
      '<div class="dist-label">Passing (90-100%)</div></div>' +
      '<div class="dist-card warning"><div class="dist-value" style="color:#f59e0b">' + id.warning + '</div>' +
      '<div class="dist-label">Needs Work (50-89%)</div></div>' +
      '<div class="dist-card failing"><div class="dist-value" style="color:#ef4444">' + id.failing + '</div>' +
      '<div class="dist-label">Failing (&lt;50%)</div></div>' +
      '</div>';

    // Internal routes table
    if (results.internal.routes && results.internal.routes.length > 0) {
      internalHtml += '<h3>Internal Routes</h3>' +
        '<table style="width:100%;border-collapse:collapse;margin:1rem 0"><thead>' +
        '<tr style="background:#f5f5f5"><th style="padding:0.75rem;text-align:left;border-bottom:2px solid #ddd">Route</th>' +
        '<th style="padding:0.75rem;text-align:right;border-bottom:2px solid #ddd">Score</th>' +
        '<th style="padding:0.75rem;text-align:right;border-bottom:2px solid #ddd">Audits</th></tr></thead><tbody>';

      for (const route of results.internal.routes.slice(0, 30)) {
        const color = route.auditScore >= 90 ? '#22c55e' : route.auditScore >= 50 ? '#f59e0b' : '#ef4444';
        internalHtml += '<tr style="border-bottom:1px solid #eee">' +
          '<td style="padding:0.75rem">' + route.path + '</td>' +
          '<td style="padding:0.75rem;text-align:right;font-weight:bold;color:' + color + '">' + route.auditScore + '%</td>' +
          '<td style="padding:0.75rem;text-align:right">' + route.auditsPassed + '/' + route.auditsTotal + '</td></tr>';
      }
      internalHtml += '</tbody></table>';

      if (results.internal.routes.length > 30) {
        internalHtml += '<p style="color:#666;font-size:0.875rem">...and ' + (results.internal.routes.length - 30) + ' more internal routes</p>';
      }
    }

    // Worst internal routes
    if (results.internal.worstRoutes && results.internal.worstRoutes.length > 0) {
      internalHtml += '<h3>Fix Priorities (Internal Routes)</h3><ol>';
      for (let i = 0; i < Math.min(5, results.internal.worstRoutes.length); i++) {
        const worst = results.internal.worstRoutes[i];
        if (worst.score >= 90) continue;
        internalHtml += '<li><strong>' + worst.path + '</strong> (' + worst.score + '%)<ul>';
        for (const issue of (worst.topIssues || [])) {
          internalHtml += '<li>' + issue.check + ': ' + issue.count + ' errors</li>';
        }
        internalHtml += '</ul></li>';
      }
      internalHtml += '</ol>';
    }
  }

  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>mat-a11y Accessibility Report</title>' +
    '<style>body{font-family:system-ui;max-width:1000px;margin:2rem auto;padding:1rem}' +
    '.distribution{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin:2rem 0}' +
    '.dist-card{padding:1.5rem;border-radius:12px;text-align:center}' +
    '.dist-card.passing{background:#f0fdf4;border:2px solid #22c55e}' +
    '.dist-card.warning{background:#fffbeb;border:2px solid #f59e0b}' +
    '.dist-card.failing{background:#fef2f2;border:2px solid #ef4444}' +
    '.dist-value{font-size:2.5rem;font-weight:bold}' +
    '.dist-label{font-size:0.875rem;color:#666;margin-top:0.5rem}' +
    'h2{margin-top:2rem}h3{margin-top:2rem;margin-bottom:1rem}' +
    '.disclaimer{background:#fffbeb;border:1px solid #f59e0b;padding:1rem;margin-top:2rem;border-radius:4px;font-size:0.875rem}' +
    '</style></head><body>' +
    '<h1>mat-a11y Accessibility Report</h1>' +
    '<h2>Sitemap URLs (' + results.urlCount + ' pages)</h2>' +
    '<p>Tier: ' + (results.tier || 'material').toUpperCase() + '</p>' +
    '<p style="color:#666;font-size:0.875rem">These are the pages Google will crawl. Each URL is scored independently.</p>' +
    '<div class="distribution">' +
    '<div class="dist-card passing"><div class="dist-value" style="color:#22c55e">' + d.passing + '</div>' +
    '<div class="dist-label">Passing (90-100%)</div></div>' +
    '<div class="dist-card warning"><div class="dist-value" style="color:#f59e0b">' + d.warning + '</div>' +
    '<div class="dist-label">Needs Work (50-89%)</div></div>' +
    '<div class="dist-card failing"><div class="dist-value" style="color:#ef4444">' + d.failing + '</div>' +
    '<div class="dist-label">Failing (&lt;50%)</div></div>' +
    '</div>' +
    '<h3>All Sitemap URLs</h3>' + urlsHtml +
    prioritiesHtml +
    internalHtml +
    '<div class="disclaimer"><strong>Disclaimer:</strong> This analysis is provided "as is" without warranty of any kind. ' +
    'No guarantee of completeness, correctness, or fitness for a particular purpose.</div>' +
    '<footer style="margin-top:2rem;color:#666;font-size:0.875rem">Generated by mat-a11y | ' + new Date().toISOString() + '</footer>' +
    '</body></html>';
}

// HTML format for route-based results
function formatRouteHTML(results) {
  // Score distribution - Google scores each page independently
  const passing = results.routes.filter(r => r.auditScore >= 90).length;
  const warning = results.routes.filter(r => r.auditScore >= 50 && r.auditScore < 90).length;
  const failing = results.routes.filter(r => r.auditScore < 50).length;

  // Generate routes table
  let routesHtml = '<table style="width:100%;border-collapse:collapse;margin:1rem 0"><thead>' +
    '<tr style="background:#f5f5f5"><th style="padding:0.75rem;text-align:left;border-bottom:2px solid #ddd">Route</th>' +
    '<th style="padding:0.75rem;text-align:right;border-bottom:2px solid #ddd">Score</th>' +
    '<th style="padding:0.75rem;text-align:right;border-bottom:2px solid #ddd">Audits</th></tr></thead><tbody>';

  for (const route of results.routes.slice(0, 30)) {
    const color = route.auditScore >= 90 ? '#22c55e' : route.auditScore >= 50 ? '#f59e0b' : '#ef4444';
    routesHtml += '<tr style="border-bottom:1px solid #eee">' +
      '<td style="padding:0.75rem">' + route.path + '</td>' +
      '<td style="padding:0.75rem;text-align:right;font-weight:bold;color:' + color + '">' + route.auditScore + '%</td>' +
      '<td style="padding:0.75rem;text-align:right">' + route.auditsPassed + '/' + route.auditsTotal + '</td></tr>';
  }
  routesHtml += '</tbody></table>';

  if (results.routes.length > 30) {
    routesHtml += '<p style="color:#666;font-size:0.875rem">...and ' + (results.routes.length - 30) + ' more routes</p>';
  }

  // Generate fix priorities
  let prioritiesHtml = '';
  if (results.worstRoutes && results.worstRoutes.length > 0) {
    prioritiesHtml = '<h3>Fix Priorities</h3><ol>';
    for (let i = 0; i < Math.min(5, results.worstRoutes.length); i++) {
      const worst = results.worstRoutes[i];
      if (worst.score >= 90) continue;
      prioritiesHtml += '<li><strong>' + worst.path + '</strong> (' + worst.score + '%)<ul>';
      for (const issue of worst.topIssues) {
        prioritiesHtml += '<li>' + issue.check + ': ' + issue.count + ' errors</li>';
      }
      prioritiesHtml += '</ul></li>';
    }
    prioritiesHtml += '</ol>';
  }

  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>mat-a11y Route Report</title>' +
    '<style>body{font-family:system-ui;max-width:1000px;margin:2rem auto;padding:1rem}' +
    '.distribution{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin:2rem 0}' +
    '.dist-card{padding:1.5rem;border-radius:12px;text-align:center}' +
    '.dist-card.passing{background:#f0fdf4;border:2px solid #22c55e}' +
    '.dist-card.warning{background:#fffbeb;border:2px solid #f59e0b}' +
    '.dist-card.failing{background:#fef2f2;border:2px solid #ef4444}' +
    '.dist-value{font-size:2.5rem;font-weight:bold}' +
    '.dist-label{font-size:0.875rem;color:#666;margin-top:0.5rem}' +
    'h3{margin-top:2rem;margin-bottom:1rem}' +
    '.disclaimer{background:#fffbeb;border:1px solid #f59e0b;padding:1rem;margin-top:2rem;border-radius:4px;font-size:0.875rem}' +
    '</style></head><body>' +
    '<h1>mat-a11y Route Analysis Report</h1>' +
    '<p>Tier: ' + (results.tier || 'material').toUpperCase() + ' | ' + results.routeCount + ' routes analyzed</p>' +
    '<p style="color:#666;font-size:0.875rem">Google scores each page independently. Routes below 50% will hurt search rankings.</p>' +
    '<div class="distribution">' +
    '<div class="dist-card passing"><div class="dist-value" style="color:#22c55e">' + passing + '</div>' +
    '<div class="dist-label">Passing (90-100%)</div></div>' +
    '<div class="dist-card warning"><div class="dist-value" style="color:#f59e0b">' + warning + '</div>' +
    '<div class="dist-label">Needs Work (50-89%)</div></div>' +
    '<div class="dist-card failing"><div class="dist-value" style="color:#ef4444">' + failing + '</div>' +
    '<div class="dist-label">Failing (&lt;50%)</div></div>' +
    '</div>' +
    '<h3>All Routes</h3>' + routesHtml +
    prioritiesHtml +
    '<div class="disclaimer"><strong>Disclaimer:</strong> This analysis is provided "as is" without warranty of any kind. ' +
    'No guarantee of completeness, correctness, or fitness for a particular purpose.</div>' +
    '<footer style="margin-top:2rem;color:#666;font-size:0.875rem">Generated by mat-a11y | ' + new Date().toISOString() + '</footer>' +
    '</body></html>';
}

// HTML format
function formatHTML(results) {
  const s = results.summary;
  const auditScore = s.auditScore || 0;
  const coverageRate = s.elementsChecked > 0
    ? ((s.elementsPassed / s.elementsChecked) * 100).toFixed(1)
    : '100.0';
  const hasIssues = s.issues.length > 0;
  const auditColor = auditScore >= 90 ? '#22c55e' : auditScore >= 50 ? '#f59e0b' : '#ef4444';
  const coverageColor = parseFloat(coverageRate) >= 90 ? '#22c55e' : parseFloat(coverageRate) >= 50 ? '#f59e0b' : '#ef4444';

  // Top failing audits
  let topIssuesHtml = '';
  if (s.audits && s.auditsFailed > 0) {
    const failingAudits = s.audits.filter(a => !a.passed).slice(0, 5);
    topIssuesHtml = '<h3>Top Issues to Fix</h3><ul>';
    for (const audit of failingAudits) {
      topIssuesHtml += '<li><strong>' + audit.name + '</strong>: ' + audit.issues + ' issues (fix for +' + audit.weight + ' audit points)</li>';
    }
    topIssuesHtml += '</ul>';
  }

  let issuesHtml = '';
  if (s.issues.length === 0) {
    issuesHtml = '<div class="success">Keine Probleme gefunden! / No issues found!</div>';
  } else {
    for (const issue of s.issues) {
      issuesHtml += '<div class="issue"><strong>' + issue.file + '</strong> [' + issue.check + ']<br>' + issue.message + '</div>';
    }
  }

  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>mat-a11y Report</title>' +
    '<style>body{font-family:system-ui;max-width:900px;margin:2rem auto;padding:1rem}' +
    '.scores{display:grid;grid-template-columns:1fr 1fr;gap:2rem;margin:2rem 0}' +
    '.score-card{background:#f5f5f5;padding:1.5rem;border-radius:12px;text-align:center}' +
    '.score-value{font-size:3rem;font-weight:bold}' +
    '.score-label{font-size:1rem;color:#666;margin-top:0.5rem}' +
    '.score-detail{font-size:0.875rem;color:#888;margin-top:0.25rem}' +
    '.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin:1rem 0}' +
    '.stat{background:#fff;border:1px solid #e5e5e5;padding:1rem;border-radius:8px;text-align:center}' +
    '.stat-value{font-size:1.5rem;font-weight:bold}' +
    '.stat-label{font-size:0.75rem;color:#666}' +
    '.issue{background:#fef2f2;border-left:3px solid #ef4444;padding:0.75rem;margin:0.5rem 0;border-radius:0 4px 4px 0;font-size:0.875rem}' +
    '.success{background:#f0fdf4;border-left:3px solid #22c55e;padding:1rem;border-radius:4px}' +
    '.disclaimer{background:#fffbeb;border:1px solid #f59e0b;padding:1rem;margin-top:2rem;border-radius:4px;font-size:0.875rem}' +
    'h3{margin-top:2rem;margin-bottom:1rem}' +
    '</style></head><body>' +
    '<h1>mat-a11y Accessibility Report</h1>' +
    '<p>Tier: ' + (results.tier || 'material').toUpperCase() + ' | Files: ' + s.totalFiles + '</p>' +
    '<div class="scores">' +
    '<div class="score-card"><div class="score-value" style="color:' + auditColor + '">' + auditScore + '%</div>' +
    '<div class="score-label">Audit Score</div>' +
    '<div class="score-detail">' + s.auditsPassed + '/' + s.auditsTotal + ' audits passing</div></div>' +
    '<div class="score-card"><div class="score-value" style="color:' + coverageColor + '">' + coverageRate + '%</div>' +
    '<div class="score-label">Element Coverage</div>' +
    '<div class="score-detail">' + s.elementsPassed + '/' + s.elementsChecked + ' elements OK</div></div>' +
    '</div>' +
    '<div class="stats">' +
    '<div class="stat"><div class="stat-value">' + s.elementsChecked + '</div><div class="stat-label">Elements Checked</div></div>' +
    '<div class="stat"><div class="stat-value" style="color:#22c55e">' + s.elementsPassed + '</div><div class="stat-label">Passed</div></div>' +
    '<div class="stat"><div class="stat-value" style="color:#ef4444">' + s.elementsFailed + '</div><div class="stat-label">Failed</div></div>' +
    '</div>' +
    topIssuesHtml +
    '<h3>' + (hasIssues ? s.issues.length + ' Issues Found' : 'All Clear!') + '</h3>' +
    issuesHtml +
    '<div class="disclaimer"><strong>Haftungsausschluss:</strong> Diese Analyse wird ohne Gewähr bereitgestellt. ' +
    'Keine Garantie für Vollständigkeit, Richtigkeit oder Eignung. Nutzung auf eigene Verantwortung.<br>' +
    '<strong>Disclaimer:</strong> This analysis is provided "as is" without warranty of any kind.</div>' +
    '<footer style="margin-top:2rem;color:#666;font-size:0.875rem">Generated by mat-a11y v4.0.0 | ' + new Date().toISOString() + '</footer>' +
    '</body></html>';
}

// List all available checks
function listChecks() {
  console.log('\n' + c.bold + 'AVAILABLE CHECKS' + c.reset + '\n');

  const countTier = (tier) => {
    return tier.html.length + tier.scss.length + tier.angular.length + tier.material.length + tier.cdk.length;
  };

  console.log(c.cyan + 'BASIC TIER (quick wins):' + c.reset + c.green + ' [default]' + c.reset);
  if (TIERS.basic.html.length) console.log('  HTML: ' + TIERS.basic.html.join(', '));
  if (TIERS.basic.scss.length) console.log('  SCSS: ' + TIERS.basic.scss.join(', '));
  if (TIERS.basic.angular.length) console.log('  Angular: ' + TIERS.basic.angular.join(', '));
  if (TIERS.basic.material.length) console.log('  Material: ' + TIERS.basic.material.join(', '));
  if (TIERS.basic.cdk.length) console.log('  CDK: ' + TIERS.basic.cdk.join(', '));
  console.log('  ' + c.dim + 'Total: ' + countTier(TIERS.basic) + ' checks' + c.reset);

  console.log('\n' + c.cyan + 'MATERIAL TIER (mat-* only):' + c.reset);
  console.log('  Material: ' + TIERS.material.material.join(', '));
  console.log('  ' + c.dim + 'Total: ' + TIERS.material.material.length + ' checks' + c.reset);

  console.log('\n' + c.cyan + 'ANGULAR TIER (Angular + CDK only):' + c.reset);
  console.log('  Angular: ' + TIERS.angular.angular.join(', '));
  console.log('  CDK: ' + TIERS.angular.cdk.join(', '));
  console.log('  ' + c.dim + 'Total: ' + (TIERS.angular.angular.length + TIERS.angular.cdk.length) + ' checks' + c.reset);

  console.log('\n' + c.cyan + 'FULL TIER (everything):' + c.reset);
  console.log('  HTML: ' + TIERS.full.html.join(', '));
  console.log('  SCSS: ' + TIERS.full.scss.join(', '));
  console.log('  Angular: ' + TIERS.full.angular.join(', '));
  console.log('  Material: ' + TIERS.full.material.join(', '));
  console.log('  CDK: ' + TIERS.full.cdk.join(', '));
  console.log('  ' + c.dim + 'Total: ' + countTier(TIERS.full) + ' checks' + c.reset);

  console.log('\n' + c.bold + 'SUMMARY:' + c.reset);
  console.log('  basic=' + countTier(TIERS.basic) + ', material=' + TIERS.material.material.length +
              ', angular=' + (TIERS.angular.angular.length + TIERS.angular.cdk.length) +
              ', full=' + countTier(TIERS.full) + '\n');
}

// Main
async function main() {
  const args = process.argv.slice(2);
  const opts = parseArgs(args);

  if (opts.help) { showHelp(); process.exit(0); }
  if (opts.version) { showVersion(); process.exit(0); }
  if (opts.listChecks) { listChecks(); process.exit(0); }

  // Self-test only mode
  if (opts.selfTest) {
    console.log(c.cyan + 'Running self-test...' + c.reset + '\n');
    let exitCode = 0;

    // Part 1: Verify accessibility checks
    console.log(c.bold + 'PART 1: Accessibility Checks' + c.reset);
    const { verifyByTier, getVerifySummary, formatVerifyResults } = require('../src/core/verifier');
    const checkResults = verifyByTier(opts.tier);
    const checkSummary = getVerifySummary(checkResults);
    console.log(formatVerifyResults(checkResults));

    if (checkSummary.failed > 0) {
      exitCode = 1;
    }

    // Part 2: Verify formatters
    console.log('\n' + c.bold + 'PART 2: Output Formatters' + c.reset);
    const {
      verifyAllFormatters,
      formatVerifyResults: formatFormatterResults,
      getVerifySummary: getFormatterSummary
    } = require('../src/formatters/verifyFormatters');
    const formatterResults = verifyAllFormatters();
    const formatterSummary = getFormatterSummary(formatterResults);
    console.log(formatFormatterResults(formatterResults));

    if (formatterSummary.failed > 0) {
      exitCode = 1;
    }

    // Final summary
    console.log(c.bold + 'SELF-TEST SUMMARY' + c.reset);
    console.log('  Checks:     ' + (checkSummary.failed === 0 ? c.green + 'PASS' : c.red + 'FAIL') + c.reset +
                ' (' + checkSummary.verified + '/' + checkSummary.total + ')');
    console.log('  Formatters: ' + (formatterSummary.failed === 0 ? c.green + 'PASS' : c.red + 'FAIL') + c.reset +
                ' (' + formatterSummary.passed + '/' + formatterSummary.total + ')');
    console.log('');

    process.exit(exitCode);
  }

  if (opts.files.length === 0) {
    console.error(c.red + 'Error: No path specified' + c.reset);
    console.log('Usage: mat-a11y <directory>');
    console.log('       mat-a11y --help');
    process.exit(2);
  }

  // Merge ignore patterns
  const ignore = [...DEFAULT_CONFIG.ignore, ...opts.ignore];

  if (opts.verbose) {
    console.log(c.cyan + 'Tier: ' + opts.tier.toUpperCase() + c.reset);
    console.log(c.cyan + 'Ignoring: ' + ignore.join(', ') + c.reset + '\n');
  }

  // Show worker info if parallel mode enabled
  if (opts.workers) {
    const workerCount = opts.workers === 'auto'
      ? require('os').cpus().length
      : opts.workers;
    console.log(c.cyan + 'Initializing ' + workerCount + ' workers...' + c.reset);
  }

  let results;
  let useFileBased = opts.fileBased;
  let usedMode = 'file-based';

  // Try sitemap-based analysis first (default for SEO)
  if (!useFileBased) {
    const sitemapPath = findSitemap(opts.files[0]);

    if (sitemapPath) {
      usedMode = 'sitemap';
      const sitemapResults = analyzeBySitemap(opts.files[0], {
        tier: opts.tier,
        sitemap: sitemapPath
      });

      if (!sitemapResults.error && sitemapResults.urlCount > 0) {
        // Use sitemap-based results
        console.log(formatSitemapResults(sitemapResults));

        // Write JSON report if requested
        if (opts.jsonReport) {
          const jsonPath = 'mat-a11y-report.json';
          fs.writeFileSync(jsonPath, formatJSON(sitemapResults));
          console.log(c.green + 'JSON report: ' + jsonPath + c.reset);
        }

        // Write HTML report if requested
        if (opts.htmlReport) {
          const htmlPath = 'mat-a11y-report.html';
          fs.writeFileSync(htmlPath, formatSitemapHTML(sitemapResults));
          console.log(c.green + 'HTML report: ' + htmlPath + c.reset);
        }

        // Exit based on failing URLs
        const exitCode = sitemapResults.distribution.failing > 0 ? 1 : 0;
        process.exit(exitCode);
      }
    }

    // No sitemap - try route-based
    console.log(c.yellow + 'No sitemap.xml found. Trying route-based analysis...' + c.reset + '\n');

    const routeResults = analyzeByRoute(opts.files[0], {
      tier: opts.tier
    });

    if (routeResults.error || routeResults.routeCount === 0) {
      // Fall back to file-based if no routes found
      console.log(c.yellow + 'No Angular routes found. Using file-based analysis.' + c.reset + '\n');
      useFileBased = true;
    } else {
      usedMode = 'route-based';
      // Use route-based results
      console.log(formatRouteResults(routeResults));

      // Write JSON report if requested
      if (opts.jsonReport) {
        const jsonPath = 'mat-a11y-report.json';
        fs.writeFileSync(jsonPath, formatJSON(routeResults));
        console.log(c.green + 'JSON report: ' + jsonPath + c.reset);
      }

      // Write HTML report if requested
      if (opts.htmlReport) {
        const htmlPath = 'mat-a11y-report.html';
        fs.writeFileSync(htmlPath, formatRouteHTML(routeResults));
        console.log(c.green + 'HTML report: ' + htmlPath + c.reset);
      }

      // Exit based on failing routes
      const failing = routeResults.routes.filter(r => r.auditScore < 50).length;
      const exitCode = failing > 0 ? 1 : 0;
      process.exit(exitCode);
    }
  }

  // File-based analysis (fallback or explicit --file-based)
  if (useFileBased) {
    usedMode = 'file-based';
    results = await analyze(opts.files[0], {
      tier: opts.tier,
      ignore: ignore,
      verbose: opts.verbose,
      check: opts.check,
      verified: opts.verified,
      workers: opts.workers
    });

    // Single check mode - show result clearly
    if (opts.check) {
      console.log('\n' + c.bold + 'Single Check Mode: ' + opts.check + c.reset + '\n');
    }

    // Output to console
    console.log(formatConsoleOutput(results));

    // Write JSON report if requested
    if (opts.jsonReport) {
      const jsonPath = 'mat-a11y-report.json';
      fs.writeFileSync(jsonPath, formatJSON(results));
      console.log(c.green + 'JSON report: ' + jsonPath + c.reset);
    }

    // Write HTML report if requested
    if (opts.htmlReport) {
      const htmlPath = 'mat-a11y-report.html';
      fs.writeFileSync(htmlPath, formatHTML(results));
      console.log(c.green + 'HTML report: ' + htmlPath + c.reset);
    }

    process.exit(results.summary.issues.length > 0 ? 1 : 0);
  }
}

// Make main async
main().catch(err => {
  console.error(c.red + 'Error: ' + err.message + c.reset);
  process.exit(2);
});
