#!/usr/bin/env node

/**
 * Development Tests - Check Verification
 * 
 * Verifies that each of the 82 accessibility checks works correctly
 * by testing against their verify.html/verify.scss files.
 * 
 * Each verify file contains:
 * - @a11y-pass: Code that should NOT trigger issues
 * - @a11y-fail: Code that SHOULD trigger issues
 * - @a11y-false-positive: Accessible code that naive checks might incorrectly flag
 * - @a11y-false-negative: Inaccessible code that naive checks might miss
 * 
 * This is a DEVELOPMENT test - it verifies the tool internals work as specified.
 */

const { verifyByTier, getVerifySummary, formatVerifyResults } = require('../../src/core/verifier');

// ANSI colors
const c = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
};

function runTests() {
  console.log('\n' + c.bold + '========================================' + c.reset);
  console.log(c.bold + '  DEV TEST: CHECK VERIFICATION' + c.reset);
  console.log(c.bold + '========================================' + c.reset + '\n');
  console.log(c.dim + 'Verifying all 82 checks work correctly against their verify files.' + c.reset + '\n');

  const results = verifyByTier('full');
  const summary = getVerifySummary(results);

  // Output formatted results
  console.log(formatVerifyResults(results, { verbose: true }));

  // Summary
  console.log('');
  console.log(c.bold + '========================================' + c.reset);
  console.log(c.bold + '  RESULTS' + c.reset);
  console.log(c.bold + '========================================' + c.reset);
  console.log('');
  console.log('  ' + c.green + 'Verified: ' + summary.verified + c.reset);
  console.log('  ' + c.red + 'Failed:   ' + summary.failed + c.reset);
  console.log('  ' + c.yellow + 'Skipped:  ' + summary.skipped + c.reset);
  console.log('');

  const total = summary.verified + summary.failed;
  const passRate = total > 0 ? ((summary.verified / total) * 100).toFixed(1) : 0;

  if (summary.failed === 0 && summary.verified > 0) {
    console.log(c.green + c.bold + '  ✅ All checks verified!' + c.reset);
  } else if (summary.failed > 0) {
    console.log(c.red + '  ❌ Some checks failed verification.' + c.reset);
  }

  console.log('\n' + c.dim + 'Pass rate: ' + passRate + '% (' + summary.verified + '/' + total + ')' + c.reset + '\n');

  process.exit(summary.failed > 0 ? 1 : 0);
}

runTests();
