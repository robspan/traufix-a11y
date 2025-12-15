'use strict';

/**
 * JUnit XML Formatter for mat-a11y
 *
 * JUnit XML format for CI/CD test reporting.
 * Works with: Jenkins, GitLab CI, CircleCI, Azure DevOps, Bamboo, and most CI systems.
 *
 * @see https://llg.cubic.org/docs/junit/
 * @see https://www.ibm.com/docs/en/developer-for-zos/14.1.0?topic=formats-junit-xml-format
 */

/**
 * Escape special XML characters
 * @param {string} str - String to escape
 * @returns {string} XML-safe string
 */
function escapeXml(str) {
  if (typeof str !== 'string') {
    str = String(str);
  }
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Get failure type based on audit score
 * @param {number} score - Audit score (0-100)
 * @returns {string} Failure type
 */
function getFailureType(score) {
  if (score < 50) return 'CriticalAccessibilityError';
  if (score < 70) return 'SevereAccessibilityError';
  if (score < 90) return 'AccessibilityError';
  return 'AccessibilityWarning';
}

/**
 * Strip severity prefix from message
 * @param {string} message - Issue message
 * @returns {string} Clean message
 */
function cleanMessage(message) {
  return message.replace(/^\[(Error|Warning|Info)\]\s*/, '');
}

const { normalizeResults, getWorstEntities } = require('./result-utils');

/**
 * Format results as JUnit XML
 *
 * @param {object} results - Analysis results from mat-a11y
 * @param {Array} results.urls - Array of URL results
 * @param {object} results.distribution - Distribution of passing/warning/failing
 * @param {string} results.tier - Analysis tier used
 * @param {number} results.urlCount - Total number of URLs analyzed
 * @param {object} options - Formatter options
 * @param {string} [options.suiteName='mat-a11y'] - Test suite name
 * @param {number} [options.failThreshold=90] - Score below which test fails
 * @param {number} [options.maxIssuesPerTest=10] - Max issues to show per test
 * @param {boolean} [options.includeSystemOut=true] - Include system-out with all issues
 * @param {string} [options.hostname] - Hostname for test suite
 * @returns {string} JUnit XML string
 */
function format(results, options = {}) {
  const suiteName = options.suiteName || 'mat-a11y';
  const failThreshold = options.failThreshold ?? 90;
  const maxIssuesPerTest = options.maxIssuesPerTest ?? 10;
  const includeSystemOut = options.includeSystemOut ?? true;
  const hostname = options.hostname || 'localhost';
  const timestamp = new Date().toISOString();

  const normalized = normalizeResults(results);

  let totalTests = 0;
  let failures = 0;
  let errors = 0;
  let skipped = 0;

  const testcases = [];

  for (const entity of normalized.entities) {
    totalTests++;
    const score = entity.auditScore ?? 0;
    const passed = score >= failThreshold;
    const issues = entity.issues || [];
    const testName = escapeXml(entity.label);
    const className = `${suiteName}.accessibility`;

    if (!passed) {
      failures++;

      // Build failure message from top issues
      const topIssues = issues.slice(0, maxIssuesPerTest);
      const failureMessages = topIssues.map(issue => {
        const check = escapeXml(issue.check);
        const message = escapeXml(cleanMessage(issue.message));
        const file = issue.file ? ` (${escapeXml(issue.file)}:${issue.line || 1})` : '';
        return `[${check}] ${message}${file}`;
      }).join('\n');

      const remainingCount = issues.length - topIssues.length;
      const moreText = remainingCount > 0 ? `\n... and ${remainingCount} more issues` : '';

      let testcase = `
    <testcase name="${testName}" classname="${className}" time="0">
      <failure message="Accessibility score: ${score}% (threshold: ${failThreshold}%)" type="${getFailureType(score)}">
<![CDATA[
${failureMessages}${moreText}
]]>
      </failure>`;

      // Add system-out with all issues if enabled
      if (includeSystemOut && issues.length > maxIssuesPerTest) {
        const allIssues = issues.map(issue => {
          const check = escapeXml(issue.check);
          const message = escapeXml(cleanMessage(issue.message));
          const file = issue.file ? ` (${escapeXml(issue.file)}:${issue.line || 1})` : '';
          return `[${check}] ${message}${file}`;
        }).join('\n');

        testcase += `
      <system-out>
<![CDATA[
      Full issue list for ${entity.label}:
${allIssues}
]]>
      </system-out>`;
      }

      testcase += `
    </testcase>`;
      testcases.push(testcase);
    } else {
      // Passing test
      let testcase = `
    <testcase name="${testName}" classname="${className}" time="0"/>`;

      // Still include any warnings in system-out
      if (includeSystemOut && issues.length > 0) {
        const warningMessages = issues.map(issue => {
          const check = escapeXml(issue.check);
          const message = escapeXml(cleanMessage(issue.message));
          return `[${check}] ${message}`;
        }).join('\n');

        testcase = `
    <testcase name="${testName}" classname="${className}" time="0">
      <system-out>
<![CDATA[
Warnings (not failing):
${warningMessages}
]]>
      </system-out>
    </testcase>`;
      }

      testcases.push(testcase);
    }
  }

  // Build properties section
  const properties = `
    <properties>
      <property name="tier" value="${escapeXml(normalized.tier || 'material')}"/>
      <property name="urlCount" value="${normalized.total || 0}"/>
      <property name="failThreshold" value="${failThreshold}"/>
      <property name="passing" value="${normalized.distribution?.passing || 0}"/>
      <property name="warning" value="${normalized.distribution?.warning || 0}"/>
      <property name="failing" value="${normalized.distribution?.failing || 0}"/>
    </properties>`;

  // Build final XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated by mat-a11y - do not edit -->
<!-- traufix.de | freelancermap.de/profil/robin-spanier -->
<testsuites name="${escapeXml(suiteName)}" tests="${totalTests}" failures="${failures}" errors="${errors}" skipped="${skipped}" time="0" timestamp="${timestamp}">
  <testsuite name="${escapeXml(suiteName)}" tests="${totalTests}" failures="${failures}" errors="${errors}" skipped="${skipped}" time="0" timestamp="${timestamp}" hostname="${escapeXml(hostname)}">
${properties}${testcases.join('')}
  </testsuite>
</testsuites>`;

  return xml;
}

module.exports = {
  name: 'junit',
  description: 'JUnit XML format for CI/CD systems (Jenkins, GitLab, CircleCI, Azure DevOps)',
  category: 'cicd',
  output: 'xml',
  fileExtension: '.xml',
  mimeType: 'application/xml',
  format
};
