'use strict';

/**
 * Formatter Result Utilities
 *
 * Goal: formatters should not care which aggregation method produced the results.
 * This module normalizes different result shapes into a common representation.
 *
 * Supported inputs:
 * - Sitemap analysis: { urlCount, distribution, urls, internal.routes }
 * - Route analysis:   { routeCount, routes, distribution? }
 * - File-based scan:  { summary.issues, summary.auditScore, files }
 * - Component scan:   { components: [{ name, issues: [...] }], auditScore }
 */

const { collectPages, getTotalCount, getDistribution, getPathLabel } = require('./page-utils');
const { getWeight } = require('../core/weights');

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeIssue(issue, fallback = {}) {
  if (!issue || typeof issue !== 'object') {
    return {
      check: fallback.check || 'unknown',
      message: String(issue || ''),
      file: fallback.file || 'unknown',
      line: fallback.line || 1
    };
  }

  return {
    check: issue.check || fallback.check || 'unknown',
    message: issue.message || fallback.message || '',
    file: issue.file || fallback.file || 'unknown',
    line: issue.line || fallback.line || 1,
    element: issue.element
  };
}

function scoreFromIssues(issues) {
  const n = asArray(issues).length;
  return n === 0 ? 100 : 0;
}

function scoreFromCheckAggregates(checkAggregates) {
  if (!checkAggregates || typeof checkAggregates !== 'object') return null;

  let auditsTotal = 0;
  let auditsPassed = 0;

  for (const data of Object.values(checkAggregates)) {
    if (!data || typeof data !== 'object') continue;

    const elementsFound = Number(data.elementsFound || 0);
    const issues = Number(data.issues || 0);
    const errors = Number(data.errors || 0);
    const warnings = Number(data.warnings || 0);

    // Treat checks as "applicable" when they actually encountered something
    // (elements found) or recorded any findings.
    const applicable = elementsFound > 0 || issues > 0 || errors > 0 || warnings > 0;
    if (!applicable) continue;

    auditsTotal++;

    const ok = issues === 0 && errors === 0 && warnings === 0;
    if (ok) auditsPassed++;
  }

  const auditScore = auditsTotal === 0 ? 100 : Math.round((auditsPassed / auditsTotal) * 100);
  return { auditScore, auditsPassed, auditsTotal };
}

function normalizeEntities(results) {
  if (!results || typeof results !== 'object') return [];

  // Component-based analysis
  if (Array.isArray(results.components)) {
    return results.components.map(comp => {
      const issues = asArray(comp.issues).map(i => normalizeIssue(i));

      const fromAggregates = scoreFromCheckAggregates(comp.checkAggregates);
      const auditScore = typeof comp.auditScore === 'number'
        ? comp.auditScore
        : (fromAggregates ? fromAggregates.auditScore : scoreFromIssues(issues));

      // Preserve affected routes/pages when available (component usage)
      const affected = comp.affectedUrls
        ? Array.from(comp.affectedUrls)
        : (Array.isArray(comp.affected) ? comp.affected : undefined);

      return {
        label: comp.name || comp.className || 'Unknown',
        kind: 'component',
        auditScore,
        issues,
        affected,
        auditsPassed: fromAggregates ? fromAggregates.auditsPassed : undefined,
        auditsTotal: fromAggregates ? fromAggregates.auditsTotal : undefined
      };
    });
  }

  // File-based analysis
  if (results.summary && Array.isArray(results.summary.issues)) {
    const issues = asArray(results.summary.issues).map(i => normalizeIssue(i));
    const auditScore = typeof results.summary.auditScore === 'number' ? results.summary.auditScore : scoreFromIssues(issues);
    return [{ label: 'files', kind: 'file', auditScore, issues }];
  }

  // Page-like analysis (sitemap/routes)
  const pages = collectPages(results);
  if (pages.length > 0) {
    return pages.map(page => {
      const issues = asArray(page.issues).map(i => normalizeIssue(i, { file: getPathLabel(page) }));
      const auditScore = typeof page.auditScore === 'number'
        ? page.auditScore
        : (typeof page.score === 'number' ? page.score : scoreFromIssues(issues));

      return {
        label: getPathLabel(page),
        kind: 'page',
        auditScore,
        issues,
        auditsPassed: typeof page.auditsPassed === 'number' ? page.auditsPassed : undefined,
        auditsTotal: typeof page.auditsTotal === 'number' ? page.auditsTotal : undefined
      };
    });
  }

  return [];
}

function computeDistributionFromEntities(entities) {
  const distribution = { passing: 0, warning: 0, failing: 0 };
  for (const e of entities) {
    const score = typeof e?.auditScore === 'number' ? e.auditScore : 0;
    if (score >= 90) distribution.passing++;
    else if (score >= 50) distribution.warning++;
    else distribution.failing++;
  }
  return distribution;
}

function normalizeResults(results) {
  const entities = normalizeEntities(results);

  // Prefer the original total when provided (urlCount/routeCount/totalComponentsScanned), else entity length.
  const total = (() => {
    if (results && typeof results === 'object' && typeof results.totalComponentsScanned === 'number') {
      return results.totalComponentsScanned;
    }
    return getTotalCount(results, entities);
  })();

  // Prefer the original distribution when present, else compute from entities.
  const distribution = (() => {
    // Component analysis often only lists components with issues.
    // If we have scan counts, compute a score-based distribution:
    // - Assume non-listed components are clean and therefore "passing".
    // - Classify listed entities by auditScore thresholds.
    if (results && typeof results === 'object' && typeof results.totalComponentsScanned === 'number') {
      const scanned = results.totalComponentsScanned;
      const listed = typeof results.componentCount === 'number' ? results.componentCount : entities.length;
      const cleanNotListed = Math.max(0, scanned - listed);

      let passing = cleanNotListed;
      let warning = 0;
      let failing = 0;

      for (const e of entities) {
        const score = typeof e?.auditScore === 'number' ? e.auditScore : 0;
        if (score >= 90) passing++;
        else if (score >= 50) warning++;
        else failing++;
      }

      return { passing, warning, failing };
    }

    // getDistribution expects "pages"; entities are close enough because only auditScore matters.
    const fromResults = getDistribution(results, entities);
    if (fromResults && typeof fromResults === 'object') return fromResults;
    return computeDistributionFromEntities(entities);
  })();

  const tier = results?.tier || 'material';

  const issues = [];
  for (const entity of entities) {
    for (const issue of asArray(entity.issues)) {
      issues.push({
        ...normalizeIssue(issue),
        entity: entity.label,
        auditScore: entity.auditScore
      });
    }
  }

  return { tier, total, distribution, entities, issues };
}

function getWorstEntities(entities, limit = 5) {
  return asArray(entities)
    .filter(e => typeof e.auditScore === 'number')
    .sort((a, b) => (a.auditScore ?? 0) - (b.auditScore ?? 0))
    .slice(0, limit);
}

// Cache for weight lookups (weights never change at runtime)
const weightCache = new Map();
function getCachedWeight(checkName) {
  let w = weightCache.get(checkName);
  if (w === undefined) {
    w = getWeight(checkName);
    weightCache.set(checkName, w);
  }
  return w;
}

/**
 * Calculate priority for an entity in a single pass
 * priority = (sum of unique check weights / issue count) × usage
 * 
 * @param {object} entity - Entity with issues array
 * @returns {number} Priority score
 */
function calculatePriority(entity) {
  const issues = entity.issues;
  const issueCount = issues?.length || 0;
  if (issueCount === 0) return 0;

  // Single pass: collect unique checks
  let checkBits = 0; // Use object as cheap set
  const seen = Object.create(null);
  let totalWeight = 0;
  
  for (let i = 0; i < issueCount; i++) {
    const check = issues[i].check;
    if (check && !seen[check]) {
      seen[check] = 1;
      totalWeight += getCachedWeight(check);
    }
  }

  const efficiency = totalWeight / issueCount;
  
  // Usage multiplier
  const usage = Array.isArray(entity.affected) 
    ? (entity.affected.length || 1)
    : (entity.affectedUrls?.size || 1);

  return efficiency * usage;
}

/**
 * Efficiency = weight per fix (without usage multiplier)
 */
function calculateEfficiency(entity) {
  const issues = entity.issues;
  const issueCount = issues?.length || 0;
  if (issueCount === 0) return 0;

  const seen = Object.create(null);
  let totalWeight = 0;
  
  for (let i = 0; i < issueCount; i++) {
    const check = issues[i].check;
    if (check && !seen[check]) {
      seen[check] = 1;
      totalWeight += getCachedWeight(check);
    }
  }

  return totalWeight / issueCount;
}

/**
 * Get entities sorted by priority (highest bang for buck first)
 * Optimized: single pass, no object spread, in-place sort
 *
 * @param {Array} entities - Array of entities
 * @param {number} limit - Max entities to return
 * @returns {Array} Entities sorted by priority (mutates priority property)
 */
function getPriorityEntities(entities, limit = Infinity) {
  const arr = asArray(entities);
  const withIssues = [];
  
  // Single pass: filter + compute priority
  for (let i = 0; i < arr.length; i++) {
    const e = arr[i];
    if (e.issues?.length > 0) {
      e.priority = calculatePriority(e);
      withIssues.push(e);
    }
  }
  
  // In-place sort by priority descending
  withIssues.sort((a, b) => b.priority - a.priority);
  
  return limit < withIssues.length ? withIssues.slice(0, limit) : withIssues;
}

/**
 * Get weight for a check name (cached)
 * @param {string} checkName 
 * @returns {number}
 */
function getCheckWeight(checkName) {
  return getCachedWeight(checkName);
}

module.exports = {
  normalizeResults,
  normalizeEntities,
  getWorstEntities,
  getPriorityEntities,
  getCheckWeight,
  calculateEfficiency,
  calculatePriority
};
