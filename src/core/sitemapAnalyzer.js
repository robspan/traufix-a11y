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
 * Analyze a single URL's component
 */
function analyzeUrl(urlInfo, files, registry, htmlChecks, scssChecks) {
  const result = {
    url: urlInfo.url,
    path: urlInfo.path,
    priority: urlInfo.priority,
    component: files?.component || null,
    files: [],
    auditScore: 100,
    auditsTotal: 0,
    auditsPassed: 0,
    auditsFailed: 0,
    issues: [],
    audits: []
  };

  if (!files) {
    result.error = 'Could not resolve component';
    return result;
  }

  const checkAggregates = {};

  // Analyze HTML
  if (files.html && fs.existsSync(files.html)) {
    result.files.push(files.html);
    const content = fs.readFileSync(files.html, 'utf-8');

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
          file: files.html,
          check: checkName
        });
      }
    }
  }

  // Analyze SCSS
  if (files.scss && fs.existsSync(files.scss)) {
    result.files.push(files.scss);
    const content = fs.readFileSync(files.scss, 'utf-8');

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
          file: files.scss,
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
 * @returns {object} Analysis results
 */
function analyzeBySitemap(projectDir, options = {}) {
  const tier = options.tier || 'material';

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

  for (const urlInfo of urls) {
    const files = mapUrlToComponent(urlInfo.path, loader, resolvedRoutes, projectDir);
    const result = analyzeUrl(urlInfo, files, registry, htmlChecks, scssChecks);
    urlResults.push(result);

    if (files) {
      resolved++;
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

  // Analyze internal routes
  const internalResults = [];
  for (const route of internalRoutes.slice(0, 50)) { // Limit to 50
    const files = {
      html: route.files.html,
      scss: route.files.scss,
      component: route.component || route.loadComponent?.exportName
    };
    const result = analyzeUrl(
      { url: route.path, path: route.path, priority: 0 },
      files,
      registry,
      htmlChecks,
      scssChecks
    );
    internalResults.push(result);
  }

  const internalPassing = internalResults.filter(r => r.auditScore >= 90).length;
  const internalWarning = internalResults.filter(r => r.auditScore >= 50 && r.auditScore < 90).length;
  const internalFailing = internalResults.filter(r => r.auditScore < 50).length;

  return {
    tier,
    sitemapPath,
    urlCount: urls.length,
    resolved,
    unresolved,
    distribution: { passing, warning, failing },
    urls: sortedUrls,
    worstUrls,
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

  lines.push('========================================');
  lines.push('  MAT-A11Y SITEMAP ANALYSIS');
  lines.push('========================================');
  lines.push('');

  if (results.error) {
    lines.push('Error: ' + results.error);
    return lines.join('\n');
  }

  lines.push('Tier: ' + results.tier.toUpperCase());
  lines.push('Sitemap: ' + results.sitemapPath);
  lines.push('');

  const d = results.distribution;
  lines.push(`URL SCORES (${results.urlCount} URLs):`);
  lines.push(`  🟢 Passing (90-100%): ${d.passing} URLs`);
  lines.push(`  🟡 Needs Work (50-89%): ${d.warning} URLs`);
  lines.push(`  🔴 Failing (<50%): ${d.failing} URLs`);
  if (results.unresolved > 0) {
    lines.push(`  ⚪ Unresolved: ${results.unresolved} URLs`);
  }
  lines.push('');

  lines.push('URLS:');
  for (const url of results.urls.slice(0, 20)) {
    const score = String(url.auditScore).padStart(3) + '%';
    const icon = url.auditScore >= 90 ? '🟢' : url.auditScore >= 50 ? '🟡' : '🔴';
    lines.push(`  ${icon} ${score}  ${url.path}`);
  }
  if (results.urls.length > 20) {
    lines.push(`  ... and ${results.urls.length - 20} more URLs`);
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

  // Internal pages section (not in sitemap)
  if (results.internal && results.internal.count > 0) {
    lines.push('----------------------------------------');
    lines.push('');
    lines.push(`INTERNAL PAGES (${results.internal.count} routes not in sitemap):`);
    const id = results.internal.distribution;
    lines.push(`  🟢 Passing: ${id.passing}  🟡 Needs Work: ${id.warning}  🔴 Failing: ${id.failing}`);

    // Show worst internal routes
    const worstInternal = results.internal.routes.filter(r => r.auditScore < 90).slice(0, 5);
    if (worstInternal.length > 0) {
      lines.push('');
      lines.push('  Worst internal pages:');
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
