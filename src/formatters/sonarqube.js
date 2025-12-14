'use strict';

/**
 * SonarQube Generic Issue Import Format
 *
 * Generates reports compatible with SonarQube's Generic Issue Import feature.
 * This allows accessibility issues to be imported into SonarQube for unified
 * code quality tracking.
 *
 * @see https://docs.sonarsource.com/sonarqube/latest/analyzing-source-code/importing-external-issues/generic-issue-import-format/
 * @module formatters/sonarqube
 */

/**
 * Map severity from issue message to SonarQube severity levels
 * @param {string} message - Issue message
 * @returns {string} SonarQube severity (BLOCKER, CRITICAL, MAJOR, MINOR, INFO)
 */
function getSeverity(message) {
  if (message.startsWith('[Error]')) return 'MAJOR';
  if (message.startsWith('[Warning]')) return 'MINOR';
  if (message.startsWith('[Info]')) return 'INFO';
  return 'MAJOR';
}

/**
 * Map severity to SonarQube impact severity
 * @param {string} severity - SonarQube severity
 * @returns {string} Impact severity (HIGH, MEDIUM, LOW, INFO)
 */
function getImpactSeverity(severity) {
  switch (severity) {
    case 'BLOCKER':
    case 'CRITICAL':
      return 'HIGH';
    case 'MAJOR':
      return 'MEDIUM';
    case 'MINOR':
      return 'LOW';
    case 'INFO':
    default:
      return 'INFO';
  }
}

/**
 * Get effort in minutes based on severity
 * @param {string} severity - SonarQube severity
 * @returns {number} Effort in minutes
 */
function getEffortMinutes(severity) {
  switch (severity) {
    case 'BLOCKER':
      return 60;
    case 'CRITICAL':
      return 30;
    case 'MAJOR':
      return 15;
    case 'MINOR':
      return 10;
    case 'INFO':
    default:
      return 5;
  }
}

/**
 * Clean issue message by removing severity prefix
 * @param {string} message - Raw issue message
 * @returns {string} Cleaned message
 */
function cleanMessage(message) {
  return String(message).replace(/^\[(Error|Warning|Info)\]\s*/, '');
}

const { normalizeResults } = require('./result-utils');

/**
 * Format accessibility results as SonarQube Generic Issue Import JSON
 *
 * @param {object} results - Analysis results object
 * @param {object[]} results.urls - Array of URL result objects
 * @param {object} results.distribution - Pass/warn/fail distribution
 * @param {string} results.tier - Accessibility tier (A, AA, AAA)
 * @param {number} results.urlCount - Total number of URLs analyzed
 * @param {object} [options={}] - Formatter options
 * @param {string} [options.engineId='mat-a11y'] - Custom engine ID
 * @param {boolean} [options.includeRules=true] - Include rule definitions
 * @returns {string} JSON string in SonarQube Generic Issue Import format
 */
function format(results, options = {}) {
  const {
    engineId = 'mat-a11y',
    includeRules = true
  } = options;

  const normalized = normalizeResults(results);

  const issues = [];
  const rulesMap = new Map();

  // Process all issues
  for (const issue of normalized.issues) {
      const severity = getSeverity(issue.message);
      const cleanedMessage = cleanMessage(issue.message);

      // Build the issue object per SonarQube spec
      const sonarIssue = {
        ruleId: issue.check,
        effortMinutes: getEffortMinutes(severity),
        primaryLocation: {
          message: cleanedMessage,
          filePath: issue.file || 'unknown',
          textRange: {
            startLine: issue.line || 1,
            endLine: issue.line || 1,
            startColumn: 0,
            endColumn: 0
          }
        }
      };

      issues.push(sonarIssue);

      // Collect unique rules for rule definitions
      if (includeRules && !rulesMap.has(issue.check)) {
        rulesMap.set(issue.check, {
          id: issue.check,
          name: issue.check.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          description: `Accessibility check: ${issue.check}`,
          engineId: engineId,
          cleanCodeAttribute: 'CLEAR',
          type: 'CODE_SMELL',
          severity: severity,
          impacts: [
            {
              softwareQuality: 'MAINTAINABILITY',
              severity: getImpactSeverity(severity)
            }
          ]
        });
      }
  }

  // Build the output object
  const output = {
    _generated: {
      tool: 'mat-a11y',
      notice: 'Generated file - do not edit'
    },
    issues: issues
  };

  // Include rules if enabled
  if (includeRules && rulesMap.size > 0) {
    output.rules = Array.from(rulesMap.values());
  }

  return JSON.stringify(output, null, 2);
}

module.exports = {
  name: 'sonarqube',
  description: 'SonarQube Generic Issue Import format for code quality dashboards',
  category: 'code-quality',
  output: 'json',
  fileExtension: '.json',
  mimeType: 'application/json',
  format
};
