'use strict';

/**
 * Browser Stub for mat-a11y
 *
 * This is a CLI/Node.js tool that should NOT be bundled into browser builds.
 * If you see this in your bundle, you likely installed mat-a11y as a regular
 * dependency instead of a devDependency.
 *
 * FIX: Move mat-a11y to devDependencies:
 *   npm uninstall mat-a11y
 *   npm install --save-dev mat-a11y
 *
 * This stub ensures your bundle stays small (~200 bytes vs ~1MB).
 */

const WARNING = '[mat-a11y] This is a dev tool and should not be imported in browser code. Install as devDependency.';

// Log warning once in development
if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
  console.warn(WARNING);
}

// Export no-op functions that won't break if accidentally imported
module.exports = {
  scan: () => { throw new Error(WARNING); },
  format: () => { throw new Error(WARNING); },
  loadAllFormatters: () => new Map(),
  getFormatter: () => null,
  listFormatters: () => [],
  _isStub: true
};
