#!/usr/bin/env node

/**
 * Parallel Worker Benchmark
 *
 * Compares performance of different worker configurations.
 *
 * Usage:
 *   node dev/benchmark.js [path] [runs]
 *
 * Examples:
 *   node dev/benchmark.js                     # Test on src folder, 10 runs
 *   node dev/benchmark.js ./my-project/src    # Test on custom path
 *   node dev/benchmark.js ./src 5             # 5 runs per config
 */

const { analyze } = require('../src');
const os = require('os');
const path = require('path');

const targetPath = process.argv[2] || path.join(__dirname, '..', 'src');
const RUNS = parseInt(process.argv[3], 10) || 10;

async function benchmark(workers, label) {
  const times = [];

  for (let i = 0; i < RUNS; i++) {
    const start = Date.now();
    await analyze(targetPath, { tier: 'full', workers });
    times.push(Date.now() - start);
    process.stdout.write('.');
  }

  const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  const min = Math.min(...times);
  const max = Math.max(...times);

  return { avg, min, max, label };
}

async function main() {
  // Quick scan to count files and get baseline
  console.log('Warming up...');
  const quickResult = analyze(targetPath, { tier: 'full' });
  const fileCount = quickResult.summary.totalFiles;
  const optimalWorkers = Math.max(1, Math.floor(fileCount / 50));
  const maxWorkers = os.cpus().length - 1;

  console.log('');
  console.log('='.repeat(60));
  console.log('PARALLEL WORKER BENCHMARK');
  console.log('='.repeat(60));
  console.log('');
  console.log('Target:          ' + targetPath);
  console.log('Files:           ' + fileCount);
  console.log('CPU threads:     ' + os.cpus().length);
  console.log('Runs per config: ' + RUNS);
  console.log('Optimal workers: ' + optimalWorkers + ' (files / 50)');
  console.log('');

  const configs = [
    { workers: null, label: 'sync (no workers)' },
    { workers: 1, label: '1 worker' },
    { workers: 4, label: '4 workers' },
    { workers: 8, label: '8 workers' },
    { workers: 16, label: '16 workers' },
    { workers: 'max', label: 'max (' + maxWorkers + ' workers)' }
  ];

  const results = [];

  for (const config of configs) {
    process.stdout.write('Testing ' + config.label + ' ');
    const result = await benchmark(config.workers, config.label);
    results.push(result);
    console.log(' ' + result.avg + 'ms');
  }

  // Find baseline (sync) and best result
  const syncResult = results[0];
  const bestResult = results.reduce((a, b) => a.avg < b.avg ? a : b);

  console.log('');
  console.log('='.repeat(60));
  console.log('RESULTS');
  console.log('='.repeat(60));
  console.log('');
  console.log('Config'.padEnd(25) + 'Avg'.padStart(10) + 'Min'.padStart(10) + 'Max'.padStart(10) + 'vs Sync'.padStart(10));
  console.log('-'.repeat(65));

  for (const r of results) {
    const speedup = (syncResult.avg / r.avg).toFixed(2) + 'x';
    const isBest = r === bestResult ? ' <-- best' : '';
    console.log(
      r.label.padEnd(25) +
      (r.avg + 'ms').padStart(10) +
      (r.min + 'ms').padStart(10) +
      (r.max + 'ms').padStart(10) +
      speedup.padStart(10) +
      isBest
    );
  }

  console.log('');
  console.log('Winner: ' + bestResult.label + ' (' + bestResult.avg + 'ms)');
  console.log('Speedup vs sync: ' + (syncResult.avg / bestResult.avg).toFixed(2) + 'x faster');
  console.log('');
}

main().catch(console.error);
