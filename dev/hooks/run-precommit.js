#!/usr/bin/env node

'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

function run() {
  const cwd = path.resolve(__dirname, '..', '..');

  // On Windows, npm is typically a .cmd shim. Spawning .cmd directly with
  // shell:false can fail (EINVAL), especially under Git Bash.
  // Using cmd.exe is the most reliable cross-shell approach.
  const isWindows = process.platform === 'win32';
  const command = isWindows ? 'cmd.exe' : 'npm';
  const args = isWindows ? ['/d', '/s', '/c', 'npm test'] : ['test'];

  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: false,
    env: { ...process.env }
  });

  // spawnSync uses null status when the spawn itself fails.
  if (typeof result.status === 'number') {
    process.exit(result.status);
  }

  if (result.error) {
    // Keep this minimal; Husky will print its own failure banner.
    console.error(String(result.error && result.error.message ? result.error.message : result.error));
  }

  process.exit(1);
}

run();
