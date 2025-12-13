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
 * @param {boolean} options.deepResolve - Enable deep component resolution (default: false)
 * @returns {object} Analysis results
 */
function analyzeByRoute(projectDir, options = {}) {
  const tier = options.tier || 'material';
  const deepResolve = options.deepResolve === true; // Default to false (component-level analysis)

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
 * Extract component name from file path
 */
function extractComponentName(filePath) {
  if (!filePath || filePath === 'unknown') return 'Unknown';
  const normalized = filePath.replace(/\\/g, '/');
  const fileName = normalized.split('/').pop() || '';

  if (fileName.includes('(inline template)')) {
    const match = fileName.match(/<([^>]+)>/);
    if (match) {
      return match[1].split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('') + 'Component';
    }
  }

  const baseName = fileName
    .replace(/\.(component|directive|pipe)?\.(html|scss|css|ts)$/, '')
    .replace(/\.(html|scss|css|ts)$/, '');
  if (!baseName) return 'Unknown';

  return baseName.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('') +
         (fileName.includes('.component.') ? '' : 'Component');
}

/**
 * Group results by component
 */
function groupByComponent(routes) {
  const components = new Map();
  const globalSeen = new Set();

  for (const route of routes) {
    for (const issue of (route.issues || [])) {
      const filePath = issue.file || 'unknown';
      const componentName = extractComponentName(filePath);

      if (!components.has(componentName)) {
        components.set(componentName, {
          files: new Set(),
          issues: [],
          affectedRoutes: new Set(),
          checkCounts: {}
        });
      }

      const comp = components.get(componentName);
      comp.files.add(filePath);
      if (route.path) comp.affectedRoutes.add(route.path);

      if (!comp.checkCounts[issue.check]) {
        comp.checkCounts[issue.check] = 0;
      }

      const globalKey = `${filePath}|${issue.check}|${issue.message}`;
      if (!globalSeen.has(globalKey)) {
        globalSeen.add(globalKey);
        comp.checkCounts[issue.check]++;
        comp.issues.push(issue);
      }
    }
  }

  return components;
}

/**
 * Format route analysis results for console
 * @param {object} results - Analysis results
 * @returns {string} Formatted output
 */
function formatRouteResults(results) {
  const lines = [];
  const isDeep = results.deepResolve && results.deepResolve.enabled;

  // Header based on mode
  lines.push('========================================');
  if (isDeep) {
    lines.push('  MAT-A11Y PAGE ANALYSIS');
  } else {
    lines.push('  MAT-A11Y COMPONENT ANALYSIS');
  }
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

  if (isDeep) {
    // Page-level: show routes
    lines.push('Mode: Page-level (--deep)');
    lines.push(`  Components in Registry: ${results.deepResolve.componentsInRegistry}`);
    lines.push(`  Child Components Analyzed: ${results.deepResolve.childComponentsAnalyzed}`);
    lines.push('');

    const passing = results.routes.filter(r => r.auditScore >= 90).length;
    const warning = results.routes.filter(r => r.auditScore >= 50 && r.auditScore < 90).length;
    const failing = results.routes.filter(r => r.auditScore < 50).length;

    lines.push(`PAGE SCORES (${results.routeCount} routes):`);
    lines.push(`  🟢 Passing (90-100%): ${passing} routes`);
    lines.push(`  🟡 Needs Work (50-89%): ${warning} routes`);
    lines.push(`  🔴 Failing (<50%): ${failing} routes`);
    lines.push('');

    lines.push('PAGES:');
    const displayRoutes = [...results.routes].sort((a, b) => b.auditScore - a.auditScore);

    for (const route of displayRoutes.slice(0, 20)) {
      const bar = progressBar(route.auditScore);
      const score = String(route.auditScore).padStart(3) + '%';
      const audits = `${route.auditsPassed}/${route.auditsTotal}`;
      lines.push(`  ${route.path.padEnd(40)} ${score}  ${bar}  ${audits} audits`);
    }

    if (displayRoutes.length > 20) {
      lines.push(`  ... and ${displayRoutes.length - 20} more pages`);
    }
    lines.push('');

    if (results.worstRoutes && results.worstRoutes.length > 0) {
      lines.push('FIX PRIORITIES:');
      for (let i = 0; i < Math.min(3, results.worstRoutes.length); i++) {
        const worst = results.worstRoutes[i];
        if (worst.score >= 90) continue;
        lines.push(`  ${i + 1}. ${worst.path} (${worst.score}%)`);
        for (const issue of worst.topIssues) {
          lines.push(`     - ${issue.check}: ${issue.count} errors`);
        }
        lines.push('');
      }
    }
  } else {
    // Component-level: group by component
    lines.push('Mode: Component-level (default)');
    lines.push(`  Use --deep for page-level scores with child components`);
    lines.push('');

    const components = groupByComponent(results.routes);

    const componentList = [];
    for (const [name, data] of components) {
      if (data.issues.length === 0) continue;
      componentList.push({
        name,
        issueCount: data.issues.length,
        affectedRoutes: data.affectedRoutes,
        checkCounts: data.checkCounts
      });
    }

    componentList.sort((a, b) => b.issueCount - a.issueCount);

    const totalIssues = componentList.reduce((sum, c) => sum + c.issueCount, 0);
    const componentsWithIssues = componentList.length;
    const componentsClean = components.size - componentsWithIssues;

    lines.push(`COMPONENT SCORES (${components.size} components):`);
    lines.push(`  🟢 Clean (no issues): ${componentsClean}`);
    lines.push(`  🟡 Has Issues: ${componentsWithIssues}`);
    lines.push(`  📊 Total Issues: ${totalIssues}`);
    lines.push('');

    if (componentList.length > 0) {
      lines.push('COMPONENTS WITH ISSUES:');
      for (const comp of componentList.slice(0, 15)) {
        const routeCount = comp.affectedRoutes.size;
        const routeHint = routeCount > 0 ? ` (affects ${routeCount} routes)` : '';
        lines.push(`  🟡 ${comp.name}: ${comp.issueCount} issues${routeHint}`);
      }
      if (componentList.length > 15) {
        lines.push(`  ... and ${componentList.length - 15} more components`);
      }
      lines.push('');

      lines.push('FIX PRIORITIES:');
      for (let i = 0; i < Math.min(3, componentList.length); i++) {
        const comp = componentList[i];
        const routes = [...comp.affectedRoutes].slice(0, 3);
        const moreRoutes = comp.affectedRoutes.size > 3 ? ` (+${comp.affectedRoutes.size - 3} more)` : '';
        lines.push(`  ${i + 1}. ${comp.name} (${comp.issueCount} issues)`);
        if (routes.length > 0) {
          lines.push(`     Affects: ${routes.join(', ')}${moreRoutes}`);
        }
        const topChecks = Object.entries(comp.checkCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3);
        for (const [check, count] of topChecks) {
          lines.push(`     - ${check}: ${count} errors`);
        }
        lines.push('');
      }
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
