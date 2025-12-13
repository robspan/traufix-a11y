/**
 * Fixture Generator
 *
 * Generates realistic test fixtures by running actual checks against
 * their verify files. This ensures formatters are tested with real
 * check output, not hand-crafted examples.
 *
 * Mixes:
 * - Different file types (HTML, SCSS)
 * - Different categories (html, scss, angular, material, cdk)
 * - Different severities (Error, Warning, Info)
 */

'use strict';

const path = require('path');
const fs = require('fs');
const { loadAllChecks } = require('../../src/core/loader');
const { parseVerifyFile, detectFileType } = require('../../src/core/parser');
const { TIERS } = require('../../src/index.js');

const CHECKS_DIR = path.join(__dirname, '..', '..', 'src', 'checks');

/**
 * Get category for a check name
 * @param {string} checkName
 * @returns {string} Category: 'html', 'scss', 'angular', 'material', 'cdk'
 */
function getCheckCategory(checkName) {
  const full = TIERS.full;
  if (full.material.includes(checkName)) return 'material';
  if (full.angular.includes(checkName)) return 'angular';
  if (full.cdk.includes(checkName)) return 'cdk';
  if (full.scss.includes(checkName)) return 'scss';
  return 'html';
}

/**
 * Load all verify file fail sections and run checks against them
 * @returns {Array} Array of { checkName, type, category, issues, elementsFound, hasErrors, hasWarnings }
 */
function loadAllCheckResults() {
  const registry = loadAllChecks();
  const results = [];

  for (const [checkName, checkModule] of registry) {
    const checkPath = path.join(CHECKS_DIR, checkName);
    const ext = checkModule.type === 'html' ? '.html' : '.scss';
    const verifyPath = path.join(checkPath, `verify${ext}`);

    if (!fs.existsSync(verifyPath)) continue;

    try {
      const content = fs.readFileSync(verifyPath, 'utf8');
      const fileType = detectFileType(verifyPath);
      const parsed = parseVerifyFile(content, fileType);

      if (parsed.error || !parsed.failContent) continue;

      // Run the check against the fail section
      const checkResult = checkModule.check(parsed.failContent);

      if (checkResult.issues && checkResult.issues.length > 0) {
        const hasErrors = checkResult.issues.some(i => i.includes('[Error]'));
        const hasWarnings = checkResult.issues.some(i => i.includes('[Warning]'));

        results.push({
          checkName,
          type: checkModule.type,
          category: getCheckCategory(checkName),
          weight: checkModule.weight || 10,
          wcag: checkModule.wcag || null,
          issues: checkResult.issues,
          elementsFound: checkResult.elementsFound || checkResult.issues.length,
          hasErrors,
          hasWarnings
        });
      }
    } catch (e) {
      // Skip checks that fail to load
    }
  }

  return results;
}

/**
 * Shuffle array in place
 */
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Pick random items from array
 */
function pickRandom(array, count) {
  const shuffled = shuffle([...array]);
  return shuffled.slice(0, Math.min(count, array.length));
}

/**
 * Pick checks ensuring mix of categories
 * @param {Array} checkResults - All check results
 * @param {number} count - Number of checks to pick
 * @returns {Array} Selected checks from multiple categories
 */
function pickMixedCategories(checkResults, count) {
  // Group by category
  const byCategory = {};
  for (const check of checkResults) {
    byCategory[check.category] = byCategory[check.category] || [];
    byCategory[check.category].push(check);
  }

  const categories = Object.keys(byCategory);
  const selected = [];

  // Pick at least one from each category if possible
  for (const cat of categories) {
    if (selected.length >= count) break;
    if (byCategory[cat].length > 0) {
      const pick = byCategory[cat][Math.floor(Math.random() * byCategory[cat].length)];
      selected.push(pick);
      byCategory[cat] = byCategory[cat].filter(c => c !== pick);
    }
  }

  // Fill remaining slots randomly
  const remaining = checkResults.filter(c => !selected.includes(c));
  while (selected.length < count && remaining.length > 0) {
    const idx = Math.floor(Math.random() * remaining.length);
    selected.push(remaining.splice(idx, 1)[0]);
  }

  return selected;
}

/**
 * Generate a URL result with random checks from multiple categories
 * @param {string} urlPath - URL path
 * @param {Array} checkResults - Available check results
 * @param {number} issueCount - Approximate number of issues to include
 * @returns {object} URL result object
 */
function generateUrlResult(urlPath, checkResults, issueCount) {
  // Pick checks ensuring mix of categories
  const selectedChecks = pickMixedCategories(checkResults, Math.ceil(issueCount / 2) + 2);

  const issues = [];
  const audits = [];
  const files = new Set();
  let totalWeight = 0;
  let failedWeight = 0;

  for (const check of selectedChecks) {
    // Pick 1-3 issues from this check
    const checkIssues = pickRandom(check.issues, Math.min(3, check.issues.length));
    const fileExt = check.type === 'html' ? 'html' : 'scss';
    const filePath = `src/app${urlPath === '/' ? '/home' : urlPath}/component.${fileExt}`;
    files.add(filePath);

    for (const issue of checkIssues) {
      issues.push({
        check: check.checkName,
        message: issue,
        file: filePath,
        line: Math.floor(Math.random() * 100) + 1
      });
    }

    const passed = checkIssues.length === 0;
    const errors = checkIssues.filter(i => i.includes('[Error]')).length;
    const warnings = checkIssues.length - errors;

    audits.push({
      name: check.checkName,
      weight: check.weight,
      passed,
      elementsFound: check.elementsFound,
      errors,
      warnings,
      issues: checkIssues.length
    });

    totalWeight += check.weight;
    if (!passed) failedWeight += check.weight;
  }

  // Add some passing audits from different categories for realism
  const passingChecks = pickMixedCategories(
    checkResults.filter(c => !selectedChecks.includes(c)),
    Math.floor(Math.random() * 3) + 2
  );

  for (const check of passingChecks) {
    audits.push({
      name: check.checkName,
      weight: check.weight,
      passed: true,
      elementsFound: Math.floor(Math.random() * 10) + 1,
      errors: 0,
      warnings: 0,
      issues: 0
    });
    totalWeight += check.weight;
  }

  // Calculate score
  const auditScore = totalWeight > 0
    ? Math.round(((totalWeight - failedWeight) / totalWeight) * 100)
    : 100;

  const component = urlPath === '/'
    ? 'HomeComponent'
    : urlPath.split('/').pop().charAt(0).toUpperCase() +
      urlPath.split('/').pop().slice(1) + 'Component';

  return {
    url: `https://example.com${urlPath}`,
    path: urlPath,
    priority: Math.round((1 - Math.random() * 0.5) * 10) / 10,
    component,
    files: Array.from(files),
    auditScore,
    auditsTotal: audits.length,
    auditsPassed: audits.filter(a => a.passed).length,
    auditsFailed: audits.filter(a => !a.passed).length,
    issues,
    audits
  };
}

/**
 * Generate a complete sitemap result with random data
 * @param {object} options - Generation options
 * @returns {object} Sitemap analysis result
 */
function generateSitemapResult(options = {}) {
  const {
    urlCount = 5,
    minScore = 0,
    maxScore = 100,
    tier = 'material'
  } = options;

  const checkResults = loadAllCheckResults();
  if (checkResults.length === 0) {
    throw new Error('No check results available');
  }

  const paths = ['/', '/about', '/contact', '/products', '/services', '/blog', '/faq', '/team', '/careers', '/pricing'];
  const selectedPaths = pickRandom(paths, urlCount);

  const urls = selectedPaths.map(urlPath => {
    // Target a random score in the range
    const targetScore = minScore + Math.random() * (maxScore - minScore);
    // More issues for lower scores
    const issueCount = Math.max(0, Math.floor((100 - targetScore) / 10));
    return generateUrlResult(urlPath, checkResults, issueCount);
  });

  // Sort by score (worst first)
  urls.sort((a, b) => a.auditScore - b.auditScore);

  const distribution = {
    passing: urls.filter(u => u.auditScore >= 90).length,
    warning: urls.filter(u => u.auditScore >= 50 && u.auditScore < 90).length,
    failing: urls.filter(u => u.auditScore < 50).length
  };

  const worstUrls = urls
    .filter(u => u.auditScore < 90)
    .slice(0, 5)
    .map(u => ({
      url: u.url,
      path: u.path,
      score: u.auditScore,
      topIssues: Object.entries(
        u.issues.reduce((acc, iss) => {
          acc[iss.check] = (acc[iss.check] || 0) + 1;
          return acc;
        }, {})
      ).map(([check, count]) => ({ check, count })).slice(0, 3)
    }));

  return {
    tier,
    sitemapPath: 'public/sitemap.xml',
    urlCount: urls.length,
    resolved: urls.length,
    unresolved: 0,
    distribution,
    urls,
    worstUrls,
    internal: {
      count: 0,
      analyzed: 0,
      distribution: { passing: 0, warning: 0, failing: 0 },
      routes: []
    }
  };
}

/**
 * Generate multiple diverse fixtures
 * @returns {Array} Array of { name, data, type }
 */
function generateDiverseFixtures() {
  const fixtures = [];

  // Scenario 1: Mixed results (typical)
  fixtures.push({
    name: 'generated_mixed',
    data: generateSitemapResult({ urlCount: 5, minScore: 30, maxScore: 95 }),
    type: 'sitemap'
  });

  // Scenario 2: Mostly failing
  fixtures.push({
    name: 'generated_mostly_failing',
    data: generateSitemapResult({ urlCount: 4, minScore: 10, maxScore: 50 }),
    type: 'sitemap'
  });

  // Scenario 3: Mostly passing
  fixtures.push({
    name: 'generated_mostly_passing',
    data: generateSitemapResult({ urlCount: 4, minScore: 80, maxScore: 100 }),
    type: 'sitemap'
  });

  // Scenario 4: Large site
  fixtures.push({
    name: 'generated_large',
    data: generateSitemapResult({ urlCount: 10, minScore: 20, maxScore: 100 }),
    type: 'sitemap'
  });

  // Scenario 5: Single page (minimal)
  fixtures.push({
    name: 'generated_single',
    data: generateSitemapResult({ urlCount: 1, minScore: 40, maxScore: 80 }),
    type: 'sitemap'
  });

  // Scenario 6: All tiers
  fixtures.push({
    name: 'generated_basic_tier',
    data: generateSitemapResult({ urlCount: 3, tier: 'basic', minScore: 50, maxScore: 90 }),
    type: 'sitemap'
  });

  fixtures.push({
    name: 'generated_full_tier',
    data: generateSitemapResult({ urlCount: 3, tier: 'full', minScore: 30, maxScore: 70 }),
    type: 'sitemap'
  });

  return fixtures;
}

/**
 * Get all check results for inspection
 */
function getCheckResultsSummary() {
  const results = loadAllCheckResults();
  return results.map(r => ({
    name: r.checkName,
    type: r.type,
    issueCount: r.issues.length,
    sampleIssue: r.issues[0]?.substring(0, 80) + '...'
  }));
}

// ============================================
// CLI - run directly to see generated fixtures
// ============================================

if (require.main === module) {
  console.log('Generating fixtures from verify files...\n');

  const checkResults = loadAllCheckResults();
  console.log(`Loaded ${checkResults.length} checks with issues\n`);

  // Show category distribution
  const byCategory = {};
  let errorCount = 0, warningCount = 0;
  for (const r of checkResults) {
    byCategory[r.category] = (byCategory[r.category] || 0) + 1;
    if (r.hasErrors) errorCount++;
    if (r.hasWarnings) warningCount++;
  }
  console.log('Categories:');
  for (const [cat, count] of Object.entries(byCategory).sort()) {
    console.log(`  ${cat}: ${count} checks`);
  }
  console.log(`\nSeverity mix:`);
  console.log(`  Checks with errors: ${errorCount}`);
  console.log(`  Checks with warnings: ${warningCount}`);
  console.log('');

  // Show sample of what we found
  console.log('Sample check results (one per category):');
  const shown = new Set();
  for (const r of checkResults) {
    if (shown.has(r.category)) continue;
    shown.add(r.category);
    const severity = r.hasErrors ? 'Error' : r.hasWarnings ? 'Warning' : 'Info';
    console.log(`  [${r.category}] ${r.checkName} (${severity}):`);
    console.log(`    "${r.issues[0]?.substring(0, 70)}..."`);
  }
  console.log('');

  // Generate fixtures
  const fixtures = generateDiverseFixtures();
  console.log(`Generated ${fixtures.length} diverse fixtures:\n`);

  for (const f of fixtures) {
    const d = f.data.distribution;
    // Count categories in this fixture
    const cats = new Set();
    for (const url of f.data.urls) {
      for (const audit of url.audits) {
        const checkResult = checkResults.find(c => c.checkName === audit.name);
        if (checkResult) cats.add(checkResult.category);
      }
    }
    console.log(`  ${f.name}:`);
    console.log(`    URLs: ${f.data.urlCount}, Pass: ${d.passing}, Warn: ${d.warning}, Fail: ${d.failing}`);
    console.log(`    Categories: ${Array.from(cats).sort().join(', ')}`);
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  loadAllCheckResults,
  generateUrlResult,
  generateSitemapResult,
  generateDiverseFixtures,
  getCheckResultsSummary
};
