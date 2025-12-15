#!/usr/bin/env node

/**
 * Development Tests - Parallel Parity
 *
 * Verifies that sync and async (parallel) component analysis produce 
 * EXACTLY identical results. This is critical for ensuring that the 
 * worker-based parallelization doesn't alter the analysis outcomes.
 *
 * Uses hash comparison for strict equality - any difference fails the test.
 * 
 * Usage:
 *   node verify-parallel-parity.js [project-path]
 * 
 * If no project path is specified, uses internal test fixtures.
 *
 * Failure here indicates a bug in worker serialization, check loading,
 * or varContext handling.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Point to the actual source files
const componentAnalyzerPath = path.resolve(__dirname, '..', '..', 'src', 'core', 'componentAnalyzer');
const { analyzeByComponent, analyzeByComponentAsync } = require(componentAnalyzerPath);

// Internal test fixtures path (minimal Angular components for parity testing)
const FIXTURES_PATH = path.resolve(__dirname, 'parity-fixtures');

let passCount = 0;
let failCount = 0;

function assert(condition, message, details) {
  if (condition) {
    passCount++;
    console.log(`  ✓ ${message}`);
  } else {
    failCount++;
    console.log(`  ✗ ${message}`);
    if (details) console.log(`    ${details}`);
  }
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

/**
 * Compute SHA-256 hash of normalized results
 */
function hashResults(results) {
  const normalized = normalizeResults(results);
  const json = JSON.stringify(normalized, null, 0); // Compact, deterministic
  return crypto.createHash('sha256').update(json).digest('hex');
}

/**
 * Normalize results for comparison.
 * Remove timing info, sort arrays for consistent ordering.
 * Normalize inline file naming differences.
 */
function normalizeResults(results) {
  // Deep clone to avoid mutation
  const normalized = JSON.parse(JSON.stringify(results));

  // Remove timing information
  delete normalized.analysisTime;
  delete normalized.timestamp;

  // Sort components by className for consistent ordering
  if (normalized.components && Array.isArray(normalized.components)) {
    normalized.components.sort((a, b) => (a.className || '').localeCompare(b.className || ''));

    // Sort issues within each component and normalize file paths
    for (const comp of normalized.components) {
      if (comp.issues && Array.isArray(comp.issues)) {
        // Normalize inline file names
        for (const issue of comp.issues) {
          if (issue.file) {
            // Normalize inline template naming: "ClassName (inline template)" -> "ClassName-inline.html"
            // and "ClassName (inline styles)" -> "ClassName-inline.scss"
            issue.file = issue.file
              .replace(/\s*\(inline template\)$/, '-inline.html')
              .replace(/\s*\(inline styles\)$/, '-inline.scss');
          }
        }
        // Sort issues by stringified content
        comp.issues.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
      }
      // Sort checkAggregates keys
      if (comp.checkAggregates) {
        const sortedAggregates = {};
        const keys = Object.keys(comp.checkAggregates).sort();
        for (const key of keys) {
          sortedAggregates[key] = comp.checkAggregates[key];
        }
        comp.checkAggregates = sortedAggregates;
      }
    }
  }

  return normalized;
}

async function runParityTest(projectPath, projectName) {
  console.log(`\n=== Parallel Parity Test (${projectName}) ===\n`);

  // Verify project exists
  if (!fs.existsSync(projectPath)) {
    console.error(`  ✗ Project not found at: ${projectPath}`);
    failCount++;
    return;
  }

  console.log(`Test project: ${projectPath}\n`);

  console.log('Running sync analysis...');
  const syncStart = Date.now();
  const syncResults = analyzeByComponent(projectPath, { tier: 'full' });
  const syncTime = Date.now() - syncStart;
  console.log(`  Sync completed in ${syncTime}ms`);
  console.log(`  Components: ${syncResults.componentCount}`);
  console.log(`  Total issues: ${syncResults.totalIssues}\n`);

  console.log('Running async (parallel) analysis...');
  const asyncStart = Date.now();
  const asyncResults = await analyzeByComponentAsync(projectPath, { tier: 'full', workers: 4 });
  const asyncTime = Date.now() - asyncStart;
  console.log(`  Async completed in ${asyncTime}ms`);
  console.log(`  Components: ${asyncResults.componentCount}`);
  console.log(`  Total issues: ${asyncResults.totalIssues}\n`);

  // Hash comparison - strict equality
  const syncHash = hashResults(syncResults);
  const asyncHash = hashResults(asyncResults);

  console.log(`  Sync hash:  ${syncHash}`);
  console.log(`  Async hash: ${asyncHash}\n`);

  assert(
    syncHash === asyncHash,
    'Output hashes match (strict equality)',
    syncHash !== asyncHash ? `Hashes differ - results are NOT identical` : undefined
  );

  // Performance comparison
  const speedup = syncTime / asyncTime;
  console.log(`  Performance: ${speedup.toFixed(2)}x ${speedup > 1 ? 'faster' : 'slower'} with parallel`);
  console.log(`  Sync: ${syncTime}ms, Async: ${asyncTime}ms`);
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           mat-a11y Parallel Parity Test                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  // Get project path from command line argument, or use internal fixtures
  const args = process.argv.slice(2);
  let projectPath;
  let projectName;

  if (args.length > 0 && args[0] !== '--help' && args[0] !== '-h') {
    projectPath = path.resolve(args[0]);
    projectName = path.basename(projectPath);
  } else if (args.includes('--help') || args.includes('-h')) {
    console.log('\nUsage: node verify-parallel-parity.js [project-path]\n');
    console.log('Arguments:');
    console.log('  project-path    Path to an Angular project to test against');
    console.log('                  If not specified, uses internal test fixtures\n');
    console.log('Examples:');
    console.log('  node verify-parallel-parity.js ../my-angular-app');
    console.log('  node verify-parallel-parity.js C:\\Projects\\my-app');
    console.log('  node verify-parallel-parity.js  (uses internal fixtures)\n');
    process.exit(0);
  } else {
    projectPath = FIXTURES_PATH;
    projectName = 'internal fixtures';
  }

  try {
    await runParityTest(projectPath, projectName);
  } catch (err) {
    console.error('\nTest execution error:', err);
    failCount++;
  }

  console.log('\n────────────────────────────────────────────────────');
  console.log(`Results: ${passCount} passed, ${failCount} failed`);
  console.log('────────────────────────────────────────────────────\n');

  process.exit(failCount > 0 ? 1 : 0);
}

main();
