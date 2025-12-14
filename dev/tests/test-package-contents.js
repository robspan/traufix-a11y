#!/usr/bin/env node

/**
 * Development Tests - Package Contents
 *
 * Ensures the npm package only ships runtime files.
 *
 * This runs a dry-run pack and asserts dev-only folders are excluded.
 * (dev/, .github/, .husky/)
 */

'use strict';

const { execSync } = require('child_process');
const path = require('path');

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

function getPackedFilePaths(rootDir) {
  const output = execSync('npm pack --dry-run --ignore-scripts --json', {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env }
  });

  const parsed = JSON.parse(output);
  if (!Array.isArray(parsed) || parsed.length < 1 || !parsed[0] || typeof parsed[0] !== 'object') {
    throw new Error('Unexpected npm pack JSON output (expected array with one entry)');
  }

  const files = Array.isArray(parsed[0].files) ? parsed[0].files : [];
  return files.map(f => f && f.path).filter(Boolean);
}

function main() {
  console.log('Package contents tests');

  const rootDir = path.resolve(__dirname, '..', '..');

  let paths;
  try {
    paths = getPackedFilePaths(rootDir);
    assert(Array.isArray(paths) && paths.length > 0, 'pack: returns file list');
  } catch (error) {
    assert(false, 'pack: returns parseable JSON output', String(error && error.message ? error.message : error));
    console.log('');
    console.log(`Passed: ${passCount}`);
    console.log(`Failed: ${failCount}`);
    process.exit(1);
  }

  // Sanity: ensure we are actually looking at the expected package shape.
  assert(paths.includes('package.json'), 'pack: includes package.json');
  assert(paths.includes('bin/cli.js'), 'pack: includes bin/cli.js');
  assert(paths.includes('src/index.js'), 'pack: includes src/index.js');

  const forbiddenPrefixes = ['dev/', '.github/', '.husky/'];
  const forbiddenExact = new Set(['verify.html', 'verify.scss']);

  const offenders = paths.filter(p => {
    if (forbiddenPrefixes.some(prefix => p.startsWith(prefix))) return true;

    const base = path.posix.basename(p);
    if (forbiddenExact.has(base)) return true;

    return false;
  });

  assert(offenders.length === 0, 'pack: excludes dev-only folders and verify files', offenders.length ? `Found: ${offenders.slice(0, 20).join(', ')}` : undefined);

  console.log('');
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);

  if (failCount > 0) {
    process.exit(1);
  }
  process.exit(0);
}

main();
