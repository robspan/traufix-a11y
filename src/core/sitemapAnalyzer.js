'use strict';

/**
 * Sitemap-Based Analyzer
 *
 * Uses sitemap.xml as the source of truth for what pages exist.
 * This matches exactly how Google discovers and crawls pages.
 */

const fs = require('fs');
const path = require('path');
const { loadAllChecks, getChecksByTier } = require('./loader');
const { calculateAuditScore } = require('./weights');
const { parseAngularRoutes } = require('./routeParser');
const { resolveAllRoutes } = require('./componentResolver');
const { createPageResolver } = require('./pageResolver');

/**
 * Find sitemap.xml in a project
 * @param {string} projectDir - Project directory
 * @returns {string|null} Path to sitemap.xml
 */
function findSitemap(projectDir) {
  const possiblePaths = [
    path.join(projectDir, 'public', 'sitemap.xml'),
    path.join(projectDir, 'src', 'sitemap.xml'),
    path.join(projectDir, 'sitemap.xml'),
    path.join(projectDir, 'dist', 'sitemap.xml')
  ];

  // Also check for any dist/*/browser/sitemap.xml
  const distDir = path.join(projectDir, 'dist');
  if (fs.existsSync(distDir)) {
    try {
      const distEntries = fs.readdirSync(distDir);
      for (const entry of distEntries) {
        const browserSitemap = path.join(distDir, entry, 'browser', 'sitemap.xml');
        if (fs.existsSync(browserSitemap)) {
          possiblePaths.unshift(browserSitemap);
        }
      }
    } catch (e) {}
  }

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return null;
}

/**
 * Parse sitemap.xml and extract URLs
 * @param {string} sitemapPath - Path to sitemap.xml
 * @returns {object[]} Array of { url, path, priority }
 */
function parseSitemap(sitemapPath) {
  const content = fs.readFileSync(sitemapPath, 'utf-8');
  const urls = [];

  // Simple regex parsing (works for standard sitemaps)
  const urlRegex = /<url>([\s\S]*?)<\/url>/g;
  const locRegex = /<loc>(.*?)<\/loc>/;
  const priorityRegex = /<priority>(.*?)<\/priority>/;

  let match;
  while ((match = urlRegex.exec(content)) !== null) {
    const urlBlock = match[1];
    const locMatch = urlBlock.match(locRegex);
    const priorityMatch = urlBlock.match(priorityRegex);

    if (locMatch) {
      const fullUrl = locMatch[1];
      // Extract path from URL
      const urlObj = new URL(fullUrl);
      urls.push({
        url: fullUrl,
        path: urlObj.pathname,
        priority: priorityMatch ? parseFloat(priorityMatch[1]) : 0.5
      });
    }
  }

  return urls;
}

/**
 * Find the guide-loader or similar dynamic loader file
 * @param {string} projectDir - Project directory
 * @returns {object|null} Loader info { path, mappings }
 */
function findDynamicLoader(projectDir) {
  // Common patterns for dynamic loaders
  const patterns = [
    '**/guide-loader.generated.ts',
    '**/content-loader.generated.ts',
    '**/*.loader.generated.ts'
  ];

  // Simple search in common locations
  const searchDirs = [
    path.join(projectDir, 'src', 'app'),
    path.join(projectDir, 'src')
  ];

  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;

    const result = findGeneratedLoader(dir);
    if (result) return result;
  }

  return null;
}

/**
 * Recursively find *.generated.ts files with loader mappings
 */
function findGeneratedLoader(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return null;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory() && !['node_modules', 'dist', '.git'].includes(entry.name)) {
      const result = findGeneratedLoader(fullPath);
      if (result) return result;
    } else if (entry.isFile() && entry.name.endsWith('.generated.ts')) {
      const mappings = parseLoaderMappings(fullPath);
      if (mappings && Object.keys(mappings).length > 0) {
        return { path: fullPath, mappings };
      }
    }
  }

  return null;
}

/**
 * Parse a generated loader file to extract slug -> component mappings
 * @param {string} filePath - Path to generated loader file
 * @returns {object|null} Map of slug -> import path
 */
function parseLoaderMappings(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const mappings = {};

  // Match patterns like:
  // 'slug-name': { importFn: () => import('../path/to/component'), ... }
  const entryRegex = /'([^']+)':\s*\{\s*importFn:\s*\(\)\s*=>\s*import\s*\(\s*'([^']+)'\s*\)/g;

  let match;
  while ((match = entryRegex.exec(content)) !== null) {
    const slug = match[1];
    const importPath = match[2];
    mappings[slug] = importPath;
  }

  return mappings;
}

/**
 * Map a URL path to its component files
 * @param {string} urlPath - URL path (e.g., /guide/my-slug)
 * @param {object} loader - Dynamic loader info
 * @param {object[]} resolvedRoutes - Routes with resolved files
 * @param {string} projectDir - Project directory
 * @returns {object|null} { html, scss, component }
 */
function mapUrlToComponent(urlPath, loader, resolvedRoutes, projectDir) {
  // Check if this is a dynamic route handled by the loader
  if (loader) {
    // Extract slug from paths like /guide/my-slug
    const slugMatch = urlPath.match(/\/guide\/([^\/]+)$/);
    if (slugMatch) {
      const slug = slugMatch[1];
      const importPath = loader.mappings[slug];
      if (importPath) {
        return resolveImportPath(importPath, loader.path, projectDir);
      }
    }
  }

  // Try to match against resolved routes
  if (resolvedRoutes) {
    // Normalize URL path
    const normalizedUrl = urlPath.replace(/\/$/, '') || '/';

    // Try exact match first
    for (const route of resolvedRoutes) {
      const routePath = route.path.replace(/\/$/, '') || '/';
      if (routePath === normalizedUrl) {
        return {
          html: route.files.html,
          scss: route.files.scss,
          component: route.component || route.loadComponent?.exportName
        };
      }
    }

    // Try pattern match (for :param routes)
    for (const route of resolvedRoutes) {
      const routePath = route.path.replace(/\/$/, '') || '/';
      // Convert route pattern to regex: /guide/:slug -> /guide/[^/]+
      const pattern = routePath.replace(/:[^\/]+/g, '[^/]+');
      const regex = new RegExp('^' + pattern + '$');
      if (regex.test(normalizedUrl)) {
        return {
          html: route.files.html,
          scss: route.files.scss,
          component: route.component || route.loadComponent?.exportName
        };
      }
    }
  }

  return null;
}

/**
 * Resolve an import path to actual file paths
 * @param {string} importPath - Import path from loader
 * @param {string} loaderPath - Path to the loader file
 * @param {string} projectDir - Project directory
 * @returns {object|null} { html, scss, component }
 */
function resolveImportPath(importPath, loaderPath, projectDir) {
  const loaderDir = path.dirname(loaderPath);
  let componentDir;

  if (importPath.startsWith('../') || importPath.startsWith('./')) {
    componentDir = path.resolve(loaderDir, importPath);
  } else {
    componentDir = path.resolve(projectDir, 'src', 'app', importPath);
  }

  // The import usually points to a file without extension
  const baseName = path.basename(componentDir);
  const parentDir = path.dirname(componentDir);

  // Try to find HTML and SCSS files
  const htmlPatterns = [
    `${baseName}.html`,
    `${baseName}.component.html`
  ];
  const scssPatterns = [
    `${baseName}.scss`,
    `${baseName}.component.scss`,
    `${baseName}.css`,
    `${baseName}.component.css`
  ];

  let html = null;
  let scss = null;

  // Check if componentDir is actually a directory
  if (fs.existsSync(componentDir) && fs.statSync(componentDir).isDirectory()) {
    const files = fs.readdirSync(componentDir);
    for (const pattern of htmlPatterns) {
      if (files.includes(pattern)) {
        html = path.join(componentDir, pattern);
        break;
      }
    }
    for (const pattern of scssPatterns) {
      if (files.includes(pattern)) {
        scss = path.join(componentDir, pattern);
        break;
      }
    }
  } else {
    // Try as file path
    for (const pattern of htmlPatterns) {
      const htmlPath = path.join(parentDir, pattern);
      if (fs.existsSync(htmlPath)) {
        html = htmlPath;
        break;
      }
    }
    for (const pattern of scssPatterns) {
      const scssPath = path.join(parentDir, pattern);
      if (fs.existsSync(scssPath)) {
        scss = scssPath;
        break;
      }
    }
  }

  if (html || scss) {
    return { html, scss, component: baseName };
  }

  return null;
}

/**
 * Get check function by name
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
 * Count errors from issues
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
 * Get check names by type from registry
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
 * Analyze a single URL/page with pre-resolved files
 * @param {object} urlInfo - URL information { url, path, priority }
 * @param {object} pageFiles - Pre-resolved page files from PageResolver
 * @param {string} componentName - Component name
 * @param {object} registry - Check registry
 * @param {string[]} htmlChecks - HTML check names
 * @param {string[]} scssChecks - SCSS check names
 * @returns {object} Analysis result
 */
function analyzeUrl(urlInfo, pageFiles, componentName, registry, htmlChecks, scssChecks) {
  const result = {
    url: urlInfo.url,
    path: urlInfo.path,
    priority: urlInfo.priority,
    component: componentName || null,
    files: [],
    childComponents: pageFiles?.components || [],
    auditScore: 100,
    auditsTotal: 0,
    auditsPassed: 0,
    auditsFailed: 0,
    issues: [],
    audits: []
  };

  if (!pageFiles || (pageFiles.htmlFiles.length === 0 && pageFiles.scssFiles.length === 0)) {
    result.error = 'Could not resolve component';
    return result;
  }

  const checkAggregates = {};

  // Analyze all HTML files (already resolved by PageResolver)
  for (const htmlFile of pageFiles.htmlFiles) {
    if (!fs.existsSync(htmlFile)) continue;
    
    result.files.push(htmlFile);
    const content = fs.readFileSync(htmlFile, 'utf-8');

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

      for (const issue of checkResult.issues) {
        result.issues.push({
          message: typeof issue === 'string' ? issue : issue.message,
          file: htmlFile,
          check: checkName
        });
      }
    }
  }

  // Analyze inline templates from components
  for (const { selector, template } of (pageFiles.inlineTemplates || [])) {
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

      for (const issue of checkResult.issues) {
        result.issues.push({
          message: typeof issue === 'string' ? issue : issue.message,
          file: `<${selector}> (inline template)`,
          check: checkName
        });
      }
    }
  }

  // Analyze all SCSS files (already resolved by PageResolver)
  for (const scssFile of pageFiles.scssFiles) {
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

      for (const issue of checkResult.issues) {
        result.issues.push({
          message: typeof issue === 'string' ? issue : issue.message,
          file: scssFile,
          check: checkName
        });
      }
    }
  }

  // Calculate audit score
  const auditResult = calculateAuditScore(checkAggregates);
  result.auditScore = auditResult.score;
  result.auditsTotal = auditResult.passed + auditResult.failed;
  result.auditsPassed = auditResult.passed;
  result.auditsFailed = auditResult.failed;
  result.audits = auditResult.audits;

  return result;
}

/**
 * Analyze an Angular project using its sitemap
 * @param {string} projectDir - Project directory
 * @param {object} options - Options
 * @param {boolean} options.deepResolve - Enable deep component resolution (default: false)
 *   When false: analyzes each component independently (better for fixing)
 *   When true: bundles parent + child components per page (Lighthouse-like scores)
 * @returns {object} Analysis results
 */
function analyzeBySitemap(projectDir, options = {}) {
  const tier = options.tier || 'material';
  const deepResolve = options.deepResolve === true; // Default to false (component-level analysis)

  // Find sitemap
  const sitemapPath = options.sitemap || findSitemap(projectDir);
  if (!sitemapPath) {
    return {
      error: 'No sitemap.xml found. Create one or specify path with --sitemap option.',
      urls: [],
      urlCount: 0
    };
  }

  // Parse sitemap
  const urls = parseSitemap(sitemapPath);
  if (urls.length === 0) {
    return {
      error: 'Sitemap is empty or could not be parsed.',
      urls: [],
      urlCount: 0
    };
  }

  // Load check registry
  const fullRegistry = loadAllChecks();
  const registry = getChecksByTier(fullRegistry, tier);
  const htmlChecks = getCheckNamesByType(registry, 'html');
  const scssChecks = getCheckNamesByType(registry, 'scss');

  // Preprocessing: Build page resolver for deep component resolution
  let pageResolver = null;
  if (deepResolve) {
    pageResolver = createPageResolver(projectDir);
  }

  // Find dynamic loader
  const loader = findDynamicLoader(projectDir);

  // Parse routes and resolve component files
  const parsed = parseAngularRoutes(projectDir);
  const resolvedRoutes = parsed.routes.length > 0
    ? resolveAllRoutes(parsed.routes, projectDir)
    : [];

  // Analyze each URL
  const urlResults = [];
  let resolved = 0;
  let unresolved = 0;
  let totalChildComponents = 0;

  for (const urlInfo of urls) {
    // Step 1: Map URL to primary component files
    const routeFiles = mapUrlToComponent(urlInfo.path, loader, resolvedRoutes, projectDir);
    
    // Step 2: Preprocessing - resolve all page files (primary + children)
    const pageFiles = pageResolver 
      ? pageResolver.resolveRouteFiles(routeFiles)
      : {
          htmlFiles: routeFiles?.html ? [routeFiles.html] : [],
          scssFiles: routeFiles?.scss ? [routeFiles.scss] : [],
          inlineTemplates: [],
          components: []
        };
    
    // Step 3: Analyze the fully resolved page
    const componentName = routeFiles?.component || null;
    const result = analyzeUrl(urlInfo, pageFiles, componentName, registry, htmlChecks, scssChecks);
    urlResults.push(result);

    if (routeFiles) {
      resolved++;
      totalChildComponents += result.childComponents.length;
    } else {
      unresolved++;
    }
  }

  // Calculate distribution
  const passing = urlResults.filter(r => r.auditScore >= 90).length;
  const warning = urlResults.filter(r => r.auditScore >= 50 && r.auditScore < 90).length;
  const failing = urlResults.filter(r => r.auditScore < 50).length;

  // Sort by score (worst first)
  const sortedUrls = [...urlResults].sort((a, b) => a.auditScore - b.auditScore);

  // Get worst URLs
  const worstUrls = sortedUrls.slice(0, 5).map(url => {
    const issuesByCheck = {};
    for (const issue of url.issues) {
      if (!issuesByCheck[issue.check]) issuesByCheck[issue.check] = 0;
      issuesByCheck[issue.check]++;
    }
    const topIssues = Object.entries(issuesByCheck)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([check, count]) => ({ check, count }));

    return {
      url: url.url,
      path: url.path,
      score: url.auditScore,
      topIssues
    };
  });

  // Find internal pages not in sitemap (admin/auth routes)
  const sitemapPaths = new Set(urls.map(u => u.path));
  const internalRoutes = resolvedRoutes.filter(r => !sitemapPaths.has(r.path));

  // Analyze internal routes (using same preprocessing)
  const internalResults = [];
  for (const route of internalRoutes.slice(0, 50)) { // Limit to 50
    const routeFiles = {
      html: route.files.html,
      scss: route.files.scss,
      component: route.component || route.loadComponent?.exportName
    };
    
    // Preprocessing - resolve all page files
    const pageFiles = pageResolver 
      ? pageResolver.resolveRouteFiles(routeFiles)
      : {
          htmlFiles: routeFiles.html ? [routeFiles.html] : [],
          scssFiles: routeFiles.scss ? [routeFiles.scss] : [],
          inlineTemplates: [],
          components: []
        };
    
    const result = analyzeUrl(
      { url: route.path, path: route.path, priority: 0 },
      pageFiles,
      routeFiles.component,
      registry,
      htmlChecks,
      scssChecks
    );
    internalResults.push(result);
  }

  const internalPassing = internalResults.filter(r => r.auditScore >= 90).length;
  const internalWarning = internalResults.filter(r => r.auditScore >= 50 && r.auditScore < 90).length;
  const internalFailing = internalResults.filter(r => r.auditScore < 50).length;

  // Get stats from pageResolver
  const resolverStats = pageResolver ? pageResolver.getStats() : null;

  return {
    tier,
    sitemapPath,
    urlCount: urls.length,
    resolved,
    unresolved,
    distribution: { passing, warning, failing },
    urls: sortedUrls,
    worstUrls,
    // Deep resolution stats
    deepResolve: deepResolve ? {
      enabled: true,
      componentsInRegistry: resolverStats?.total || 0,
      childComponentsAnalyzed: totalChildComponents
    } : { enabled: false },
    // Internal pages (not in sitemap)
    internal: {
      count: internalRoutes.length,
      analyzed: internalResults.length,
      distribution: { passing: internalPassing, warning: internalWarning, failing: internalFailing },
      routes: internalResults.sort((a, b) => a.auditScore - b.auditScore)
    }
  };
}

/**
 * Format sitemap analysis results for console
 */
function formatSitemapResults(results) {
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
    return lines.join('\n');
  }

  lines.push('Tier: ' + results.tier.toUpperCase());
  lines.push('Source: ' + results.sitemapPath);

  // Show analysis mode with explanation
  if (isDeep) {
    lines.push('Mode: Page-level (--deep)');
    lines.push(`  Each URL analyzed with all child components bundled`);
    lines.push(`  Components in Registry: ${results.deepResolve.componentsInRegistry}`);
    lines.push(`  Child Components Analyzed: ${results.deepResolve.childComponentsAnalyzed}`);
  } else {
    lines.push('Mode: Component-level (default)');
    lines.push(`  Each route component analyzed independently`);
    lines.push(`  Use --deep for page-level scores with child components`);
  }
  lines.push('');

  const d = results.distribution;
  const scoreLabel = isDeep ? 'PAGE SCORES' : 'ROUTE SCORES';
  lines.push(`${scoreLabel} (${results.urlCount} routes from sitemap):`);
  lines.push(`  🟢 Passing (90-100%): ${d.passing}`);
  lines.push(`  🟡 Needs Work (50-89%): ${d.warning}`);
  lines.push(`  🔴 Failing (<50%): ${d.failing}`);
  if (results.unresolved > 0) {
    lines.push(`  ⚪ Unresolved: ${results.unresolved}`);
  }
  lines.push('');

  lines.push('ROUTES:');
  for (const url of results.urls.slice(0, 20)) {
    const score = String(url.auditScore).padStart(3) + '%';
    const icon = url.auditScore >= 90 ? '🟢' : url.auditScore >= 50 ? '🟡' : '🔴';
    lines.push(`  ${icon} ${score}  ${url.path}`);
  }
  if (results.urls.length > 20) {
    lines.push(`  ... and ${results.urls.length - 20} more routes`);
  }
  lines.push('');

  if (results.worstUrls && results.worstUrls.length > 0) {
    lines.push('FIX PRIORITIES:');
    for (let i = 0; i < Math.min(3, results.worstUrls.length); i++) {
      const worst = results.worstUrls[i];
      if (worst.score >= 90) continue;
      lines.push(`  ${i + 1}. ${worst.path} (${worst.score}%)`);
      for (const issue of worst.topIssues) {
        lines.push(`     - ${issue.check}: ${issue.count} errors`);
      }
      lines.push('');
    }
  }

  // Internal routes section (not in sitemap)
  if (results.internal && results.internal.count > 0) {
    lines.push('----------------------------------------');
    lines.push('');
    lines.push(`INTERNAL ROUTES (${results.internal.count} not in sitemap):`);
    const id = results.internal.distribution;
    lines.push(`  🟢 Passing: ${id.passing}  🟡 Needs Work: ${id.warning}  🔴 Failing: ${id.failing}`);

    // Show worst internal routes
    const worstInternal = results.internal.routes.filter(r => r.auditScore < 90).slice(0, 5);
    if (worstInternal.length > 0) {
      lines.push('');
      lines.push('  Worst internal routes:');
      for (const route of worstInternal) {
        const icon = route.auditScore >= 90 ? '🟢' : route.auditScore >= 50 ? '🟡' : '🔴';
        lines.push(`    ${icon} ${route.auditScore}%  ${route.path}`);
      }
    }
    lines.push('');
  }

  lines.push('========================================');

  return lines.join('\n');
}

module.exports = {
  findSitemap,
  parseSitemap,
  findDynamicLoader,
  mapUrlToComponent,
  analyzeBySitemap,
  formatSitemapResults
};
