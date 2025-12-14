#!/usr/bin/env node

/**
 * Development Tests - CLI Matrix
 *
 * Runs a matrix of CLI configurations against a real project to ensure
 * argument combinations do not crash and that outputs are produced.
 *
 * Tiers:
 *  - basic:    small sanity matrix (fast)
 *  - advanced: larger matrix (still bounded)
 *  - full:     tries to run everything but stops after 5 minutes and prints progress
 *
 * By default this test is SKIPPED unless a target project exists.
 * Set NORO_WEDDING_DIR to point to a real Angular project.
 *
 * Usage:
 *   node dev/tests/test-cli-matrix.js --tier basic
 *   node dev/tests/test-cli-matrix.js --tier advanced
 *   node dev/tests/test-cli-matrix.js --tier full
 *
 * Optional:
 *   NORO_WEDDING_DIR="..." node dev/tests/test-cli-matrix.js --tier full
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..', '..');
const cliPath = path.join(repoRoot, 'bin', 'cli.js');

function parseArgs(argv) {
  const args = { tier: 'basic', project: null, timeLimitMs: 5 * 60 * 1000 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--tier') args.tier = argv[++i] || 'basic';
    else if (a === '--project') args.project = argv[++i] || null;
    else if (a === '--time-limit-ms') args.timeLimitMs = parseInt(argv[++i], 10) || args.timeLimitMs;
  }
  return args;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function safeName(s) {
  return String(s)
    .replace(/[^a-zA-Z0-9_.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function pickTargetProject(explicitProject) {
  if (explicitProject) return explicitProject;
  if (process.env.NORO_WEDDING_DIR) return process.env.NORO_WEDDING_DIR;

  // Developer convenience default (local machine path). If it doesn't exist we skip.
  if (process.platform === 'win32') {
    return 'C:\\Users\\spani\\OneDrive\\Dokumente\\GitHub\\noro-wedding';
  }
  return null;
}

function listFormatters() {
  const { loadAllFormatters, listFormattersWithInfo } = require('../../src/formatters');
  const registry = loadAllFormatters(true);
  return listFormattersWithInfo(registry).map(f => ({
    name: f.name,
    output: f.output,
    fileExtension: f.fileExtension || '',
    category: f.category
  }));
}

function extFor(formatName, outputType) {
  const byFormat = {
    ai: 'todo.txt',
    markdown: 'md',
    csv: 'csv',
    json: 'json',
    sarif: 'sarif.json',
    datadog: 'json',
    'grafana-json': 'json',
    slack: 'json',
    discord: 'json',
    teams: 'json',
    sonarqube: 'json',
    'gitlab-codequality': 'json',
    prometheus: 'prom',
    junit: 'xml',
    checkstyle: 'xml',
    'github-annotations': 'txt',
    html: 'html'
  };

  if (byFormat[formatName]) return byFormat[formatName];
  if (outputType === 'json') return 'json';
  if (outputType === 'xml') return 'xml';
  if (outputType === 'html') return 'html';
  return 'txt';
}

function runCli({ projectDir, args, cwd }) {
  const startedAt = Date.now();
  const res = spawnSync(process.execPath, [cliPath, projectDir, ...args], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024
  });
  return {
    status: typeof res.status === 'number' ? res.status : null,
    stdout: res.stdout || '',
    stderr: res.stderr || '',
    error: res.error ? String(res.error.message || res.error) : null,
    durationMs: Date.now() - startedAt
  };
}

function isAcceptableExitCode(code) {
  return code === 0 || code === 1;
}

function fileNonEmpty(p) {
  try {
    const st = fs.statSync(p);
    return st.isFile() && st.size > 0;
  } catch (_) {
    return false;
  }
}

function buildRuns({ tierName, tmpOutDir, tmpCwd }) {
  const formatters = listFormatters();

  const shortcuts = {
    html: '--html',
    json: '--json',
    sarif: '--sarif',
    junit: '--junit',
    'github-annotations': '--github',
    'gitlab-codequality': '--gitlab',
    sonarqube: '--sonar',
    checkstyle: '--checkstyle',
    prometheus: '--prometheus',
    'grafana-json': '--grafana',
    datadog: '--datadog',
    slack: '--slack',
    discord: '--discord',
    teams: '--teams',
    markdown: '--markdown',
    csv: '--csv'
  };

  const baseModes = [
    { id: 'component', args: [] },
    { id: 'file', args: ['--file-based'] },
    { id: 'sitemap', args: ['--sitemap'] },
    { id: 'sitemap-deep', args: ['--sitemap', '--deep'] }
  ];

  const tiers = {
    // Minimal sanity (fast): component + sitemap only, a few formats.
    basic: {
      modes: ['component', 'sitemap'],
      formats: ['ai', 'json', 'markdown', 'sarif', 'junit', 'html'],
      tierFlags: ['--basic']
    },
    // Medium: all modes, representative formats, multiple tiers.
    advanced: {
      modes: ['component', 'file', 'sitemap', 'sitemap-deep'],
      formats: ['ai', 'json', 'sarif', 'junit', 'github-annotations', 'gitlab-codequality', 'sonarqube', 'prometheus', 'slack', 'markdown', 'csv', 'html'],
      tierFlags: ['--basic', '--material', '--full']
    },
    // Full: try everything (all formats × all modes × full tier), plus a few default-filename checks.
    full: {
      modes: ['component', 'file', 'sitemap', 'sitemap-deep'],
      formats: formatters.map(f => f.name),
      tierFlags: ['--full']
    }
  };

  const spec = tiers[tierName] || tiers.basic;
  const modes = baseModes.filter(m => spec.modes.includes(m.id));
  const formats = spec.formats;
  const tierFlags = spec.tierFlags;

  const runs = [];
  let n = 0;

  function add(label, args, expectedOutPath) {
    n++;
    runs.push({ id: String(n).padStart(3, '0'), label, args, expectedOutPath });
  }

  // Main matrix: always use -o to keep artifacts in tmpOutDir.
  for (const mode of modes) {
    for (const tf of tierFlags) {
      for (const fmt of formats) {
        const meta = formatters.find(f => f.name === fmt);
        const ext = extFor(fmt, meta?.output);
        const outPath = path.join(tmpOutDir, `${mode.id}-${tf.replace(/^--/, '')}-${fmt}.${ext}`);

        // Mix shortcuts and --format to cover both code paths.
        const fmtArgs = shortcuts[fmt] ? [shortcuts[fmt]] : ['--format', fmt];
        const args = [...mode.args, tf, ...fmtArgs, '-o', outPath];
        add(`${mode.id} ${tf} ${fmt}`, args, outPath);
      }
    }
  }

  // A few default output filename checks (no -o) - only for basic/advanced.
  // Run in tmpCwd so it doesn't write to repo.
  if (tierName !== 'full') {
    add('default output (ai)', ['--basic'], path.join(tmpCwd, 'mat-a11y.todo.txt'));
    add('default output (sarif shortcut)', ['--basic', '--sarif'], path.join(tmpCwd, 'mat-a11y.sarif.json'));
    add('default output (junit shortcut)', ['--basic', '--junit'], path.join(tmpCwd, 'mat-a11y.junit.xml'));
  }

  return runs;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectDir = pickTargetProject(args.project);

  if (!projectDir || !fs.existsSync(projectDir)) {
    console.log('CLI matrix tests');
    console.log('  (skipped) No target project found. Set NORO_WEDDING_DIR or pass --project.');
    process.exit(0);
  }

  console.log(`CLI matrix tests (${args.tier})`);
  console.log(`  Project: ${projectDir}`);

  const tmpBase = path.join(os.tmpdir(), `mat-a11y-cli-matrix-${Date.now()}-${safeName(args.tier)}`);
  const tmpOutDir = path.join(tmpBase, 'out');
  const tmpCwd = path.join(tmpBase, 'cwd');
  ensureDir(tmpOutDir);
  ensureDir(tmpCwd);

  const runs = buildRuns({ tierName: args.tier, tmpOutDir, tmpCwd });

  const started = Date.now();
  let executed = 0;
  let failures = 0;
  let timedOut = false;

  try {
    for (const run of runs) {
      if (args.tier === 'full' && Date.now() - started >= args.timeLimitMs) {
        timedOut = true;
        break;
      }

      executed++;
      const res = runCli({ projectDir, args: run.args, cwd: tmpCwd });

      const okExit = res.error == null && isAcceptableExitCode(res.status);
      const okOut = run.expectedOutPath ? fileNonEmpty(run.expectedOutPath) : true;
      const ok = okExit && okOut;

      if (!ok) {
        failures++;
        console.log(`  ✗ ${run.id}/${runs.length} ${run.label} (code=${res.status}) ${Math.round(res.durationMs)}ms`);
        if (res.error) console.log(`    spawn error: ${res.error}`);

        // Print a small excerpt (avoid dumping megabytes into CI logs).
        const combined = `${res.stdout}\n${res.stderr}`.trim();
        if (combined) {
          const lines = combined.split(/\r?\n/);
          const excerpt = lines.slice(0, 40).join('\n');
          console.log('    output (first 40 lines):');
          console.log(excerpt.split(/\r?\n/).map(l => `    ${l}`).join('\n'));
          if (lines.length > 40) console.log(`    ... (${lines.length - 40} more lines truncated)`);
        }
      } else {
        console.log(`  ✓ ${run.id}/${runs.length} ${run.label} (code=${res.status}) ${Math.round(res.durationMs)}ms`);
      }
    }
  } finally {
    // Always clean up temp outputs (even on failures).
    try {
      fs.rmSync(tmpBase, { recursive: true, force: true });
    } catch (_) {
      // ignore
    }
  }

  console.log('');
  console.log(`Executed: ${executed}/${runs.length}`);
  console.log(`Failures: ${failures}`);
  if (args.tier === 'full') {
    console.log(`Time limit: ${Math.round(args.timeLimitMs / 1000)}s`);
    console.log(`Timed out: ${timedOut ? 'yes' : 'no'}`);
  }

  // If timed out but no failures, still exit 0 (progress report only).
  if (failures > 0) process.exit(1);
  process.exit(0);
}

main();
