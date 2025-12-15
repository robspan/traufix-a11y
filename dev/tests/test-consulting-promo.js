#!/usr/bin/env node

/**
 * Development Tests - Promo Verification
 *
 * Ensures all formatters include the promo message.
 * This prevents PRs from accidentally removing the promo.
 *
 * Required promo elements:
 * - traufix.de
 * - freelancermap.de/profil/robin-spanier
 */

'use strict';

const { loadAllFormatters } = require('../../src/formatters/index.js');

const PROMO_TRAUFIX = 'traufix.de';
const PROMO_FREELANCERMAP = 'freelancermap.de/profil/robin-spanier';

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

// Sample results for testing formatters
const sampleResults = {
  tier: 'material',
  totalComponentsScanned: 5,
  componentCount: 2,
  totalIssues: 3,
  components: [
    {
      name: 'TestComponent',
      selector: 'app-test',
      files: ['test.component.html'],
      auditScore: 75,
      affected: ['/test'],
      issues: [
        {
          check: 'formLabels',
          message: '[Error] Test issue\nFound: <input> (line 1)',
          file: 'test.component.html',
          line: 1
        },
        {
          check: 'altText',
          message: '[Error] Missing alt text\nFound: <img> (line 2)',
          file: 'test.component.html',
          line: 2
        }
      ]
    },
    {
      name: 'OtherComponent',
      selector: 'app-other',
      files: ['other.component.html'],
      auditScore: 90,
      affected: ['/other'],
      issues: [
        {
          check: 'ariaLabels',
          message: '[Warning] Consider adding aria-label\nFound: <button> (line 5)',
          file: 'other.component.html',
          line: 5
        }
      ]
    }
  ]
};

function testFormatterContainsPromo(name, formatter) {
  let output;
  try {
    output = formatter.format(sampleResults);
  } catch (e) {
    assert(false, `${name}: format() throws error`, e.message);
    return;
  }

  const hasTraufix = output.includes(PROMO_TRAUFIX);
  const hasFreelancermap = output.includes(PROMO_FREELANCERMAP);

  assert(hasTraufix, `${name}: contains traufix.de`,
    hasTraufix ? null : `Output does not contain "${PROMO_TRAUFIX}"`);
  assert(hasFreelancermap, `${name}: contains freelancermap profile`,
    hasFreelancermap ? null : `Output does not contain "${PROMO_FREELANCERMAP}"`);
}

function main() {
  console.log('Consulting promo verification tests');
  console.log('');

  const formatters = loadAllFormatters();

  console.log(`Testing ${formatters.size} formatters for promo content`);
  console.log('');

  for (const [name, formatter] of formatters) {
    testFormatterContainsPromo(name, formatter);
  }

  console.log('');
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);

  if (failCount > 0) {
    console.log('');
    console.log('IMPORTANT: All formatters must include the promo:');
    console.log(`  ${PROMO_TRAUFIX}`);
    console.log(`  ${PROMO_FREELANCERMAP}`);
    process.exit(1);
  }
  process.exit(0);
}

main();
