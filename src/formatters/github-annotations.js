'use strict';

/**
 * GitHub Actions Annotations Formatter
 *
 * Generates GitHub Actions workflow annotations for accessibility issues.
 * Shows inline errors directly on PR diffs.
 *
 * @see https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions
 * @module formatters/github-annotations
 */

/**
 * Format results as GitHub Actions workflow annotations
 *
 * @param {object} results - Analysis results
 * @param {Array} results.urls - Array of analyzed URLs
 * @param {object} results.distribution - Distribution of passing/warning/failing
 * @param {string} results.tier - Accessibility tier
 * @param {number} results.urlCount - Number of URLs analyzed
 * @param {object} [options={}] - Formatter options
 * @param {boolean} [options.includeNotice=true] - Include summary notice annotation
 * @param {number} [options.maxAnnotations=50] - Maximum number of annotations (GitHub limits to 10 per command)
 * @returns {string} GitHub Actions annotation commands
 */
function format(results, options = {}) {
  const {
    includeNotice = true,
    maxAnnotations = 50
  } = options;

  const { normalizeResults, getCheckWeight } = require('./result-utils');
  const normalized = normalizeResults(results);

  const lines = [];
  let annotationCount = 0;

  // Process each issue
  for (const issue of normalized.issues) {
    if (annotationCount >= maxAnnotations) {
      break;
    }

      // Determine severity level based on issue weight (pre-computed by normalizeResults)
      const weight = issue.weight !== undefined ? issue.weight : getCheckWeight(issue.check);
      const level = determineLevel(weight);

      // Clean the message (remove severity prefix)
      const message = cleanMessage(issue.message);

      // Get file and line info
      const file = issue.file || '';
      const line = issue.line || 1;

      // Escape special characters for GitHub Actions
      const escapedMessage = escapeAnnotation(message);
      const escapedCheck = escapeAnnotation(issue.check);
      const escapedUrl = escapeAnnotation(issue.entity);

      // Format: ::error file={name},line={line},title={title}::{message}
      lines.push(
        `::${level} file=${file},line=${line},title=${escapedCheck}::${escapedMessage} (${escapedUrl})`
      );

    annotationCount++;
  }

  // Add summary notice annotation
  if (includeNotice) {
    const d = normalized.distribution || { passing: 0, warning: 0, failing: 0 };
    const summary = `Analyzed ${normalized.total || 0} URLs - Passing: ${d.passing}, Warning: ${d.warning}, Failing: ${d.failing}`;
    lines.push(`::notice title=mat-a11y Summary::${escapeAnnotation(summary)}`);
    lines.push(`::notice title=mat-a11y::traufix.de | freelancermap.de/profil/robin-spanier`);
  }

  return lines.join('\n');
}

/**
 * Determine the annotation level based on issue weight
 *
 * GitHub annotation levels:
 * - error: Critical issues that should block PR (weight >= 7)
 * - warning: Important issues to address (weight >= 4)
 * - notice: Informational issues (weight < 4)
 *
 * @param {number} weight - The issue weight (0-10)
 * @returns {string} 'error', 'warning', or 'notice'
 */
function determineLevel(weight) {
  if (weight >= 7) {
    return 'error';
  }
  if (weight >= 4) {
    return 'warning';
  }
  return 'notice';
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
 * Escape special characters for GitHub Actions annotations
 * GitHub Actions uses % encoding for special characters
 *
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeAnnotation(str) {
  return String(str)
    .replace(/%/g, '%25')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A')
    .replace(/:/g, '%3A')
    .replace(/,/g, '%2C');
}

module.exports = {
  name: 'github-annotations',
  description: 'GitHub Actions workflow annotations for inline PR feedback',
  category: 'cicd',
  output: 'text',
  fileExtension: '.txt',
  mimeType: 'text/plain',
  format
};
