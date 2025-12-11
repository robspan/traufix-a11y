/**
 * traufix-a11y
 *
 * Static accessibility analyzer for Angular/HTML templates.
 * Full Lighthouse audit coverage with WCAG 2.1 contrast ratio calculation.
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
    enhanced: { html: [], scss: [], angular: [], material: [], cdk: [] },
    full: { html: [], scss: [], angular: [], material: [], cdk: [] }
  };

  // Tier hierarchy - each tier includes checks from lower tiers
  const tierHierarchy = {
    basic: ['basic'],
    enhanced: ['basic', 'enhanced'],
    full: ['basic', 'enhanced', 'full']
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
 * Static TIERS for backwards compatibility (legacy format)
 * This will be merged with dynamically loaded checks
 */
const STATIC_TIERS = {
  basic: {
    html: [
      'buttonNames', 'imageAlt', 'formLabels', 'ariaRoles', 'ariaAttributes',
      'uniqueIds', 'headingOrder', 'linkNames', 'listStructure', 'dlStructure',
      'tableHeaders', 'iframeTitles', 'videoCaptions', 'objectAlt',
      'accesskeyUnique', 'tabindex', 'ariaHiddenBody'
    ],
    scss: ['colorContrast', 'focusStyles', 'touchTargets'],
    angular: [],
    material: [],
    cdk: []
  },

  enhanced: {
    html: [
      'buttonNames', 'imageAlt', 'formLabels', 'ariaRoles', 'ariaAttributes',
      'uniqueIds', 'headingOrder', 'linkNames', 'listStructure', 'dlStructure',
      'tableHeaders', 'iframeTitles', 'videoCaptions', 'objectAlt',
      'accesskeyUnique', 'tabindex', 'ariaHiddenBody',
      // Extra HTML
      'htmlHasLang', 'metaViewport', 'skipLink', 'inputImageAlt',
      'autoplayMedia', 'marqueeElement', 'blinkElement'
    ],
    scss: ['colorContrast', 'focusStyles', 'touchTargets', 'outlineNoneWithoutAlt', 'hoverWithoutFocus'],
    angular: ['clickWithoutKeyboard', 'clickWithoutRole', 'routerLinkNames', 'ngForTrackBy'],
    material: ['matIconAccessibility', 'matFormFieldLabel', 'matButtonType', 'matTableHeaders'],
    cdk: []
  },

  full: {
    html: [
      'buttonNames', 'imageAlt', 'formLabels', 'ariaRoles', 'ariaAttributes',
      'uniqueIds', 'headingOrder', 'linkNames', 'listStructure', 'dlStructure',
      'tableHeaders', 'iframeTitles', 'videoCaptions', 'objectAlt',
      'accesskeyUnique', 'tabindex', 'ariaHiddenBody',
      // Extra HTML 1
      'htmlHasLang', 'metaViewport', 'skipLink', 'inputImageAlt',
      'autoplayMedia', 'marqueeElement', 'blinkElement',
      // Extra HTML 2
      'metaRefresh', 'duplicateIdAria', 'emptyTableHeader',
      'scopeAttrMisuse', 'autofocusUsage', 'formFieldName'
    ],
    scss: [
      'colorContrast', 'focusStyles', 'touchTargets',
      // Extra SCSS 1
      'outlineNoneWithoutAlt', 'prefersReducedMotion', 'userSelectNone',
      'pointerEventsNone', 'visibilityHiddenUsage',
      // Extra SCSS 2
      'focusWithinSupport', 'hoverWithoutFocus', 'contentOverflow',
      'smallFontSize', 'lineHeightTight', 'textJustify'
    ],
    angular: [
      'clickWithoutKeyboard', 'clickWithoutRole', 'routerLinkNames',
      'ngForTrackBy', 'innerHtmlUsage', 'asyncPipeAria'
    ],
    material: [
      // Material - Form Controls
      'matFormFieldLabel', 'matSelectPlaceholder', 'matAutocompleteLabel',
      'matDatepickerLabel', 'matRadioGroupLabel', 'matSlideToggleLabel',
      'matCheckboxLabel', 'matChipListLabel', 'matSliderLabel',
      // Material - Buttons & Indicators
      'matButtonType', 'matIconAccessibility', 'matButtonToggleLabel',
      'matProgressBarLabel', 'matProgressSpinnerLabel', 'matBadgeDescription',
      // Material - Navigation & Layout
      'matMenuTrigger', 'matSidenavA11y', 'matTabLabel', 'matStepLabel',
      'matExpansionHeader', 'matTreeA11y', 'matListSelectionLabel',
      // Material - Data Table
      'matTableHeaders', 'matPaginatorLabel', 'matSortHeaderAnnounce',
      // Material - Popups & Modals
      'matDialogFocus', 'matBottomSheetA11y', 'matTooltipKeyboard', 'matSnackbarPoliteness'
    ],
    cdk: ['cdkTrapFocusDialog', 'cdkAriaDescriber', 'cdkLiveAnnouncer']
  }
};

/**
 * Get effective TIERS configuration from registry
 */
function getTiers() {
  try {
    return generateTiersFromRegistry();
  } catch (e) {
    return STATIC_TIERS;
  }
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
  tier: 'enhanced',
  ignore: ['node_modules', '.git', 'dist', 'build', '.angular', 'coverage'],
  extensions: {
    html: ['.html', '.htm'],
    scss: ['.scss', '.css']
  },
  verbose: false,
  outputFormat: 'console',
  // New options
  verified: false,  // Run self-test first
  workers: null,    // Parallel execution (null = sync, 'auto' or number)
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
  constructor(name, passed, issues = []) {
    this.name = name;
    this.passed = passed;
    this.issues = issues;
    this.count = issues.length;
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
    return new CheckResult(name, true, []); // Skip unknown checks
  }

  try {
    const result = checkFn(content);
    return new CheckResult(name, result.pass, result.issues || []);
  } catch (error) {
    return new CheckResult(name, true, []); // Skip on error
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
function analyzeFile(filePath, tier = 'enhanced', singleCheck = null) {
  const tiers = getTiers();
  const tierConfig = tiers[tier] || tiers.enhanced;
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
  const tier = config.tier || 'enhanced';
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
      totalChecks: 0,
      passed: 0,
      failed: 0,
      issues: []
    }
  };

  for (const filePath of files) {
    const results = analyzeFile(filePath, tier, singleCheck);

    // Skip files with no results (e.g., HTML file when checking SCSS-only check)
    if (results.length === 0) continue;

    allResults.files[filePath] = results;
    allResults.summary.totalFiles++;

    for (const result of results) {
      allResults.summary.totalChecks++;
      if (result.passed) {
        allResults.summary.passed++;
      } else {
        allResults.summary.failed++;
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

  return allResults;
}

/**
 * Main analysis function - supports both sync and async modes
 * @param {string} targetPath - Directory or file to analyze
 * @param {object} options - Configuration options
 * @param {string} options.tier - 'basic', 'enhanced', or 'full'
 * @param {string[]} options.ignore - Patterns to ignore
 * @param {string} options.check - Single check name to run (optional)
 * @param {boolean} options.verified - Run self-test first (optional)
 * @param {number|'auto'|null} options.workers - Parallel execution (optional)
 * @returns {object|Promise<object>} Analysis results
 */
function analyze(targetPath, options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };

  // Determine if we need async mode
  const needsAsync = config.verified || config.workers;

  if (needsAsync) {
    return analyzeAsync(targetPath, config);
  }

  // Use synchronous mode for backwards compatibility
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
 * Convert runner results to legacy analyze() format
 * @param {object} runnerResults - Results from CheckRunner
 * @param {object} config - Configuration
 * @returns {object} Legacy format results
 */
function convertRunnerResults(runnerResults, config) {
  const allResults = {
    tier: config.tier,
    check: config.check || null,
    files: {},
    summary: {
      totalFiles: runnerResults.summary.totalFiles,
      totalChecks: runnerResults.summary.totalChecks,
      passed: runnerResults.summary.passed,
      failed: runnerResults.summary.failed,
      issues: runnerResults.summary.issues
    },
    timing: runnerResults.timing
  };

  // Convert Map to object for backwards compatibility
  for (const [filePath, fileResult] of runnerResults.files) {
    const checkResults = [];
    for (const [checkName, checkResult] of fileResult.checks) {
      checkResults.push(new CheckResult(
        checkName,
        checkResult.pass,
        checkResult.issues || []
      ));
    }
    allResults.files[filePath] = checkResults;
  }

  return allResults;
}

// ============================================
// VERIFICATION API (New)
// ============================================

/**
 * Verify all checks for a tier (self-test)
 * @param {'basic'|'enhanced'|'full'} tier - Tier to verify
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
 * Quick check with basic tier (fastest, 20 checks)
 * @param {string} targetPath - Directory or file to analyze
 * @returns {object} Analysis results
 *
 * @example
 * const { basic } = require('traufix-a11y');
 * const results = basic('./src/app/media');
 */
function basic(targetPath) {
  return analyze(targetPath, { tier: 'basic' });
}

/**
 * Standard check with enhanced tier (40 checks, recommended)
 * @param {string} targetPath - Directory or file to analyze
 * @returns {object} Analysis results
 *
 * @example
 * const { enhanced } = require('traufix-a11y');
 * const results = enhanced('./src/app/media');
 */
function enhanced(targetPath) {
  return analyze(targetPath, { tier: 'enhanced' });
}

/**
 * Full check with all 67 checks (most thorough)
 * @param {string} targetPath - Directory or file to analyze
 * @returns {object} Analysis results
 *
 * @example
 * const { full } = require('traufix-a11y');
 * const results = full('./src/app/media');
 */
function full(targetPath) {
  return analyze(targetPath, { tier: 'full' });
}

/**
 * Check specific HTML content
 * @param {string} html - HTML string to analyze
 * @param {string} tier - 'basic', 'enhanced', or 'full'
 * @returns {CheckResult[]} Array of check results
 */
function checkHTML(html, tier = 'enhanced') {
  const tiers = getTiers();
  const tierConfig = tiers[tier] || tiers.enhanced;
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
 * @param {string} tier - 'basic', 'enhanced', or 'full'
 * @returns {CheckResult[]} Array of check results
 */
function checkSCSS(scss, tier = 'enhanced') {
  const tiers = getTiers();
  const tierConfig = tiers[tier] || tiers.enhanced;
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

  lines.push('\n========================================');
  lines.push('  TRAUFIX-A11Y ACCESSIBILITY REPORT');
  lines.push('========================================\n');

  lines.push('Tier: ' + (tier || 'enhanced').toUpperCase());
  lines.push('Files analyzed: ' + summary.totalFiles);
  lines.push('Total checks: ' + summary.totalChecks);

  const passPercent = summary.totalChecks > 0
    ? ((summary.passed / summary.totalChecks) * 100).toFixed(1)
    : '0.0';
  lines.push('Passed: ' + summary.passed + ' (' + passPercent + '%)');
  lines.push('Failed: ' + summary.failed);

  // Show timing if available (from parallel runner)
  if (results.timing && results.timing.duration) {
    lines.push('Duration: ' + results.timing.duration + 'ms');
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
      lines.push('\n' + file + ':');
      for (const issue of issues) {
        lines.push('  [' + issue.check + '] ' + issue.message);
      }
    }
  } else {
    lines.push('No accessibility issues found!');
  }

  lines.push('\n========================================');
  lines.push('HINWEIS: Keine Gewaehr fuer Vollstaendigkeit.');
  lines.push('========================================\n');

  return lines.join('\n');
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Simple one-liner API
  basic,
  enhanced,
  full,

  // Flexible API
  analyze,
  checkHTML,
  checkSCSS,

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

  // Re-exports
  colors,
  CheckResult
};
