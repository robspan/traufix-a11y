#!/usr/bin/env node
/**
 * Run all development checks
 *
 * Usage: node dev/run-checks.js [--verbose]
 */
const path = require('path');
const { execSync } = require('child_process');

const verbose = process.argv.includes('--verbose');
const rootDir = path.join(__dirname, '..');

console.log('mat-a11y Development Checks\n');
console.log('='.repeat(50));

const checks = [
  { name: 'Structure Verification', cmd: 'node dev/verify-structure.js' },
  { name: 'Formatter Verification', cmd: 'node dev/verify-formatters.js' + (verbose ? ' --verbose' : '') },
  { name: 'Self-Test (Full)', cmd: 'node bin/cli.js --full --self-test' }
];

let passed = 0;
let failed = 0;

for (const check of checks) {
  console.log(`\n[Running] ${check.name}...`);
  console.log('-'.repeat(50));

  try {
    const output = execSync(check.cmd, {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: verbose ? 'inherit' : 'pipe'
    });

    if (!verbose && output) {
      // Show summary lines only
      const lines = output.split('\n');
      const summaryLines = lines.filter(l =>
        l.includes('PASS') ||
        l.includes('FAIL') ||
        l.includes('Total') ||
        l.includes('Verified') ||
        l.includes('%')
      );
      if (summaryLines.length > 0) {
        console.log(summaryLines.slice(-5).join('\n'));
      }
    }

    console.log(`[PASS] ${check.name}`);
    passed++;
  } catch (e) {
    console.error(`[FAIL] ${check.name}`);
    if (e.stdout) console.log(e.stdout);
    if (e.stderr) console.error(e.stderr);
    failed++;
  }
}

console.log('\n' + '='.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(50));

process.exit(failed > 0 ? 1 : 0);
