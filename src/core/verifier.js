/**
 * @fileoverview Verifier module for self-testing accessibility checks.
 *
 * This module handles verification of check modules by running them against
 * their verify files. Each check folder contains a verify file (verify.html
 * or verify.scss) with @a11y-pass and @a11y-fail sections.
 *
 * Verification process:
 * 1. Load the verify file for a check
 * 2. Parse it using the parser module to extract pass/fail sections
 * 3. Run the check on the pass section - expect 0 issues
 * 4. Run the check on the fail section - expect >0 issues
 * 5. Return verification results
 *
 * @module core/verifier
 */

'use strict';

const path = require('path');
const fs = require('fs');
const { parseVerifyFile, detectFileType } = require('./parser');
const { loadCheck, loadAllChecks, getChecksByTier } = require('./loader');

/**
 * @typedef {Object} SectionResult
 * @property {'pass'|'fail'} expected - What the section should produce
 * @property {'pass'|'fail'} actual - What the check actually produced
 * @property {string[]} issues - Issues found by the check
 * @property {string|null} error - Error message if check threw
 */

/**
 * @typedef {Object} VerifyResult
 * @property {string} checkName - Name of the check
 * @property {boolean} verified - True if both pass and fail tests work correctly
 * @property {SectionResult} passResult - Result of running check on pass section
 * @property {SectionResult} failResult - Result of running check on fail section
 * @property {string|null} error - Overall error (e.g., missing verify file)
 */

/**
 * @typedef {Object} VerifySummary
 * @property {number} total - Total number of checks processed
 * @property {number} verified - Number of checks that passed verification
 * @property {number} failed - Number of checks that failed verification
 * @property {number} skipped - Number of checks skipped (missing verify file)
 * @property {Object} details - Detailed lists of check names
 * @property {string[]} details.verified - Names of verified checks
 * @property {string[]} details.failed - Names of failed checks
 * @property {string[]} details.skipped - Names of skipped checks
 */

// Verify files are in dev/tests/verify-files (not shipped to npm)
const VERIFY_FILES_DIR = path.resolve(__dirname, '../../dev/tests/verify-files');

/**
 * Find the verify file for a check module.
 *
 * Looks for <checkName>.html or <checkName>.scss in dev/tests/verify-files.
 *
 * @param {string} checkPath - Path to the check folder (used to get check name)
 * @param {string} checkType - Type of the check ('html' or 'scss')
 * @returns {{ filePath: string|null, error: string|null }}
 * @private
 */
function findVerifyFile(checkPath, checkType) {
  const checkName = path.basename(checkPath);
  const extension = checkType === 'html' ? '.html' : '.scss';
  const verifyFilePath = path.join(VERIFY_FILES_DIR, `${checkName}${extension}`);

  if (fs.existsSync(verifyFilePath)) {
    return { filePath: verifyFilePath, error: null };
  }

  // Also check for alternative extensions
  const alternativeExtensions = checkType === 'html' ? ['.htm'] : ['.css', '.sass'];
  for (const ext of alternativeExtensions) {
    const altPath = path.join(VERIFY_FILES_DIR, `${checkName}${ext}`);
    if (fs.existsSync(altPath)) {
      return { filePath: altPath, error: null };
    }
  }

  return {
    filePath: null,
    error: `Verify file not found: expected ${checkName}${extension} in ${VERIFY_FILES_DIR}`
  };
}

/**
 * Run a check function safely with error handling.
 *
 * @param {Function} checkFn - The check function to run
 * @param {string} content - Content to check
 * @returns {{ pass: boolean, issues: string[], error: string|null }}
 * @private
 */
function runCheckSafely(checkFn, content) {
  try {
    const result = checkFn(content);

    // Normalize result to expected format
    const pass = result.pass === true;
    const issues = Array.isArray(result.issues) ? result.issues : [];

    return { pass, issues, error: null };
  } catch (err) {
    return {
      pass: false,
      issues: [],
      error: `Check threw an error: ${err.message}`
    };
  }
}

/**
 * Create a default VerifyResult for error cases.
 *
 * @param {string} checkName - Name of the check
 * @param {string} error - Error message
 * @returns {VerifyResult}
 * @private
 */
function createErrorResult(checkName, error) {
  return {
    checkName,
    verified: false,
    passResult: {
      expected: 'pass',
      actual: 'fail',
      issues: [],
      error: null
    },
    failResult: {
      expected: 'fail',
      actual: 'pass',
      issues: [],
      error: null
    },
    error
  };
}

/**
 * Create a skipped VerifyResult.
 *
 * @param {string} checkName - Name of the check
 * @param {string} reason - Reason for skipping
 * @returns {VerifyResult}
 * @private
 */
function createSkippedResult(checkName, reason) {
  return {
    checkName,
    verified: false,
    passResult: {
      expected: 'pass',
      actual: 'pass',
      issues: [],
      error: null
    },
    failResult: {
      expected: 'fail',
      actual: 'pass',
      issues: [],
      error: null
    },
    error: `SKIPPED: ${reason}`
  };
}

/**
 * Verify a single check against its verify file.
 *
 * Loads the verify file, parses it to extract pass/fail sections,
 * runs the check on each section, and validates the results.
 *
 * @param {object} checkModule - The loaded check module (must have check function, name, type)
 * @param {string} checkPath - Path to the check folder
 * @returns {VerifyResult} Verification result
 *
 * @example
 * const { loadCheck } = require('./loader');
 * const result = loadCheck('/path/to/checks/buttonNames');
 * if (result.module) {
 *   const verifyResult = verifyCheck(result.module, '/path/to/checks/buttonNames');
 *   console.log(verifyResult.verified ? 'PASS' : 'FAIL');
 * }
 */
function verifyCheck(checkModule, checkPath) {
  const checkName = checkModule.name || path.basename(checkPath);

  // Validate check module has required properties
  if (!checkModule || typeof checkModule.check !== 'function') {
    return createErrorResult(checkName, 'Invalid check module: missing check function');
  }

  if (!checkModule.type) {
    return createErrorResult(checkName, 'Invalid check module: missing type property');
  }

  // Find verify file
  const verifyFileResult = findVerifyFile(checkPath, checkModule.type);
  if (!verifyFileResult.filePath) {
    return createSkippedResult(checkName, verifyFileResult.error);
  }

  // Read verify file
  let verifyContent;
  try {
    verifyContent = fs.readFileSync(verifyFileResult.filePath, 'utf8');
  } catch (err) {
    return createErrorResult(checkName, `Failed to read verify file: ${err.message}`);
  }

  // Parse verify file
  const fileType = detectFileType(verifyFileResult.filePath);
  const parseResult = parseVerifyFile(verifyContent, fileType);

  if (parseResult.error) {
    return createErrorResult(checkName, `Parse error: ${parseResult.error}`);
  }

  // Run check on pass section
  const passCheckResult = runCheckSafely(checkModule.check, parseResult.passContent);
  const passResult = {
    expected: 'pass',
    actual: passCheckResult.pass ? 'pass' : 'fail',
    issues: passCheckResult.issues,
    error: passCheckResult.error
  };

  // Run check on fail section
  const failCheckResult = runCheckSafely(checkModule.check, parseResult.failContent);
  const failResult = {
    expected: 'fail',
    actual: failCheckResult.pass ? 'pass' : 'fail',
    issues: failCheckResult.issues,
    error: failCheckResult.error
  };

  // Determine if verification passed:
  // - Pass section should have pass=true (no issues)
  // - Fail section should have pass=false (has issues)
  const passVerified = passResult.actual === 'pass' && !passResult.error;
  const failVerified = failResult.actual === 'fail' && !failResult.error;
  const verified = passVerified && failVerified;

  return {
    checkName,
    verified,
    passResult,
    failResult,
    error: null
  };
}

/**
 * Verify all checks in the registry.
 *
 * Iterates through all checks in the registry, finds their verify files,
 * and runs verification on each one.
 *
 * @param {Map<string, object>} registry - Check registry from loader
 * @returns {Map<string, VerifyResult>} Map of checkName to VerifyResult
 *
 * @example
 * const { loadAllChecks } = require('./loader');
 * const registry = loadAllChecks();
 * const results = verifyAll(registry);
 *
 * for (const [name, result] of results) {
 *   console.log(`${name}: ${result.verified ? 'PASS' : 'FAIL'}`);
 * }
 */
function verifyAll(registry) {
  const results = new Map();

  if (!registry || !(registry instanceof Map)) {
    console.warn('[verifier] Warning: Invalid registry provided');
    return results;
  }

  // Get the checks directory path
  const checksDir = path.join(__dirname, '..', 'checks');

  for (const [checkName, checkModule] of registry) {
    const checkPath = path.join(checksDir, checkName);
    const result = verifyCheck(checkModule, checkPath);
    results.set(checkName, result);
  }

  return results;
}

/**
 * Verify checks by tier.
 *
 * Loads all checks, filters by the specified tier, and runs verification
 * on the filtered set.
 *
 * @param {'basic'|'material'|'full'} tier - Tier to verify
 * @returns {Map<string, VerifyResult>} Map of checkName to VerifyResult
 *
 * @example
 * const results = verifyByTier('material');
 * console.log(`Verified ${results.size} material tier checks`);
 */
function verifyByTier(tier) {
  // Validate tier
  const validTiers = ['basic', 'material', 'full'];
  if (!validTiers.includes(tier)) {
    console.warn(`[verifier] Invalid tier "${tier}", defaulting to "material"`);
    tier = 'material';
  }

  // Load and filter checks
  const allChecks = loadAllChecks();
  const tierChecks = getChecksByTier(allChecks, tier);

  // Verify filtered checks
  return verifyAll(tierChecks);
}

/**
 * Get a summary of verification results.
 *
 * Analyzes the verification results and provides a summary with counts
 * and lists of check names by status.
 *
 * @param {Map<string, VerifyResult>} results - Verification results from verifyAll or verifyByTier
 * @returns {VerifySummary} Summary of verification results
 *
 * @example
 * const results = verifyAll(registry);
 * const summary = getVerifySummary(results);
 *
 * console.log(`Total: ${summary.total}`);
 * console.log(`Verified: ${summary.verified}`);
 * console.log(`Failed: ${summary.failed}`);
 * console.log(`Skipped: ${summary.skipped}`);
 */
function getVerifySummary(results) {
  const summary = {
    total: 0,
    verified: 0,
    failed: 0,
    skipped: 0,
    details: {
      verified: [],
      failed: [],
      skipped: []
    }
  };

  if (!results || !(results instanceof Map)) {
    return summary;
  }

  for (const [checkName, result] of results) {
    summary.total++;

    // Check if this was skipped (missing verify file)
    if (result.error && result.error.startsWith('SKIPPED:')) {
      summary.skipped++;
      summary.details.skipped.push(checkName);
    } else if (result.verified) {
      summary.verified++;
      summary.details.verified.push(checkName);
    } else {
      summary.failed++;
      summary.details.failed.push(checkName);
    }
  }

  // Sort the arrays for consistent output
  summary.details.verified.sort();
  summary.details.failed.sort();
  summary.details.skipped.sort();

  return summary;
}

/**
 * Format verification results for console output.
 *
 * Creates a human-readable report of verification results.
 *
 * @param {Map<string, VerifyResult>} results - Verification results
 * @param {Object} [options] - Formatting options
 * @param {boolean} [options.verbose=false] - Include detailed issue information
 * @returns {string} Formatted report
 *
 * @example
 * const results = verifyAll(registry);
 * console.log(formatVerifyResults(results, { verbose: true }));
 */
function formatVerifyResults(results, options = {}) {
  const { verbose = false } = options;
  const summary = getVerifySummary(results);
  const lines = [];

  lines.push('='.repeat(60));
  lines.push('VERIFICATION RESULTS');
  lines.push('='.repeat(60));
  lines.push('');

  // Summary
  lines.push(`Total checks: ${summary.total}`);
  lines.push(`  Verified:   ${summary.verified}`);
  lines.push(`  Failed:     ${summary.failed}`);
  lines.push(`  Skipped:    ${summary.skipped}`);
  lines.push('');

  // Verified checks
  if (summary.details.verified.length > 0) {
    lines.push('-'.repeat(40));
    lines.push('VERIFIED CHECKS:');
    for (const name of summary.details.verified) {
      lines.push(`  [PASS] ${name}`);
    }
    lines.push('');
  }

  // Failed checks
  if (summary.details.failed.length > 0) {
    lines.push('-'.repeat(40));
    lines.push('FAILED CHECKS:');
    for (const name of summary.details.failed) {
      const result = results.get(name);
      lines.push(`  [FAIL] ${name}`);

      if (verbose && result) {
        if (result.error) {
          lines.push(`         Error: ${result.error}`);
        }
        if (result.passResult.actual !== 'pass') {
          lines.push(`         Pass section failed (expected pass, got fail)`);
          if (result.passResult.issues.length > 0) {
            lines.push(`         Issues in pass section: ${result.passResult.issues.length}`);
            for (const issue of result.passResult.issues.slice(0, 3)) {
              lines.push(`           - ${issue}`);
            }
            if (result.passResult.issues.length > 3) {
              lines.push(`           ... and ${result.passResult.issues.length - 3} more`);
            }
          }
        }
        if (result.failResult.actual !== 'fail') {
          lines.push(`         Fail section passed (expected fail, got pass)`);
          lines.push(`         No issues found in fail section`);
        }
      }
    }
    lines.push('');
  }

  // Skipped checks
  if (summary.details.skipped.length > 0) {
    lines.push('-'.repeat(40));
    lines.push('SKIPPED CHECKS:');
    for (const name of summary.details.skipped) {
      const result = results.get(name);
      const reason = result && result.error
        ? result.error.replace('SKIPPED: ', '')
        : 'Unknown reason';
      lines.push(`  [SKIP] ${name}`);
      if (verbose) {
        lines.push(`         ${reason}`);
      }
    }
    lines.push('');
  }

  lines.push('='.repeat(60));

  return lines.join('\n');
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Core API
  verifyCheck,
  verifyAll,
  verifyByTier,
  getVerifySummary,

  // Additional utilities
  formatVerifyResults
};
