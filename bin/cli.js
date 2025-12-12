#!/usr/bin/env node

// mat-a11y CLI
// Angular Material accessibility linter.
// KEINE GEWÄHR - Use at your own risk.

const fs = require('fs');
const path = require('path');
const { analyze, formatConsoleOutput, TIERS, DEFAULT_CONFIG } = require('../src/index.js');

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
    htmlReport: false   // --html: write mat-a11y-report.html
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--version' || arg === '-v') options.version = true;
    else if (arg === '--verbose' || arg === '-V') options.verbose = true;
    else if (arg === '--basic' || arg === '-b') options.tier = 'basic';
    else if (arg === '--material' || arg === '-m') options.tier = 'material';
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
    else if (!arg.startsWith('-')) options.files.push(arg);
  }

  return options;
}

// Help
function showHelp() {
  const basicCount = TIERS.basic.html.length + TIERS.basic.scss.length +
                     TIERS.basic.material.length;
  const materialCount = TIERS.material.html.length + TIERS.material.scss.length +
                        TIERS.material.angular.length + TIERS.material.material.length +
                        TIERS.material.cdk.length;
  const fullCount = TIERS.full.html.length + TIERS.full.scss.length +
                    TIERS.full.angular.length + TIERS.full.material.length + TIERS.full.cdk.length;

  console.log(`
${c.bold}mat-a11y${c.reset} - Angular Material Accessibility Linter

${c.cyan}USAGE:${c.reset}
  mat-a11y [options] <directory|file>

${c.cyan}TIERS:${c.reset}
  ${c.green}-b, --basic${c.reset}      Quick lint (~${basicCount} checks) - Fast CI checks
  ${c.green}-m, --material${c.reset}   Material mode (~${materialCount} checks) - All mat-* + Angular ${c.dim}[default]${c.reset}
  ${c.green}-F, --full${c.reset}       Full audit (${fullCount} checks) - Maximum coverage

${c.cyan}OPTIONS:${c.reset}
  -h, --help            Show this help
  -v, --version         Show version
  -V, --verbose         Verbose output
  -t, --tier <tier>     Set tier: basic, material, full
  -i, --ignore <path>   Ignore pattern (can repeat)
  -c, --check <name>    Run only a single specific check
  -l, --list-checks     List all available checks

${c.cyan}REPORTS:${c.reset}
  --json                Write mat-a11y-report.json (for CI/CD pipelines)
  --html                Write mat-a11y-report.html (for stakeholders)

${c.cyan}VERIFICATION:${c.reset}
  --verified            Verify checks work before running (self-test)
  --full-verified       Full tier + verification (recommended for CI)
  --self-test           Only run self-test (no file analysis)

${c.cyan}PARALLELIZATION:${c.reset}
  -w, --workers <n>     Number of parallel workers (default: auto)
                        Use 'auto' for CPU count, or a number

${c.cyan}EXAMPLES:${c.reset}
  ${c.dim}# Run accessibility check${c.reset}
  mat-a11y ./src/app

  ${c.dim}# Quick basic check${c.reset}
  mat-a11y ./src --basic

  ${c.dim}# Full audit${c.reset}
  mat-a11y ./src --full

  ${c.dim}# Generate JSON report for CI/CD${c.reset}
  mat-a11y ./src --json

  ${c.dim}# Generate HTML report for stakeholders${c.reset}
  mat-a11y ./src --html

  ${c.dim}# Both reports${c.reset}
  mat-a11y ./src --json --html

  ${c.dim}# Run single check${c.reset}
  mat-a11y ./src --check matFormFieldLabel

  ${c.dim}# Verified full audit (recommended for CI)${c.reset}
  mat-a11y ./src --full-verified --json

${c.cyan}TIERS EXPLAINED:${c.reset}
  ${c.bold}BASIC (~${basicCount} checks)${c.reset}
    Quick lint for CI. Core HTML + essential Material.
    HTML: buttons, images, forms, ARIA, headings
    Material: mat-form-field, mat-icon

  ${c.bold}MATERIAL (~${materialCount} checks)${c.reset} ${c.green}[default]${c.reset}
    All Angular Material components + Angular patterns.
    + All mat-* components: forms, buttons, tables, dialogs...
    + Angular: click handlers, routerLink, ngFor
    + CDK: focus trapping, live announcer

  ${c.bold}FULL (${fullCount} checks)${c.reset}
    Complete audit. Everything + deep HTML/SCSS checks.
    + All HTML: meta tags, skip links, media, tables
    + All SCSS: animations, font sizes, line heights

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

  console.log(c.cyan + 'BASIC TIER:' + c.reset);
  console.log('  HTML: ' + TIERS.basic.html.join(', '));
  console.log('  SCSS: ' + TIERS.basic.scss.join(', '));
  console.log('  Material: ' + TIERS.basic.material.join(', '));

  console.log('\n' + c.cyan + 'MATERIAL TIER (default):' + c.reset);
  console.log('  HTML: ' + TIERS.material.html.join(', '));
  console.log('  SCSS: ' + TIERS.material.scss.join(', '));
  console.log('  Angular: ' + TIERS.material.angular.join(', '));
  console.log('  Material: ' + TIERS.material.material.join(', '));
  console.log('  CDK: ' + TIERS.material.cdk.join(', '));

  console.log('\n' + c.cyan + 'FULL TIER (additional):' + c.reset);
  const fullHtmlExtra = TIERS.full.html.filter(ch => !TIERS.material.html.includes(ch));
  const fullScssExtra = TIERS.full.scss.filter(ch => !TIERS.material.scss.includes(ch));
  const fullAngularExtra = TIERS.full.angular.filter(ch => !TIERS.material.angular.includes(ch));
  console.log('  + HTML: ' + fullHtmlExtra.join(', '));
  console.log('  + SCSS: ' + fullScssExtra.join(', '));
  console.log('  + Angular: ' + fullAngularExtra.join(', '));

  const totalBasic = TIERS.basic.html.length + TIERS.basic.scss.length + TIERS.basic.material.length;
  const totalMaterial = TIERS.material.html.length + TIERS.material.scss.length +
                        TIERS.material.angular.length + TIERS.material.material.length +
                        TIERS.material.cdk.length;
  const totalFull = TIERS.full.html.length + TIERS.full.scss.length +
                    TIERS.full.angular.length + TIERS.full.material.length + TIERS.full.cdk.length;

  console.log('\n' + c.dim + 'Total: basic=' + totalBasic + ', material=' + totalMaterial + ', full=' + totalFull + c.reset + '\n');
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
    console.log(c.cyan + 'Running self-test...' + c.reset);
    const { verifyByTier, getVerifySummary, formatVerifyResults } = require('../src/core/verifier');
    const results = verifyByTier(opts.tier);
    const summary = getVerifySummary(results);
    console.log(formatVerifyResults(results));
    process.exit(summary.failed > 0 ? 1 : 0);
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

  // Run analysis with new options
  const results = await analyze(opts.files[0], {
    tier: opts.tier,
    ignore: ignore,
    verbose: opts.verbose,
    check: opts.check,  // Single check mode
    verified: opts.verified,
    workers: opts.workers
  });

  // Single check mode - show result clearly
  if (opts.check) {
    console.log('\n' + c.bold + 'Single Check Mode: ' + opts.check + c.reset + '\n');
  }

  // Always output to console
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

// Make main async
main().catch(err => {
  console.error(c.red + 'Error: ' + err.message + c.reset);
  process.exit(2);
});
