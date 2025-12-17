'use strict';

/**
 * GitLab Code Quality Formatter
 *
 * Generates GitLab Code Quality JSON report for the Merge Request widget.
 * Issues appear directly in the MR diff view with severity indicators.
 *
 * @see https://docs.gitlab.com/ee/ci/testing/code_quality.html
 * @module formatters/gitlab-codequality
 */

const crypto = require('crypto');

const { normalizeResults, getCheckWeight } = require('./result-utils');

/**
 * Format results as GitLab Code Quality JSON
 *
 * @param {object} results - Analysis results
 * @param {Array} results.urls - Array of analyzed URLs
 * @param {object} results.distribution - Distribution of passing/warning/failing
 * @param {string} results.tier - Accessibility tier
 * @param {number} results.urlCount - Number of URLs analyzed
 * @param {object} [options={}] - Formatter options
 * @param {number} [options.maxIssues=1000] - Maximum number of issues to include
 * @param {string} [options.engineId='mat-a11y'] - Engine identifier
 * @returns {string} GitLab Code Quality JSON string
 */
function format(results, options = {}) {
  const {
    maxIssues = 1000,
    engineId = 'mat-a11y'
  } = options;

  const normalized = normalizeResults(results);

  const issues = [];
  let issueCount = 0;

  // Process each issue
  for (const issue of normalized.issues) {
    if (issueCount >= maxIssues) {
      break;
    }

      // Map severity based on issue weight (pre-computed by normalizeResults)
      const weight = issue.weight !== undefined ? issue.weight : getCheckWeight(issue.check);
      const severity = mapSeverity(weight);

      // Generate unique fingerprint for deduplication
      const fingerprint = generateFingerprint(issue);

      // Clean the message (remove severity prefix)
      const description = cleanMessage(issue.message);

      // Build the Code Quality issue object
      const codeQualityIssue = {
        type: 'issue',
        check_name: issue.check,
        description: description,
        content: {
          body: buildContentBody({ path: issue.entity, auditScore: issue.auditScore }, issue)
        },
        categories: ['Accessibility'],
        severity: severity,
        fingerprint: fingerprint,
        location: {
          path: issue.file || 'unknown',
          lines: {
            begin: issue.line || 1
          }
        }
      };

      // Add optional engine_name for better identification
      codeQualityIssue.engine_name = engineId;

      issues.push(codeQualityIssue);
      issueCount++;
  }

  // Wrap in object with metadata for consulting promo
  const output = {
    _generated: {
      tool: 'mat-a11y',
      notice: 'Generated file - do not edit',
      promo: 'traufix.de | freelancermap.de/profil/robin-spanier'
    },
    issues: issues
  };
  return JSON.stringify(output, null, 2);
}

/**
 * Map issue weight to GitLab Code Quality severity
 *
 * GitLab Code Quality severity levels:
 * - blocker: Breaks the build (weight >= 9)
 * - critical: Must be fixed immediately (weight >= 7)
 * - major: Should be fixed soon (weight >= 5)
 * - minor: Should be fixed eventually (weight >= 3)
 * - info: Informational only (weight < 3)
 *
 * Weight scale (from weights.js):
 * - 10: Most critical (e.g., missing alt text, form labels)
 * - 7-9: High severity
 * - 4-6: Medium severity
 * - 1-3: Low severity
 *
 * @param {number} weight - The issue weight (0-10)
 * @returns {string} GitLab severity level
 */
function mapSeverity(weight) {
  if (weight >= 9) {
    return 'blocker';
  }
  if (weight >= 7) {
    return 'critical';
  }
  if (weight >= 5) {
    return 'major';
  }
  if (weight >= 3) {
    return 'minor';
  }
  return 'info';
}

/**
 * Generate a unique fingerprint for the issue
 *
 * The fingerprint is used by GitLab to track issues across runs
 * and identify new vs existing issues in MRs.
 *
 * @param {object} issue - The issue object
 * @returns {string} Base64-encoded fingerprint
 */
function generateFingerprint(issue) {
  const components = [
    issue.file || '',
    issue.check || '',
    String(issue.line || 0)
  ].join(':');

  // Use MD5 for consistent fingerprinting (not for security)
  return crypto
    .createHash('md5')
    .update(components)
    .digest('hex');
}

/**
 * Clean the message by removing severity prefix
 *
 * @param {string} message - The issue message
 * @returns {string} Cleaned message
 */
function cleanMessage(message) {
  return message.replace(/^\[(Error|Warning|Info)\]\s*/, '');
}

/**
 * Build the content body with additional context
 *
 * @param {object} url - The URL object containing path and score
 * @param {object} issue - The issue object
 * @returns {string} Formatted content body
 */
function buildContentBody(url, issue) {
  const parts = [];

  parts.push(`**URL:** ${url.path}`);
  parts.push(`**Accessibility Score:** ${url.auditScore}%`);

  if (issue.check) {
    parts.push(`**Check:** ${issue.check}`);
  }

  if (issue.selector) {
    parts.push(`**Selector:** \`${issue.selector}\``);
  }

  return parts.join('\n');
}

module.exports = {
  name: 'gitlab-codequality',
  description: 'GitLab Code Quality JSON for Merge Request widget',
  category: 'cicd',
  output: 'json',
  fileExtension: '.json',
  mimeType: 'application/json',
  format
};
