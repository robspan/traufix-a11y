#!/usr/bin/env node

/**
 * Development Tests - CLI Smoke
 *
 * Lightweight end-to-end smoke test:
 * CLI -> component analyzer (default) -> formatter -> output file -> exit code.
 *
 * This does not require a real Angular install; it writes a minimal mock project
 * with @Component + template files.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

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

function createMockProject(rootDir, { failing }) {
  const appDir = path.join(rootDir, 'src', 'app', 'demo');

  writeFile(
    path.join(appDir, 'demo.component.ts'),
    `import { Component } from '@angular/core';

@Component({
  selector: 'app-demo',
  templateUrl: './demo.component.html',
  styleUrls: ['./demo.component.scss']
})
export class DemoComponent {}
`
  );

  writeFile(path.join(appDir, 'demo.component.scss'), ':host { display: block; }\n');

  if (failing) {
    // Intentionally trigger at least one issue (e.g., imageAlt).
    writeFile(
      path.join(appDir, 'demo.component.html'),
      `<main>\n  <img src="logo.png">\n  <button></button>\n</main>\n`
    );
  } else {
    // Keep it minimal but valid for common checks.
    writeFile(
      path.join(appDir, 'demo.component.html'),
      `<main>\n  <img src="logo.png" alt="Logo">\n  <button aria-label="Ok">Ok</button>\n</main>\n`
    );
  }
}

function runCli({ projectDir, outputPath }) {
  const cliPath = path.resolve(__dirname, '..', '..', 'bin', 'cli.js');
  const result = spawnSync(process.execPath, [cliPath, projectDir, '--markdown', '-o', outputPath], {
    cwd: path.resolve(__dirname, '..', '..'),
    encoding: 'utf8'
  });

  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || ''
  };
}

function main() {
  console.log('CLI smoke tests');

  const tmpBase = path.join(os.tmpdir(), `mat-a11y-cli-smoke-${Date.now()}`);
  const failingDir = path.join(tmpBase, 'failing');
  const passingDir = path.join(tmpBase, 'passing');

  try {
    createMockProject(failingDir, { failing: true });
    createMockProject(passingDir, { failing: false });

    const failingOut = path.join(failingDir, 'out.md');
    const passingOut = path.join(passingDir, 'out.md');

    const failingRun = runCli({ projectDir: failingDir, outputPath: failingOut });
    assert(failingRun.status === 1, 'failing project: exit code is 1', `status=${failingRun.status}\n${failingRun.stderr}`);
    assert(fs.existsSync(failingOut), 'failing project: output file exists');
    assert(fs.statSync(failingOut).size > 0, 'failing project: output file is non-empty');

    const passingRun = runCli({ projectDir: passingDir, outputPath: passingOut });
    assert(passingRun.status === 0, 'passing project: exit code is 0', `status=${passingRun.status}\n${passingRun.stderr}`);
    assert(fs.existsSync(passingOut), 'passing project: output file exists');
    assert(fs.statSync(passingOut).size > 0, 'passing project: output file is non-empty');
  } finally {
    // Best-effort cleanup
    try {
      fs.rmSync(tmpBase, { recursive: true, force: true });
    } catch (_) {
      // ignore
    }
  }

  console.log('');
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);

  if (failCount > 0) process.exit(1);
  process.exit(0);
}

main();
