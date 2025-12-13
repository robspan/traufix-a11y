'use strict';

/**
 * Route-Based Analyzer
 *
 * Analyzes Angular routes individually and calculates per-route scores.
 * Mimics how Lighthouse scores individual pages.
 */

const fs = require('fs');
const path = require('path');
const { parseAngularRoutes } = require('./routeParser');
const { resolveAllRoutes } = require('./componentResolver');
const { calculateAuditScore } = require('./weights');
const { loadAllChecks, getChecksByTier } = require('./loader');
const { createPageResolver } = require('./pageResolver');

/**
 * Get check names from registry filtered by type
 * @param {Map} registry - Check registry
 * @param {string} type - 'html' or 'scss'
 * @returns {string[]} Array of check names
 */
function getCheckNamesByType(registry, type) {
  const names = [];
  for (const [name, module] of registry) {
    if (module.type === type) {
      names.push(name);
    }
  }
  return names;
}

/**
 * Get check function by name
 * @param {string} name - Check name
 * @param {Map} registry - Check registry
 * @returns {Function|null}
 */
function getCheckFunction(name, registry) {
  const checkModule = registry.get(name);
  if (checkModule && typeof checkModule.check === 'function') {
    return checkModule.check;
  }
  return null;
}

/**
 * Run a single check on content
 * @param {string} name - Check name
 * @param {string} content - File content
 * @param {Map} registry - Check registry
 * @returns {object} { pass, issues, elementsFound }
 */
function runCheck(name, content, registry) {
  const checkFn = getCheckFunction(name, registry);
  if (!checkFn) {
    return { pass: true, issues: [], elementsFound: 0 };
  }

  try {
    const result = checkFn(content);
    return {
      pass: result.pass,
      issues: result.issues || [],
      elementsFound: result.elementsFound || 0
    };
  } catch (error) {
    return { pass: true, issues: [], elementsFound: 0 };
  }
}

/**
 * Count errors from issues array
 * @param {Array} issues - Array of issue strings
 * @returns {number} Number of errors
 */
function countErrors(issues) {
  let errors = 0;
  for (const issue of issues) {
    const msg = typeof issue === 'string' ? issue : issue.message || '';
    if (msg.startsWith('[Error]')) errors++;
  }
  return errors;
}

/**
 * Analyze a single route with pre-resolved page files
 * @param {object} route - Route with resolved files
 * @param {object} pageFiles - Pre-resolved page files from PageResolver
 * @param {Map} registry - Check registry (tier-filtered)
 * @param {string[]} htmlChecks - HTML check names to run
 * @param {string[]} scssChecks - SCSS check names to run
 * @returns {object} Route analysis result
 */
function analyzeRoute(route, pageFiles, registry, htmlChecks, scssChecks) {
  const result = {
    path: route.path,
    component: route.loadComponent?.exportName || route.component || null,
    files: [],
    childComponents: pageFiles?.components || [],
    auditScore: 100,
    auditsTotal: 0,
    auditsPassed: 0,
    auditsFailed: 0,
    elementsChecked: 0,
    elementsPassed: 0,
    elementsFailed: 0,
    issues: [],
    audits: []
  };

  const checkAggregates = {};

  // Analyze all HTML files (resolved by PageResolver)
  for (const htmlFile of (pageFiles?.htmlFiles || [])) {
    if (!fs.existsSync(htmlFile)) continue;
    
    result.files.push(htmlFile);
    const content = fs.readFileSync(htmlFile, 'utf-8');

    // Run HTML checks
    for (const checkName of htmlChecks) {
      const checkResult = runCheck(checkName, content, registry);

      if (!checkAggregates[checkName]) {
        checkAggregates[checkName] = { elementsFound: 0, issues: 0, errors: 0, warnings: 0 };
      }
      checkAggregates[checkName].elementsFound += checkResult.elementsFound;
      checkAggregates[checkName].issues += checkResult.issues.length;

      const errorCount = countErrors(checkResult.issues);
      checkAggregates[checkName].errors += errorCount;
      checkAggregates[checkName].warnings += (checkResult.issues.length - errorCount);

      if (checkResult.elementsFound > 0) {
        result.elementsChecked += checkResult.elementsFound;
        result.elementsPassed += (checkResult.elementsFound - checkResult.issues.length);
        result.elementsFailed += checkResult.issues.length;
      }

      // Collect issues
      for (const issue of checkResult.issues) {
        result.issues.push({
          message: typeof issue === 'string' ? issue : issue.message,
          file: htmlFile,
          check: checkName
        });
      }
    }
  }

  // Analyze inline templates
  for (const { selector, template } of (pageFiles?.inlineTemplates || [])) {
    for (const checkName of htmlChecks) {
      const checkResult = runCheck(checkName, template, registry);

      if (!checkAggregates[checkName]) {
        checkAggregates[checkName] = { elementsFound: 0, issues: 0, errors: 0, warnings: 0 };
      }
      checkAggregates[checkName].elementsFound += checkResult.elementsFound;
      checkAggregates[checkName].issues += checkResult.issues.length;

      const errorCount = countErrors(checkResult.issues);
      checkAggregates[checkName].errors += errorCount;
      checkAggregates[checkName].warnings += (checkResult.issues.length - errorCount);

      if (checkResult.elementsFound > 0) {
        result.elementsChecked += checkResult.elementsFound;
        result.elementsPassed += (checkResult.elementsFound - checkResult.issues.length);
        result.elementsFailed += checkResult.issues.length;
      }

      for (const issue of checkResult.issues) {
        result.issues.push({
          message: typeof issue === 'string' ? issue : issue.message,
          file: `<${selector}> (inline template)`,
          check: checkName
        });
      }
    }
  }

  // Analyze all SCSS files (resolved by PageResolver)
  for (const scssFile of (pageFiles?.scssFiles || [])) {
    if (!fs.existsSync(scssFile)) continue;
    
    result.files.push(scssFile);
    const content = fs.readFileSync(scssFile, 'utf-8');

    for (const checkName of scssChecks) {
      const checkResult = runCheck(checkName, content, registry);

      if (!checkAggregates[checkName]) {
        checkAggregates[checkName] = { elementsFound: 0, issues: 0, errors: 0, warnings: 0 };
      }
      checkAggregates[checkName].elementsFound += checkResult.elementsFound;
      checkAggregates[checkName].issues += checkResult.issues.length;

      const errorCount = countErrors(checkResult.issues);
      checkAggregates[checkName].errors += errorCount;
      checkAggregates[checkName].warnings += (checkResult.issues.length - errorCount);

      if (checkResult.elementsFound > 0) {
        result.elementsChecked += checkResult.elementsFound;
        result.elementsPassed += (checkResult.elementsFound - checkResult.issues.length);
        result.elementsFailed += checkResult.issues.length;
      }

      for (const issue of checkResult.issues) {
        result.issues.push({
          message: typeof issue === 'string' ? issue : issue.message,
          file: scssFile,
          check: checkName
        });
      }
    }
  }

  // Calculate audit score for this route
  const auditResult = calculateAuditScore(checkAggregates);
  result.auditScore = auditResult.score;
  result.auditsTotal = auditResult.passed + auditResult.failed;
  result.auditsPassed = auditResult.passed;
  result.auditsFailed = auditResult.failed;
  result.audits = auditResult.audits;

  return result;
}

/**
 * Generate progress bar
 * @param {number} percentage - Percentage 0-100
 * @param {number} width - Width in characters
 * @returns {string} Progress bar string
 */
function progressBar(percentage, width = 10) {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Analyze an Angular project by routes
 * @param {string} projectDir - Angular project directory
 * @param {object} options - Analysis options
 * @param {boolean} options.deepResolve - Enable deep component resolution (default: true)
 * @returns {object} Analysis results
 */
function analyzeByRoute(projectDir, options = {}) {
  const tier = options.tier || 'material';
  const deepResolve = options.deepResolve !== false; // Default to true

  // Load check registry
  const fullRegistry = loadAllChecks();

  // Get tier-filtered registry
  const registry = getChecksByTier(fullRegistry, tier);

  // Get check names by type
  const htmlChecks = getCheckNamesByType(registry, 'html');
  const scssChecks = getCheckNamesByType(registry, 'scss');

  // Parse routes
  const parsed = parseAngularRoutes(projectDir);

  if (parsed.routes.length === 0) {
    return {
      error: parsed.error || 'No routes found',
      routes: [],
      siteAverage: 0,
      routeCount: 0
    };
  }

  // Resolve component files
  const resolved = resolveAllRoutes(parsed.routes, projectDir);

  if (resolved.length === 0) {
    return {
      error: 'Could not resolve any component files',
      routes: [],
      siteAverage: 0,
      routeCount: 0
    };
  }

  // Preprocessing: Build page resolver for deep component resolution
  let pageResolver = null;
  if (deepResolve) {
    pageResolver = createPageResolver(projectDir);
  }

  // Analyze each route
  const routeResults = [];
  let totalScore = 0;
  let totalIssues = [];
  let totalChildComponents = 0;

  for (const route of resolved) {
    // Preprocessing - resolve all page files (primary + children)
    const routeFiles = {
      html: route.files.html,
      scss: route.files.scss
    };
    const pageFiles = pageResolver 
      ? pageResolver.resolveRouteFiles(routeFiles)
      : {
          htmlFiles: routeFiles.html ? [routeFiles.html] : [],
          scssFiles: routeFiles.scss ? [routeFiles.scss] : [],
          inlineTemplates: [],
          components: []
        };

    const result = analyzeRoute(route, pageFiles, registry, htmlChecks, scssChecks);
    routeResults.push(result);
    totalScore += result.auditScore;
    totalIssues.push(...result.issues);
    totalChildComponents += result.childComponents.length;
  }

  // Calculate site average
  const siteAverage = Math.round(totalScore / routeResults.length);

  // Sort routes by score (worst first)
  const sortedRoutes = [...routeResults].sort((a, b) => a.auditScore - b.auditScore);

  // Get worst routes with their top issues
  const worstRoutes = sortedRoutes.slice(0, 5).map(route => {
    // Group issues by check
    const issuesByCheck = {};
    for (const issue of route.issues) {
      if (!issuesByCheck[issue.check]) {
        issuesByCheck[issue.check] = 0;
      }
      issuesByCheck[issue.check]++;
    }

    // Get top issues
    const topIssues = Object.entries(issuesByCheck)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([check, count]) => ({ check, count }));

    return {
      path: route.path,
      score: route.auditScore,
      topIssues
    };
  });

  // Get stats from pageResolver
  const resolverStats = pageResolver ? pageResolver.getStats() : null;

  return {
    tier,
    siteAverage,
    routeCount: routeResults.length,
    routes: sortedRoutes,
    worstRoutes,
    routingFiles: parsed.routingFiles,
    totalIssues: totalIssues.length,
    allIssues: totalIssues,
    // Deep resolution stats
    deepResolve: deepResolve ? {
      enabled: true,
      componentsInRegistry: resolverStats?.total || 0,
      childComponentsAnalyzed: totalChildComponents
    } : { enabled: false }
  };
}

/**
 * Format route analysis results for console
 * @param {object} results - Analysis results
 * @returns {string} Formatted output
 */
function formatRouteResults(results) {
  const lines = [];

  lines.push('========================================');
  lines.push('  MAT-A11Y ROUTE ANALYSIS');
  lines.push('========================================');
  lines.push('');

  if (results.error) {
    lines.push('Error: ' + results.error);
    lines.push('');
    lines.push('Tip: Make sure you\'re running this in an Angular project');
    lines.push('     with routing files (app.routes.ts or *-routing.module.ts)');
    return lines.join('\n');
  }

  lines.push('Tier: ' + results.tier.toUpperCase());
  lines.push('');

  // Score distribution - this is what actually matters for SEO
  // Google scores each page independently
  const passing = results.routes.filter(r => r.auditScore >= 90).length;
  const warning = results.routes.filter(r => r.auditScore >= 50 && r.auditScore < 90).length;
  const failing = results.routes.filter(r => r.auditScore < 50).length;

  lines.push(`ROUTE SCORES (${results.routeCount} routes):`);
  lines.push(`  🟢 Passing (90-100%): ${passing} routes`);
  lines.push(`  🟡 Needs Work (50-89%): ${warning} routes`);
  lines.push(`  🔴 Failing (<50%): ${failing} routes`);
  lines.push('');

  // Routes table
  lines.push('ROUTES:');

  // Sort by score for display (worst first for attention, or best first)
  const displayRoutes = [...results.routes].sort((a, b) => b.auditScore - a.auditScore);

  for (const route of displayRoutes.slice(0, 20)) {
    const bar = progressBar(route.auditScore);
    const score = String(route.auditScore).padStart(3) + '%';
    const audits = `${route.auditsPassed}/${route.auditsTotal}`;
    lines.push(`  ${route.path.padEnd(40)} ${score}  ${bar}  ${audits} audits`);
  }

  if (displayRoutes.length > 20) {
    lines.push(`  ... and ${displayRoutes.length - 20} more routes`);
  }

  lines.push('');

  // Fix priorities
  if (results.worstRoutes && results.worstRoutes.length > 0) {
    lines.push('FIX PRIORITIES:');

    for (let i = 0; i < Math.min(3, results.worstRoutes.length); i++) {
      const worst = results.worstRoutes[i];
      if (worst.score >= 90) continue; // Skip routes that are already good

      lines.push(`  ${i + 1}. ${worst.path} (${worst.score}%)`);
      for (const issue of worst.topIssues) {
        lines.push(`     - ${issue.check}: ${issue.count} errors`);
      }
      lines.push('');
    }
  }

  lines.push('========================================');

  return lines.join('\n');
}

module.exports = {
  analyzeByRoute,
  analyzeRoute,
  formatRouteResults,
  progressBar
};
