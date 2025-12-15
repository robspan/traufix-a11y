/**
 * mat-a11y
 *
 * Angular Material accessibility linter.
 * 82 WCAG checks for mat-* components, Angular templates & SCSS.
 * Static analysis with color contrast calculation.
 *
 * HAFTUNGSAUSSCHLUSS / DISCLAIMER:
 * Diese Software wird "wie besehen" ohne jegliche Gewaehrleistung bereitgestellt.
 * Keine Garantie fuer Vollstaendigkeit, Richtigkeit oder Eignung fuer bestimmte Zwecke.
 * Nutzung auf eigene Verantwortung. / Use at your own risk.
 *
 * @license MIT
 */

const fs = require('fs');
const path = require('path');
const colors = require('./colors');

// Import modular architecture
const { loadAllChecks, getChecksByTier, getCheck } = require('./core/loader');
const { verifyByTier, getVerifySummary } = require('./core/verifier');
const { CheckRunner, createRunner } = require('./core/runner');
const { WEIGHTS, getWeight, calculateAuditScore } = require('./core/weights');

// Import route-based analysis
const { analyzeByRoute, formatRouteResults } = require('./core/routeAnalyzer');

// Import sitemap-based analysis
const { analyzeBySitemap, formatSitemapResults, findSitemap } = require('./core/sitemapAnalyzer');

// Import component-based analysis
const { analyzeByComponent, formatComponentResults } = require('./core/componentAnalyzer');

// Import output formatters
const formatters = require('./formatters');

// ============================================
// CHECK REGISTRY (New Modular System)
// ============================================

/**
 * Cached check registry from new loader
 * @type {Map<string, object>|null}
 */
let checkRegistry = null;

/**
 * Get or initialize the check registry
 * @returns {Map<string, object>} Check registry
 */
function getRegistry() {
  if (!checkRegistry) {
    checkRegistry = loadAllChecks();
  }
  return checkRegistry;
}


// ============================================
// TIERS CONFIGURATION
// ============================================

/**
 * Generate TIERS from loaded checks for backwards compatibility
 * @returns {object} Tiers configuration object
 */
function generateTiersFromRegistry() {
  const registry = getRegistry();

  const tiers = {
    basic: { html: [], scss: [], angular: [], material: [], cdk: [] },
    material: { html: [], scss: [], angular: [], material: [], cdk: [] },
    full: { html: [], scss: [], angular: [], material: [], cdk: [] }
  };

  // Tier hierarchy - each tier includes checks from lower tiers
  const tierHierarchy = {
    basic: ['basic'],
    material: ['basic', 'material'],
    full: ['basic', 'material', 'full']
  };

  for (const [name, module] of registry) {
    const type = module.type || 'html';
    const checkTier = module.tier || 'basic';

    // Determine category based on name patterns or type
    let category = type; // default: 'html' or 'scss'

    // Categorize by name patterns (for backwards compat)
    if (name.startsWith('mat') || name.includes('Material')) {
      category = 'material';
    } else if (name.startsWith('cdk') || name.includes('Cdk')) {
      category = 'cdk';
    } else if (name.includes('click') || name.includes('router') || name.includes('ngFor') ||
               name.includes('innerHtml') || name.includes('asyncPipe')) {
      category = 'angular';
    }

    // Add to appropriate tiers based on hierarchy
    for (const [tierName, includedTiers] of Object.entries(tierHierarchy)) {
      if (includedTiers.includes(checkTier)) {
        if (!tiers[tierName][category]) {
          tiers[tierName][category] = [];
        }
        if (!tiers[tierName][category].includes(name)) {
          tiers[tierName][category].push(name);
        }
      }
    }
  }

  return tiers;
}

/**
 * TIERS Configuration
 *
 * - basic: Quick wins, best value/effort across all categories (~20 checks)
 * - material: ONLY mat-* component checks (29 checks)
 * - angular: ONLY Angular + CDK checks (10 checks)
 * - full: Everything (82 checks) - Complete audit
 */
const STATIC_TIERS = {
  // Quick wins - highest value/effort ratio across all categories
  basic: {
    html: [
      'buttonNames', 'imageAlt', 'formLabels', 'linkNames',
      'ariaRoles', 'ariaAttributes', 'uniqueIds', 'headingOrder'
    ],
    scss: ['colorContrast', 'focusStyles'],
    angular: ['clickWithoutKeyboard'],
    material: ['matFormFieldLabel', 'matIconAccessibility', 'matDialogFocus'],
    cdk: ['cdkTrapFocusDialog']
  },

  // ONLY Angular Material component checks
  material: {
    html: [],
    scss: [],
    angular: [],
    material: [
      // Form Controls
      'matFormFieldLabel', 'matSelectPlaceholder', 'matAutocompleteLabel',
      'matDatepickerLabel', 'matRadioGroupLabel', 'matSlideToggleLabel',
      'matCheckboxLabel', 'matChipListLabel', 'matSliderLabel',
      // Buttons & Indicators
      'matButtonType', 'matIconAccessibility', 'matButtonToggleLabel',
      'matProgressBarLabel', 'matProgressSpinnerLabel', 'matBadgeDescription',
      // Navigation & Layout
      'matMenuTrigger', 'matSidenavA11y', 'matTabLabel', 'matStepLabel',
      'matExpansionHeader', 'matTreeA11y', 'matListSelectionLabel',
      // Data Table
      'matTableHeaders', 'matPaginatorLabel', 'matSortHeaderAnnounce',
      // Popups & Modals
      'matDialogFocus', 'matBottomSheetA11y', 'matTooltipKeyboard', 'matSnackbarPoliteness'
    ],
    cdk: []
  },

  // ONLY Angular template + CDK checks
  angular: {
    html: [],
    scss: [],
    angular: [
      'clickWithoutKeyboard', 'clickWithoutRole', 'routerLinkNames',
      'ngForTrackBy', 'innerHtmlUsage', 'asyncPipeAria', 'autofocusUsage'
    ],
    material: [],
    cdk: ['cdkTrapFocusDialog', 'cdkAriaDescriber', 'cdkLiveAnnouncer']
  },

  full: {
    html: [
      'buttonNames', 'imageAlt', 'formLabels', 'ariaRoles', 'ariaAttributes',
      'uniqueIds', 'headingOrder', 'linkNames', 'listStructure', 'dlStructure',
      'tableHeaders', 'iframeTitles', 'videoCaptions', 'objectAlt',
      'accesskeyUnique', 'tabindex', 'ariaHiddenBody',
      'htmlHasLang', 'metaViewport', 'skipLink', 'inputImageAlt',
      'autoplayMedia', 'marqueeElement', 'blinkElement',
      'metaRefresh', 'duplicateIdAria', 'emptyTableHeader',
      'scopeAttrMisuse', 'formFieldName'
    ],
    scss: [
      'colorContrast', 'focusStyles', 'touchTargets',
      'outlineNoneWithoutAlt', 'prefersReducedMotion', 'userSelectNone',
      'pointerEventsNone', 'visibilityHiddenUsage',
      'focusWithinSupport', 'hoverWithoutFocus', 'contentOverflow',
      'smallFontSize', 'lineHeightTight', 'textJustify'
    ],
    angular: [
      'clickWithoutKeyboard', 'clickWithoutRole', 'routerLinkNames',
      'ngForTrackBy', 'innerHtmlUsage', 'asyncPipeAria', 'autofocusUsage'
    ],
    material: [
      'matFormFieldLabel', 'matSelectPlaceholder', 'matAutocompleteLabel',
      'matDatepickerLabel', 'matRadioGroupLabel', 'matSlideToggleLabel',
      'matCheckboxLabel', 'matChipListLabel', 'matSliderLabel',
      'matButtonType', 'matIconAccessibility', 'matButtonToggleLabel',
      'matProgressBarLabel', 'matProgressSpinnerLabel', 'matBadgeDescription',
      'matMenuTrigger', 'matSidenavA11y', 'matTabLabel', 'matStepLabel',
      'matExpansionHeader', 'matTreeA11y', 'matListSelectionLabel',
      'matTableHeaders', 'matPaginatorLabel', 'matSortHeaderAnnounce',
      'matDialogFocus', 'matBottomSheetA11y', 'matTooltipKeyboard', 'matSnackbarPoliteness'
    ],
    cdk: ['cdkTrapFocusDialog', 'cdkAriaDescriber', 'cdkLiveAnnouncer']
  },

};

/**
 * Get effective TIERS configuration
 * Uses STATIC_TIERS which has the correct tier assignments
 * (dynamic generation was broken because check modules have inconsistent tier properties)
 */
function getTiers() {
  return STATIC_TIERS;
}

// Export TIERS - use getter to allow dynamic updates
const TIERS = new Proxy(STATIC_TIERS, {
  get(target, prop) {
    const dynamicTiers = getTiers();
    return dynamicTiers[prop] || target[prop];
  }
});

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  tier: 'material',
  ignore: ['node_modules', '.git', 'dist', 'build', '.angular', 'coverage'],
  extensions: {
    html: ['.html', '.htm'],
    scss: ['.scss', '.css']
  },
  verbose: false,
  outputFormat: 'console',
  // New options
  verified: false,  // Run self-test first
  workers: 'sync',  // Parallel execution ('sync' default for API compatibility, 'auto', or number)
  check: null       // Single check mode
};

// ============================================
// CHECK FUNCTION RESOLUTION
// ============================================

/**
 * Get check function by name from modular registry
 * @param {string} name - Check name (e.g., 'buttonNames')
 * @returns {Function|null} Check function or null if not found
 */
function getCheckFunction(name) {
  const registry = getRegistry();
  const checkModule = registry.get(name);
  if (checkModule && typeof checkModule.check === 'function') {
    return checkModule.check;
  }
  return null;
}

/**
 * Get information about a check
 * @param {string} name - Check name
 * @returns {object|null} Check info or null if not found
 */
function getCheckInfo(name) {
  const registry = getRegistry();
  const checkModule = registry.get(name);
  if (checkModule) {
    return {
      name: checkModule.name,
      description: checkModule.description,
      tier: checkModule.tier,
      type: checkModule.type,
      weight: checkModule.weight || 1,
      wcag: checkModule.wcag || null
    };
  }
  return null;
}

// ============================================
// RESULT STRUCTURE
// ============================================

/**
 * Result structure
 */
class CheckResult {
  constructor(name, passed, issues = [], elementsFound = 0) {
    this.name = name;
    this.passed = passed;
    this.issues = issues;
    this.count = issues.length;
    this.elementsFound = elementsFound;
  }
}

// ============================================
// FILE UTILITIES
// ============================================

/**
 * Run a single check safely
 */
function runCheck(name, content, filePath) {
  const checkFn = getCheckFunction(name);
  if (!checkFn) {
    return new CheckResult(name, true, [], 0); // Skip unknown checks
  }

  try {
    const result = checkFn(content);
    const elementsFound = result.elementsFound || 0;
    return new CheckResult(name, result.pass, result.issues || [], elementsFound);
  } catch (error) {
    return new CheckResult(name, true, [], 0); // Skip on error
  }
}

/**
 * Find files recursively
 */
function findFiles(dir, extensions, ignore) {
  const files = [];

  function walk(currentDir) {
    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (e) {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      // Check ignore patterns
      let shouldIgnore = false;
      for (const pattern of ignore) {
        if (fullPath.includes(pattern) || entry.name === pattern) {
          shouldIgnore = true;
          break;
        }
      }
      if (shouldIgnore) continue;

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }

  try {
    const stat = fs.statSync(dir);
    if (stat.isDirectory()) {
      walk(dir);
    } else if (stat.isFile()) {
      files.push(dir);
    }
  } catch (e) {
    // Path doesn't exist
  }

  return files;
}

/**
 * Find files and read their content (for parallel runner)
 * @param {string} targetPath - Path to analyze
 * @param {object} config - Configuration
 * @returns {Array<{path: string, content: string}>} Files with content
 */
function findFilesWithContent(targetPath, config) {
  const allExtensions = [...config.extensions.html, ...config.extensions.scss];
  const files = findFiles(targetPath, allExtensions, config.ignore);

  return files.map(filePath => {
    try {
      return {
        path: filePath,
        content: fs.readFileSync(filePath, 'utf-8')
      };
    } catch (e) {
      return null;
    }
  }).filter(Boolean);
}

// ============================================
// ANALYSIS FUNCTIONS
// ============================================

/**
 * Analyze a single file
 * @param {string} filePath - Path to file
 * @param {string} tier - Tier name
 * @param {string|null} singleCheck - If set, only run this specific check
 */
function analyzeFile(filePath, tier = 'material', singleCheck = null) {
  const tiers = getTiers();
  const tierConfig = tiers[tier] || tiers.material;
  const ext = path.extname(filePath).toLowerCase();
  const content = fs.readFileSync(filePath, 'utf-8');
  const results = [];

  // Helper to check if we should run this check
  const shouldRun = (checkName) => !singleCheck || checkName === singleCheck;

  if (['.html', '.htm'].includes(ext)) {
    // Run HTML checks
    for (const checkName of (tierConfig.html || [])) {
      if (shouldRun(checkName)) results.push(runCheck(checkName, content, filePath));
    }
    // Run Angular checks
    for (const checkName of (tierConfig.angular || [])) {
      if (shouldRun(checkName)) results.push(runCheck(checkName, content, filePath));
    }
    // Run Material checks
    for (const checkName of (tierConfig.material || [])) {
      if (shouldRun(checkName)) results.push(runCheck(checkName, content, filePath));
    }
    // Run CDK checks
    for (const checkName of (tierConfig.cdk || [])) {
      if (shouldRun(checkName)) results.push(runCheck(checkName, content, filePath));
    }
  } else if (['.scss', '.css'].includes(ext)) {
    // Run SCSS checks
    for (const checkName of (tierConfig.scss || [])) {
      if (shouldRun(checkName)) results.push(runCheck(checkName, content, filePath));
    }
  }

  return results;
}

/**
 * Synchronous analysis function (original implementation)
 * @param {string} targetPath - Directory or file to analyze
 * @param {object} options - Configuration options
 */
function analyzeSync(targetPath, options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };
  const tier = config.tier || 'material';
  const ignore = config.ignore || DEFAULT_CONFIG.ignore;
  const singleCheck = config.check || null;

  // Find all files
  const allExtensions = [...config.extensions.html, ...config.extensions.scss];
  const files = findFiles(targetPath, allExtensions, ignore);

  // Analyze all files
  const allResults = {
    tier: tier,
    check: singleCheck,
    files: {},
    summary: {
      totalFiles: 0,
      // Element-level metrics (granular progress)
      elementsChecked: 0,
      elementsPassed: 0,
      elementsFailed: 0,
      // Audit-level metrics (Lighthouse-style)
      auditScore: 0,
      auditsTotal: 0,
      auditsPassed: 0,
      auditsFailed: 0,
      audits: [],
      // Issues
      issues: []
    }
  };

  // Aggregate check results across all files for audit scoring
  const checkAggregates = {};

  // Helper to count errors from issues (issues start with [Error], [Warning], or [Info])
  const countErrors = (issues) => {
    let errors = 0;
    for (const issue of issues) {
      const msg = typeof issue === 'string' ? issue : issue.message || '';
      if (msg.startsWith('[Error]')) errors++;
    }
    return errors;
  };

  for (const filePath of files) {
    const results = analyzeFile(filePath, tier, singleCheck);

    // Skip files with no results (e.g., HTML file when checking SCSS-only check)
    if (results.length === 0) continue;

    allResults.files[filePath] = results;
    allResults.summary.totalFiles++;

    for (const result of results) {
      // Aggregate for audit scoring
      if (!checkAggregates[result.name]) {
        checkAggregates[result.name] = { elementsFound: 0, issues: 0, errors: 0, warnings: 0 };
      }
      checkAggregates[result.name].elementsFound += result.elementsFound || 0;
      checkAggregates[result.name].issues += result.issues.length;
      // Count only errors for audit pass/fail (not warnings/info)
      const errorCount = countErrors(result.issues);
      checkAggregates[result.name].errors += errorCount;
      checkAggregates[result.name].warnings += (result.issues.length - errorCount);

      // Only count checks that found elements to evaluate
      if (result.elementsFound > 0) {
        const issueCount = result.issues.length;
        const passedCount = result.elementsFound - issueCount;

        allResults.summary.elementsChecked += result.elementsFound;
        allResults.summary.elementsPassed += passedCount;
        allResults.summary.elementsFailed += issueCount;
      }

      // Always collect issues for reporting
      if (result.issues.length > 0) {
        allResults.summary.issues.push(...result.issues.map(issue => {
          const issueObj = typeof issue === 'string' ? { message: issue } : issue;
          return {
            ...issueObj,
            file: filePath,
            check: result.name
          };
        }));
      }
    }
  }

  // Calculate Lighthouse-style audit score
  const auditResult = calculateAuditScore(checkAggregates);
  allResults.summary.auditScore = auditResult.score;
  allResults.summary.auditsTotal = auditResult.passed + auditResult.failed;
  allResults.summary.auditsPassed = auditResult.passed;
  allResults.summary.auditsFailed = auditResult.failed;
  allResults.summary.audits = auditResult.audits;

  return allResults;
}

/**
 * Main analysis function - supports both sync and async modes
 * @param {string} targetPath - Directory or file to analyze
 * @param {object} options - Configuration options
 * @param {string} options.tier - 'basic', 'material', or 'full'
 * @param {string[]} options.ignore - Patterns to ignore
 * @param {string} options.check - Single check name to run (optional)
 * @param {boolean} options.verified - Run self-test first (optional)
 * @param {number|'auto'|'sync'} options.workers - Parallel execution ('sync' default, 'auto', or number)
 * @returns {object|Promise<object>} Analysis results
 */
function analyze(targetPath, options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };

  // Determine if we need async mode
  // 'sync' = use sync mode, 'auto' or number = use async mode
  const needsAsync = config.verified || config.workers !== 'sync';

  if (needsAsync) {
    return analyzeAsync(targetPath, config);
  }

  // Use synchronous mode only when explicitly requested
  return analyzeSync(targetPath, config);
}

/**
 * Async analysis function (new parallel mode)
 * @param {string} targetPath - Directory or file to analyze
 * @param {object} config - Configuration object
 * @returns {Promise<object>} Analysis results
 */
async function analyzeAsync(targetPath, config) {
  // If verified mode, run self-test first
  if (config.verified) {
    const verifyResults = verifyByTier(config.tier);
    const summary = getVerifySummary(verifyResults);
    if (summary.failed > 0) {
      console.warn(`Warning: ${summary.failed} checks failed self-test`);
    }
  }

  // If workers specified, use parallel runner
  if (config.workers) {
    const runner = await createRunner({ workers: config.workers });
    try {
      const files = findFilesWithContent(targetPath, config);
      const runnerResults = await runner.runChecks(files, config.tier, { check: config.check });

      // Convert runner results to legacy format for backwards compatibility
      return convertRunnerResults(runnerResults, config);
    } finally {
      await runner.shutdown();
    }
  }

  // Fall back to synchronous analysis
  return analyzeSync(targetPath, config);
}

/**
 * Convert runner results to analyze() format
 * @param {object} runnerResults - Results from CheckRunner
 * @param {object} config - Configuration
 * @returns {object} Results in new format
 */
function convertRunnerResults(runnerResults, config) {
  const allResults = {
    tier: config.tier,
    check: config.check || null,
    files: {},
    summary: {
      totalFiles: runnerResults.summary.totalFiles,
      elementsChecked: 0,
      elementsPassed: 0,
      elementsFailed: 0,
      auditScore: 0,
      auditsTotal: 0,
      auditsPassed: 0,
      auditsFailed: 0,
      audits: [],
      issues: runnerResults.summary.issues
    },
    timing: runnerResults.timing
  };

  // Aggregate check results for audit scoring
  const checkAggregates = {};

  // Helper to count errors from issues
  const countErrors = (issues) => {
    let errors = 0;
    for (const issue of issues) {
      const msg = typeof issue === 'string' ? issue : issue.message || '';
      if (msg.startsWith('[Error]')) errors++;
    }
    return errors;
  };

  // Convert Map to object and calculate element-level metrics
  for (const [filePath, fileResult] of runnerResults.files) {
    const checkResults = [];
    for (const [checkName, checkResult] of fileResult.checks) {
      const elementsFound = checkResult.elementsFound || 0;
      const issues = checkResult.issues || [];
      checkResults.push(new CheckResult(
        checkName,
        checkResult.pass,
        issues,
        elementsFound
      ));

      // Aggregate for audit scoring
      if (!checkAggregates[checkName]) {
        checkAggregates[checkName] = { elementsFound: 0, issues: 0, errors: 0, warnings: 0 };
      }
      checkAggregates[checkName].elementsFound += elementsFound;
      checkAggregates[checkName].issues += issues.length;
      // Count only errors for audit pass/fail (not warnings/info)
      const errorCount = countErrors(issues);
      checkAggregates[checkName].errors += errorCount;
      checkAggregates[checkName].warnings += (issues.length - errorCount);

      if (elementsFound > 0) {
        const issueCount = (checkResult.issues || []).length;
        allResults.summary.elementsChecked += elementsFound;
        allResults.summary.elementsPassed += (elementsFound - issueCount);
        allResults.summary.elementsFailed += issueCount;
      }
    }
    allResults.files[filePath] = checkResults;
  }

  // Calculate Lighthouse-style audit score
  const auditResult = calculateAuditScore(checkAggregates);
  allResults.summary.auditScore = auditResult.score;
  allResults.summary.auditsTotal = auditResult.passed + auditResult.failed;
  allResults.summary.auditsPassed = auditResult.passed;
  allResults.summary.auditsFailed = auditResult.failed;
  allResults.summary.audits = auditResult.audits;

  return allResults;
}

// ============================================
// VERIFICATION API (New)
// ============================================

/**
 * Verify all checks for a tier (self-test)
 * @param {'basic'|'material'|'full'} tier - Tier to verify
 * @returns {Promise<object>} Verification results
 *
 * @example
 * const { verifyChecks } = require('traufix-a11y');
 * const results = await verifyChecks('full');
 * console.log(`Verified: ${results.verified}/${results.total}`);
 */
async function verifyChecks(tier = 'full') {
  const verifyResults = verifyByTier(tier);
  const summary = getVerifySummary(verifyResults);

  return {
    total: summary.total,
    verified: summary.verified,
    failed: summary.failed,
    skipped: summary.skipped,
    details: summary.details
  };
}

// ============================================
// SIMPLE ONE-LINER API
// ============================================

/**
 * Quick check with basic tier (~15 checks, fastest)
 * @param {string} targetPath - Directory or file to analyze
 * @returns {object} Analysis results
 *
 * @example
 * const { basic } = require('mat-a11y');
 * const results = basic('./src/app');
 */
function basic(targetPath) {
  return analyze(targetPath, { tier: 'basic' });
}

/**
 * Material-only check (29 checks)
 * ONLY mat-* component accessibility checks
 * @param {string} targetPath - Directory or file to analyze
 * @returns {object} Analysis results
 *
 * @example
 * const { material } = require('mat-a11y');
 * const results = material('./src/app');
 */
function material(targetPath) {
  return analyze(targetPath, { tier: 'material' });
}

/**
 * Angular-only check (10 checks)
 * ONLY Angular template + CDK accessibility checks
 * @param {string} targetPath - Directory or file to analyze
 * @returns {object} Analysis results
 *
 * @example
 * const { angular } = require('mat-a11y');
 * const results = angular('./src/app');
 */
function angular(targetPath) {
  return analyze(targetPath, { tier: 'angular' });
}

/**
 * Full audit with all 82 checks (most thorough)
 * @param {string} targetPath - Directory or file to analyze
 * @returns {object} Analysis results
 *
 * @example
 * const { full } = require('mat-a11y');
 * const results = full('./src/app');
 */
function full(targetPath) {
  return analyze(targetPath, { tier: 'full' });
}

/**
 * Check specific HTML content
 * @param {string} html - HTML string to analyze
 * @param {string} tier - 'basic', 'material', or 'full'
 * @returns {CheckResult[]} Array of check results
 */
function checkHTML(html, tier = 'material') {
  const tiers = getTiers();
  const tierConfig = tiers[tier] || tiers.material;
  const results = [];

  for (const checkName of [
    ...(tierConfig.html || []),
    ...(tierConfig.angular || []),
    ...(tierConfig.material || []),
    ...(tierConfig.cdk || [])
  ]) {
    results.push(runCheck(checkName, html, 'inline'));
  }

  return results;
}

/**
 * Check specific SCSS content
 * @param {string} scss - SCSS string to analyze
 * @param {string} tier - 'basic', 'material', or 'full'
 * @returns {CheckResult[]} Array of check results
 */
function checkSCSS(scss, tier = 'material') {
  const tiers = getTiers();
  const tierConfig = tiers[tier] || tiers.material;
  const results = [];

  for (const checkName of (tierConfig.scss || [])) {
    results.push(runCheck(checkName, scss, 'inline'));
  }

  return results;
}

// ============================================
// OUTPUT FORMATTING
// ============================================

/**
 * Format results for console
 */
function formatConsoleOutput(results) {
  const lines = [];
  const { summary, tier } = results;

  lines.push('========================================');
  lines.push('  MAT-A11Y ACCESSIBILITY REPORT');
  lines.push('========================================');
  lines.push('');
  lines.push('Tier: ' + (tier || 'material').toUpperCase());
  lines.push('Files analyzed: ' + summary.totalFiles);

  // Audit Score (Lighthouse-style)
  lines.push('');
  lines.push('AUDIT SCORE: ' + summary.auditScore + '%');
  lines.push('  Passing audits: ' + summary.auditsPassed + '/' + summary.auditsTotal);

  // Element Coverage (our differentiation)
  if (summary.elementsChecked > 0) {
    const coveragePercent = ((summary.elementsPassed / summary.elementsChecked) * 100).toFixed(1);
    lines.push('');
    lines.push('ELEMENT COVERAGE: ' + coveragePercent + '%');
    lines.push('  ' + summary.elementsPassed + '/' + summary.elementsChecked + ' elements OK');
  }

  // Show timing if available (from parallel runner)
  if (results.timing && results.timing.duration) {
    lines.push('');
    lines.push('Duration: ' + results.timing.duration + 'ms');
  }

  // Show top failing audits with fix impact
  if (summary.audits && summary.auditsFailed > 0) {
    const failingAudits = summary.audits.filter(a => !a.passed).slice(0, 5);
    lines.push('');
    lines.push('TOP ISSUES TO FIX:');
    for (const audit of failingAudits) {
      lines.push('  ' + audit.name + ': ' + audit.issues + ' issues (fix for +' + audit.weight + ' audit points)');
    }
  }

  lines.push('');

  if (summary.issues.length > 0) {
    lines.push('ISSUES FOUND:');
    lines.push('-'.repeat(40));

    const issuesByFile = {};
    for (const issue of summary.issues) {
      if (!issuesByFile[issue.file]) {
        issuesByFile[issue.file] = [];
      }
      issuesByFile[issue.file].push(issue);
    }

    for (const [file, issues] of Object.entries(issuesByFile)) {
      lines.push('');
      lines.push(file + ':');
      for (const issue of issues) {
        lines.push('  [' + issue.check + '] ' + issue.message);
      }
    }
  } else {
    lines.push('No accessibility issues found!');
  }

  lines.push('');
  lines.push('========================================');

  return lines.join('\n');
}

// ============================================
// EXPORTS
// ============================================

// Import page resolver for deep component resolution (preprocessing)
const { PageResolver, createPageResolver } = require('./core/pageResolver');
const { buildComponentRegistry, getRegistryStats } = require('./core/componentRegistry');

module.exports = {
  // Simple one-liner API
  basic,
  material,
  angular,
  full,

  // Flexible API
  analyze,
  checkHTML,
  checkSCSS,

  // Route-based analysis (Lighthouse-style per-page)
  analyzeByRoute,
  formatRouteResults,

  // Sitemap-based analysis (what Google crawls)
  analyzeBySitemap,
  formatSitemapResults,
  findSitemap,

  // Component-based analysis (scans all @Component files)
  analyzeByComponent,
  formatComponentResults,

  // Page resolver (preprocessing for deep component resolution)
  PageResolver,
  createPageResolver,
  buildComponentRegistry,
  getRegistryStats,

  // New modular API
  verifyChecks,
  getCheckInfo,
  CheckRunner,
  createRunner,

  // Utilities
  formatConsoleOutput,
  findFiles,

  // Configuration
  TIERS,
  DEFAULT_CONFIG,
  WEIGHTS,

  // Output formatters
  formatters,

  // Re-exports
  colors,
  CheckResult
};
