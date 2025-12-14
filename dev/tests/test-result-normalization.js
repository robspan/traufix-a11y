#!/usr/bin/env node

/**
 * Development Tests - Result Normalization
 *
 * Ensures formatter normalization produces a stable, aggregation-agnostic shape.
 *
 * This test intentionally covers all analysis result shapes:
 * - sitemap
 * - routes
 * - component-based (default CLI mode)
 * - legacy file-based
 */

'use strict';

const { normalizeResults } = require('../../src/formatters/result-utils');
const fixtures = require('../fixtures/sample-results');

let passCount = 0;
let failCount = 0;

function assert(condition, message, details) {
  if (condition) {
    passCount++;
    console.log(`  ✓ ${message}`);
  } else {
    failCount++;
    console.log(`  ✗ ${message}`);
    if (details) {
      console.log(`    ${details}`);
    }
  }
}

function assertEqual(actual, expected, message) {
  const pass = actual === expected;
  if (pass) {
    passCount++;
    console.log(`  ✓ ${message}`);
  } else {
    failCount++;
    console.log(`  ✗ ${message}`);
    console.log(`    Expected: ${expected}`);
    console.log(`    Actual:   ${actual}`);
  }
}

function assertDeepEqual(actual, expected, message) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passCount++;
    console.log(`  ✓ ${message}`);
  } else {
    failCount++;
    console.log(`  ✗ ${message}`);
    console.log(`    Expected: ${e}`);
    console.log(`    Actual:   ${a}`);
  }
}

function sumIssueCountsFromEntities(entities) {
  return (entities || []).reduce((acc, e) => acc + ((e.issues || []).length), 0);
}

function validateCommonShape(normalized, label) {
  assert(normalized && typeof normalized === 'object', `${label}: returns object`);
  assert(typeof normalized.tier === 'string' && normalized.tier.length > 0, `${label}: tier is string`);
  assert(typeof normalized.total === 'number' && Number.isFinite(normalized.total) && normalized.total >= 0, `${label}: total is number`);

  assert(normalized.distribution && typeof normalized.distribution === 'object', `${label}: distribution exists`);
  assert(typeof normalized.distribution.passing === 'number', `${label}: distribution.passing is number`);
  assert(typeof normalized.distribution.warning === 'number', `${label}: distribution.warning is number`);
  assert(typeof normalized.distribution.failing === 'number', `${label}: distribution.failing is number`);

  assert(Array.isArray(normalized.entities), `${label}: entities is array`);
  assert(Array.isArray(normalized.issues), `${label}: issues is array`);

  // Issues should be flat and have stable keys.
  for (const issue of normalized.issues.slice(0, 10)) {
    assert(typeof issue.check === 'string', `${label}: issue.check is string`);
    assert(typeof issue.message === 'string', `${label}: issue.message is string`);
    assert(typeof issue.file === 'string', `${label}: issue.file is string`);
    assert(typeof issue.line === 'number', `${label}: issue.line is number`);
    assert(typeof issue.entity === 'string', `${label}: issue.entity is string`);
    assert(typeof issue.auditScore === 'number', `${label}: issue.auditScore is number`);
  }

  // Flat issues length should match sum of entity issue arrays.
  assertEqual(normalized.issues.length, sumIssueCountsFromEntities(normalized.entities), `${label}: flat issues match entity issues`);
}

function testSitemapNormalization() {
  console.log('\nSitemap results');
  const input = fixtures.sitemapResult;
  const normalized = normalizeResults(input);

  validateCommonShape(normalized, 'sitemap');

  assertEqual(normalized.tier, input.tier, 'sitemap: tier matches input');
  assertEqual(normalized.total, input.urlCount, 'sitemap: total equals urlCount');
  assertDeepEqual(normalized.distribution, input.distribution, 'sitemap: distribution matches input');

  assertEqual(normalized.entities.length, input.urls.length, 'sitemap: entities length equals urls length');
  assert(normalized.entities.every(e => e.kind === 'page'), 'sitemap: entity kind is page');

  // Ensure internal routes are not accidentally merged into entities.
  assert(!normalized.entities.some(e => e.label === '/admin'), 'sitemap: internal routes are not included in entities');

  // A couple of stability checks on label mapping.
  assertEqual(normalized.entities[0].label, input.urls[0].path, 'sitemap: label uses path');

  // Per-page audit counts should be preserved when present.
  assertEqual(normalized.entities[0].auditsPassed, input.urls[0].auditsPassed, 'sitemap: auditsPassed preserved');
  assertEqual(normalized.entities[0].auditsTotal, input.urls[0].auditsTotal, 'sitemap: auditsTotal preserved');
}

function testRouteNormalization() {
  console.log('\nRoute results');
  const input = fixtures.routeResult;
  const normalized = normalizeResults(input);

  validateCommonShape(normalized, 'route');

  assertEqual(normalized.tier, input.tier, 'route: tier matches input');
  assertEqual(normalized.total, input.routeCount, 'route: total equals routeCount');
  assertDeepEqual(normalized.distribution, input.distribution, 'route: distribution matches input');

  assertEqual(normalized.entities.length, input.routes.length, 'route: entities length equals routes length');
  assert(normalized.entities.every(e => e.kind === 'page'), 'route: entity kind is page');

  assertEqual(normalized.entities[0].label, input.routes[0].path, 'route: label uses path');
  assertEqual(normalized.entities[0].auditsPassed, input.routes[0].auditsPassed, 'route: auditsPassed preserved');
  assertEqual(normalized.entities[0].auditsTotal, input.routes[0].auditsTotal, 'route: auditsTotal preserved');
}

function testComponentNormalization() {
  console.log('\nComponent results');
  const input = fixtures.componentResult;
  const normalized = normalizeResults(input);

  validateCommonShape(normalized, 'component');

  assertEqual(normalized.tier, input.tier, 'component: tier matches input');
  assertEqual(normalized.total, input.totalComponentsScanned, 'component: total equals totalComponentsScanned');

  // Distribution is derived for component analysis from scan counts.
  assertEqual(normalized.distribution.failing, input.componentCount, 'component: failing equals componentCount');
  assertEqual(normalized.distribution.passing, input.totalComponentsScanned - input.componentCount, 'component: passing derived from scan counts');
  assertEqual(normalized.distribution.warning, 0, 'component: warning is 0');

  assertEqual(normalized.entities.length, input.components.length, 'component: entities length equals components length');
  assert(normalized.entities.every(e => e.kind === 'component'), 'component: entity kind is component');

  assertEqual(normalized.issues.length, input.totalIssues, 'component: flat issue count equals totalIssues');
}

function testComponentNormalizationAllPassing() {
  console.log('\nComponent results (all passing)');

  const input = {
    tier: 'full',
    componentCount: 0,
    totalComponentsScanned: 5,
    totalIssues: 0,
    components: []
  };

  const normalized = normalizeResults(input);
  validateCommonShape(normalized, 'componentAllPassing');

  assertEqual(normalized.total, 5, 'componentAllPassing: total equals totalComponentsScanned');
  assertEqual(normalized.distribution.failing, 0, 'componentAllPassing: failing is 0');
  assertEqual(normalized.distribution.passing, 5, 'componentAllPassing: passing derived from scan counts');
  assertEqual(normalized.issues.length, 0, 'componentAllPassing: no issues');
}

function testFileNormalization() {
  console.log('\nFile-based results');
  const input = fixtures.fileBasedResult;
  const normalized = normalizeResults(input);

  validateCommonShape(normalized, 'file');

  assertEqual(normalized.tier, input.tier, 'file: tier matches input');
  assertEqual(normalized.entities.length, 1, 'file: single entity');
  assertEqual(normalized.entities[0].kind, 'file', 'file: entity kind is file');

  // For file-based results, total is a logical single aggregated entity.
  assertEqual(normalized.total, 1, 'file: total is 1');

  assertEqual(normalized.issues.length, input.summary.issues.length, 'file: flat issue count equals summary.issues length');
}

function testMissingFieldsStability() {
  console.log('\nMissing fields (robustness)');
  const input = fixtures.missingFieldsResult;
  const normalized = normalizeResults(input);

  validateCommonShape(normalized, 'missingFields');
  assert(typeof normalized.distribution.passing === 'number', 'missingFields: distribution always numeric');
}

function main() {
  console.log('Result normalization tests');

  testSitemapNormalization();
  testRouteNormalization();
  testComponentNormalization();
  testComponentNormalizationAllPassing();
  testFileNormalization();
  testMissingFieldsStability();

  console.log('');
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);

  if (failCount > 0) {
    process.exit(1);
  }
  process.exit(0);
}

main();
