#!/usr/bin/env node

// mat-a11y CLI
// Angular Material accessibility linter.
// KEINE GEWÄHR - Use at your own risk.

const fs = require('fs');
const path = require('path');
const { analyze, analyzeByRoute, formatConsoleOutput, formatRouteResults, TIERS, DEFAULT_CONFIG } = require('../src/index.js');
const { analyzeBySitemap, formatSitemapResults, findSitemap } = require('../src/core/sitemapAnalyzer.js');
const { analyzeByComponent, analyzeByComponentAsync, formatComponentResults } = require('../src/core/componentAnalyzer.js');
const { loadAllFormatters, listFormatters } = require('../src/formatters/index.js');
const { optimizeIssues, getOptimizationSummary } = require('../src/core/issueOptimizer.js');

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
    tier: 'full',           // Default to full scan
    format: 'ai',           // Default to AI output
    verbose: false,
    help: false,
    version: false,
    output: null,           // Default set after parsing unless --output is used
    outputExplicit: false,
    ignore: [],
    check: null,  // Single check mode
    listChecks: false,
    verified: false,    // --verified or combined --full-verified
    workers: 'sync',    // --workers <auto|sync|n> - sync is default for consistent object return
    selfTest: false,    // --self-test
    fileBased: false,   // --file-based: use old file-based analysis instead of component-based
    sitemapBased: false, // --sitemap: use sitemap-based analysis (for SEO/Google crawling view)
    deepResolve: false,  // --deep: bundle parent + child components (Lighthouse-like)
    collapseRootCause: true  // --no-collapse: disable SCSS root cause analysis
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
    else if (arg === '--output' || arg === '-o') { options.output = args[++i]; options.outputExplicit = true; }
    else if (arg === '--ignore' || arg === '-i') options.ignore.push(args[++i]);
    else if (arg === '--check' || arg === '-c') options.check = args[++i];
    else if (arg === '--list-checks' || arg === '-l') options.listChecks = true;
    else if (arg === '--verified') options.verified = true;
    else if (arg === '--full-verified') { options.tier = 'full'; options.verified = true; }
    // === FORMAT SHORTCUTS (all do full scan on src, auto output filename) ===
    // CI/CD
    else if (arg === '--sarif') { options.format = 'sarif'; if (!options.outputExplicit) options.output = '_mat-a11y.sarif.json'; }
    else if (arg === '--junit') { options.format = 'junit'; if (!options.outputExplicit) options.output = '_mat-a11y.junit.xml'; }
    else if (arg === '--github') { options.format = 'github-annotations'; if (!options.outputExplicit) options.output = '_mat-a11y.github.txt'; }
    else if (arg === '--gitlab') { options.format = 'gitlab-codequality'; if (!options.outputExplicit) options.output = '_mat-a11y.gitlab.json'; }
    // Code Quality
    else if (arg === '--sonar') { options.format = 'sonarqube'; if (!options.outputExplicit) options.output = '_mat-a11y.sonar.json'; }
    else if (arg === '--checkstyle') { options.format = 'checkstyle'; if (!options.outputExplicit) options.output = '_mat-a11y.checkstyle.xml'; }
    // Monitoring
    else if (arg === '--prometheus') { options.format = 'prometheus'; if (!options.outputExplicit) options.output = '_mat-a11y.prom'; }
    else if (arg === '--grafana') { options.format = 'grafana-json'; if (!options.outputExplicit) options.output = '_mat-a11y.grafana.json'; }
    else if (arg === '--datadog') { options.format = 'datadog'; if (!options.outputExplicit) options.output = '_mat-a11y.datadog.json'; }
    // Notifications
    else if (arg === '--slack') { options.format = 'slack'; if (!options.outputExplicit) options.output = '_mat-a11y.slack.json'; }
    else if (arg === '--discord') { options.format = 'discord'; if (!options.outputExplicit) options.output = '_mat-a11y.discord.json'; }
    else if (arg === '--teams') { options.format = 'teams'; if (!options.outputExplicit) options.output = '_mat-a11y.teams.json'; }
    // Docs
    else if (arg === '--markdown' || arg === '--md') { options.format = 'markdown'; if (!options.outputExplicit) options.output = '_mat-a11y.md'; }
    else if (arg === '--csv') { options.format = 'csv'; if (!options.outputExplicit) options.output = '_mat-a11y.csv'; }
    // Data / Reports
    else if (arg === '--json') { options.format = 'json'; if (!options.outputExplicit) options.output = '_mat-a11y.json'; }
    else if (arg === '--html') { options.format = 'html'; if (!options.outputExplicit) options.output = '_mat-a11y.html'; }
    // === END FORMAT SHORTCUTS ===
    else if (arg === '--workers' || arg === '-w') {
      const val = args[++i];
      if (val === 'auto' || val === 'sync') {
        options.workers = val;
      } else {
        options.workers = parseInt(val, 10) || 'sync';
      }
    }
    else if (arg === '--self-test') options.selfTest = true;
    else if (arg === '--file-based') options.fileBased = true;
    else if (arg === '--sitemap') options.sitemapBased = true;
    else if (arg === '--deep') options.deepResolve = true;
    else if (arg === '--no-collapse') options.collapseRootCause = false;
    else if (!arg.startsWith('-')) options.files.push(arg);
  }

  // Default to project root if no path specified
  if (options.files.length === 0 && !options.help && !options.version && !options.listChecks && !options.selfTest) {
    options.files.push('.');
  }

  // Default output filename if none provided and not already set by a shortcut.
  // For other formats, CLI later derives a sensible extension-based filename.
  if (!options.outputExplicit && !options.output) {
    if (options.format === 'ai') options.output = '_mat-a11y.backlog.txt';
    else if (options.format === 'json') options.output = '_mat-a11y.json';
    else if (options.format === 'html') options.output = '_mat-a11y.html';
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
  ${c.green}npx mat-a11y${c.reset}           ${c.dim}# → _mat-a11y.backlog.txt (AI format)${c.reset}
  ${c.green}npx mat-a11y --html${c.reset}    ${c.dim}# → _mat-a11y.html${c.reset}
  ${c.green}npx mat-a11y --json${c.reset}    ${c.dim}# → _mat-a11y.json${c.reset}

${c.cyan}ALL 17 FORMATS:${c.reset}
  ${c.dim}(default)${c.reset}       AI backlog     ${c.green}--html${c.reset}        HTML report    ${c.green}--json${c.reset}        JSON data
  ${c.green}--sarif${c.reset}         GitHub         ${c.green}--junit${c.reset}       Jenkins/CI     ${c.green}--gitlab${c.reset}      GitLab
  ${c.green}--sonar${c.reset}         SonarQube      ${c.green}--checkstyle${c.reset}  Checkstyle     ${c.green}--github${c.reset}      GH Annotations
  ${c.green}--prometheus${c.reset}    Prometheus     ${c.green}--grafana${c.reset}     Grafana        ${c.green}--datadog${c.reset}     Datadog
  ${c.green}--slack${c.reset}         Slack          ${c.green}--discord${c.reset}     Discord        ${c.green}--teams${c.reset}       MS Teams
  ${c.green}--markdown${c.reset}      Markdown       ${c.green}--csv${c.reset}         CSV/Excel

${c.cyan}TIERS:${c.reset}
  ${c.green}-b, --basic${c.reset}      Quick wins across all categories (${basicCount} checks)
  ${c.green}-m, --material${c.reset}   ONLY mat-* component checks (${materialCount} checks)
  ${c.green}-a, --angular${c.reset}    ONLY Angular + CDK checks (${angularCount} checks)
  ${c.green}-F, --full${c.reset}       Everything (${fullCount} checks) ${c.dim}[default]${c.reset}

${c.cyan}OPTIONS:${c.reset}
  -h, --help            Show this help
  -v, --version         Show version
  -V, --verbose         Verbose output
  -t, --tier <tier>     Set tier: basic, material, angular, full
  -i, --ignore <path>   Ignore pattern (can repeat)
  -c, --check <name>    Run only a single specific check
  -l, --list-checks     List all available checks
  -o, --output <path>   Custom output path

${c.cyan}ANALYSIS MODE:${c.reset}
  ${c.dim}Default: Component-level (scans all @Component files directly)${c.reset}
  --sitemap             Sitemap-based analysis (for SEO/Google crawling view)
  --file-based          Legacy file-based analysis (scans HTML/SCSS files only)
  --deep                Bundle parent + child components (Lighthouse-like scores)
  --no-collapse         Disable SCSS root cause collapse (show all duplicates)

  ${c.dim}Note: Default mode scans ALL Angular components for complete coverage.
  Use --sitemap for Google-crawl perspective.${c.reset}

${c.cyan}VERIFICATION:${c.reset}
  --verified            Verify checks work before running (self-test)
  --full-verified       Full tier + verification (recommended for CI)
  --self-test           Only run self-test (no file analysis)

${c.cyan}PARALLELIZATION:${c.reset}
  -w, --workers <mode>  sync (default), auto, or number of workers

${c.cyan}EXAMPLES:${c.reset}
  ${c.dim}# Default: AI backlog (scans current directory)${c.reset}
  mat-a11y

  ${c.dim}# Other formats${c.reset}
  mat-a11y --html
  mat-a11y --json
  mat-a11y --sarif
  mat-a11y --junit

  ${c.dim}# Custom path${c.reset}
  mat-a11y ./my-app/src

  ${c.dim}# Custom output filename${c.reset}
  mat-a11y -o my-report.backlog.txt

  ${c.dim}# Fewer checks (faster)${c.reset}
  mat-a11y --basic
  mat-a11y --material

  ${c.dim}# Single check${c.reset}
  mat-a11y -c matIconAccessibility

${c.cyan}DEFAULTS:${c.reset}
  Path:    . (current directory)
  Tier:    --full (82 checks)
  Format:  AI backlog
  Output:  _mat-a11y.backlog.txt

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

  // Self-test only mode (dev-only - requires full repo with dev/)
  if (opts.selfTest) {
    // Check if dev exists (only in git repo, not npm package)
    const devToolsPath = path.join(__dirname, '..', 'dev');
    if (!fs.existsSync(devToolsPath)) {
      console.log(c.yellow + 'Self-test is a development feature.' + c.reset);
      console.log('');
      console.log('To run self-test, clone the repository:');
      console.log('  git clone https://github.com/nicobrinkkemper/mat-a11y');
      console.log('  cd mat-a11y');
      console.log('  npm test');
      console.log('');
      console.log('Or run: node dev/run-checks.js');
      process.exit(0);
    }

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
    } = require('../dev/verify-formatters');
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

  // Show worker info
  if (opts.workers !== 'sync') {
    if (opts.workers === 'auto') {
      console.log(c.cyan + 'Workers: auto (optimized based on file count)' + c.reset);
    } else {
      console.log(c.cyan + 'Workers: ' + opts.workers + c.reset);
    }
  }

  let results;

  // Sitemap-based analysis (explicit --sitemap flag)
  if (opts.sitemapBased) {
    const sitemapPath = findSitemap(opts.files[0]);

    if (sitemapPath) {
      const sitemapResults = analyzeBySitemap(opts.files[0], {
        tier: opts.tier,
        sitemap: sitemapPath,
        deepResolve: opts.deepResolve
      });

      if (!sitemapResults.error && sitemapResults.urlCount > 0) {
        // Optimize issues by collapsing to root cause
        const optimizedSitemapResults = optimizeIssues(sitemapResults, opts.files[0], {
          enabled: opts.collapseRootCause
        });
        
        const summary = getOptimizationSummary(optimizedSitemapResults);
        if (summary) console.log(c.cyan + summary + c.reset + '\n');
        
        console.log(formatSitemapResults(optimizedSitemapResults));

        // Write custom format if requested
        if (opts.format && opts.format !== 'console') {
          const formatters = loadAllFormatters();
          const formatter = formatters.get(opts.format);
          if (formatter) {
            const outputPath = opts.output || `mat-a11y-report${formatter.fileExtension || '.txt'}`;
            fs.writeFileSync(outputPath, formatter.format(optimizedSitemapResults));
            console.log(c.green + `${opts.format} report: ${outputPath}` + c.reset);
          } else {
            console.error(c.red + `Unknown format: ${opts.format}` + c.reset);
            console.log('Available formats: ' + listFormatters().join(', '));
          }
        }

        const exitCode = sitemapResults.distribution.failing > 0 ? 1 : 0;
        process.exit(exitCode);
      }
    }

    console.error(c.red + 'No sitemap.xml found. Use default mode or --file-based.' + c.reset);
    process.exit(2);
  }

  // File-based analysis (explicit --file-based flag)
  if (opts.fileBased) {
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

    // Optimize issues by collapsing to root cause
    const optimizedResults = optimizeIssues(results, opts.files[0], {
      enabled: opts.collapseRootCause
    });
    
    const summary = getOptimizationSummary(optimizedResults);
    if (summary) console.log(c.cyan + summary + c.reset);

    // Write custom format if requested
    if (opts.format && opts.format !== 'console') {
      const formatters = loadAllFormatters();
      const formatter = formatters.get(opts.format);
      if (formatter) {
        const outputPath = opts.output || `mat-a11y-report${formatter.fileExtension || '.txt'}`;
        fs.writeFileSync(outputPath, formatter.format(optimizedResults));
        console.log(c.green + `${opts.format} report: ${outputPath}` + c.reset);
      } else {
        console.error(c.red + `Unknown format: ${opts.format}` + c.reset);
        console.log('Available formats: ' + listFormatters().join(', '));
      }
    }

    process.exit(results.summary.issues.length > 0 ? 1 : 0);
  }

  // Default: Component-based analysis (scans all @Component files)
  // Use async version if workers are specified for parallelism
  let componentResults;
  if (opts.workers !== 'sync') {
    componentResults = await analyzeByComponentAsync(opts.files[0], {
      tier: opts.tier,
      ignore: ignore,
      workers: opts.workers
    });
  } else {
    componentResults = analyzeByComponent(opts.files[0], {
      tier: opts.tier,
      ignore: ignore
    });
  }

  if (componentResults.error) {
    console.error(c.red + componentResults.error + c.reset);
    process.exit(2);
  }

  // Output to console
  console.log(formatComponentResults(componentResults));

  // Optimize issues by collapsing to root cause
  const optimizedComponentResults = optimizeIssues(componentResults, opts.files[0], {
    enabled: opts.collapseRootCause
  });
  
  const compSummary = getOptimizationSummary(optimizedComponentResults);
  if (compSummary) console.log(c.cyan + compSummary + c.reset);

  // Write custom format if requested
  if (opts.format && opts.format !== 'console') {
    const formatters = loadAllFormatters();
    const formatter = formatters.get(opts.format);
    if (formatter) {
      const outputPath = opts.output || `mat-a11y-report${formatter.fileExtension || '.txt'}`;
      fs.writeFileSync(outputPath, formatter.format(optimizedComponentResults));
      console.log(c.green + `${opts.format} report: ${outputPath}` + c.reset);
    } else {
      console.error(c.red + `Unknown format: ${opts.format}` + c.reset);
      console.log('Available formats: ' + listFormatters().join(', '));
    }
  }

  process.exit(componentResults.totalIssues > 0 ? 1 : 0);
}

// Make main async
main().catch(err => {
  console.error(c.red + 'Error: ' + err.message + c.reset);
  process.exit(2);
});
