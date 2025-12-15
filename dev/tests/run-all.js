#!/usr/bin/env node

/**
 * Development Test Runner
 * 
 * Runs all development tests that verify the tool internals work correctly.
 * These tests are for developers maintaining mat-a11y, not end users.
 * 
 * Usage:
 *   node dev/tests/run-all.js           # Quick summary (default)
 *   node dev/tests/run-all.js --verbose # Full output
 * 
 * Dev tests verify:
 * - Check implementations (82 checks against verify files)
 * - Formatters (17 formatters against fixtures)
 * - Page resolver (component registry and recursive resolution)
 * - Error robustness (PageResolver and ComponentRegistry edge cases)
 * - Verify file structure (required sections in verify files)
 */

const { execSync } = require('child_process');
const path = require('path');

const verbose = process.argv.includes('--verbose') || process.argv.includes('-v');

const c = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
};

const devToolsDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(devToolsDir, '..');

const tests = [
  { name: 'Verify Files', count: '82 files', cmd: 'node dev/verify-structure.js' },
  { name: 'Formatters', count: '17×17', cmd: 'node dev/verify-formatters.js' },
  { name: 'Package Contents', count: 'pack list clean', cmd: 'node dev/tests/test-package-contents.js' },
  { name: 'Result Normalization', count: '6 scenarios', cmd: 'node dev/tests/test-result-normalization.js' },
  { name: 'A11y Checks', count: '82 checks', cmd: 'node dev/tests/verify-checks.js' },
  { name: 'Page Resolver', count: '51 tests', cmd: 'node dev/tests/verify-page-resolver.js' },
  { name: 'SCSS Graph', count: '13 tests', cmd: 'node dev/tests/test-scss-graph.js' },
  { name: 'Issue Optimizer', count: '12 tests', cmd: 'node dev/tests/test-issue-optimizer.js' },
  { name: 'SCSS Functions', count: '43 tests', cmd: 'node dev/tests/test-scss-functions.js' },
  { name: 'Variable Resolver', count: '27 tests', cmd: 'node dev/tests/test-variable-resolver.js' },
  { name: 'Color Contrast Variables', count: '20 tests', cmd: 'node dev/tests/test-color-contrast-variables.js' },
  { name: 'CLI Smoke', count: '2 runs', cmd: 'node dev/tests/test-cli-smoke.js' },
  { name: 'CLI Matrix (basic)', count: 'varies', cmd: 'node dev/tests/test-cli-matrix.js --tier basic' },
  { name: 'Parallel Parity', count: '3 asserts', cmd: 'node dev/tests/verify-parallel-parity.js' },
  { name: 'Error Handling', count: '82 edge cases', cmd: 'node dev/tests/test-error-robustness.js' },
];

const results = [];

if (!verbose) {
  console.log('');
  console.log(c.bold + 'mat-a11y dev tests' + c.reset + c.dim + ' (use --verbose for details)' + c.reset);
  console.log('');
}

for (const test of tests) {
  if (verbose) {
    console.log('');
    console.log(c.cyan + c.bold + `━━━ ${test.name} ━━━` + c.reset);
    console.log('');
  }
  
  try {
    execSync(test.cmd, { 
      cwd: rootDir, 
      stdio: verbose ? 'inherit' : 'pipe',
      env: { ...process.env, FORCE_COLOR: '1' }
    });
    results.push({ name: test.name, count: test.count, passed: true });
    
    if (!verbose) {
      console.log(`  ${c.green}✓${c.reset} ${test.name} ${c.dim}(${test.count})${c.reset}`);
    }
  } catch (error) {
    results.push({ name: test.name, count: test.count, passed: false });
    
    if (!verbose) {
      console.log(`  ${c.red}✗${c.reset} ${test.name} ${c.dim}(${test.count})${c.reset}`);
      // Show error output on failure even in quiet mode
      if (error.stdout) console.log(error.stdout.toString());
      if (error.stderr) console.log(error.stderr.toString());
    }
  }
}

const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;

console.log('');
if (failed > 0) {
  console.log(c.red + c.bold + `✗ ${failed}/${results.length} suites failed` + c.reset);
  process.exit(1);
} else {
  console.log(c.green + c.bold + `✓ All ${results.length} test suites passed` + c.reset);
  process.exit(0);
}
