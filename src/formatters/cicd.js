'use strict';

/**
 * CI/CD Platform Formatters
 *
 * Formats for: GitHub, GitLab, Azure, Bitbucket, TeamCity, etc.
 */

/**
 * SARIF - Static Analysis Results Interchange Format
 * Used by GitHub Security tab, VS Code, and many other tools
 * @see https://sarifweb.azurewebsites.net/
 */
function sarif(results, options = {}) {
  const toolName = options.toolName || 'mat-a11y';
  const toolVersion = options.toolVersion || '3.0.0';

  const sarifResults = [];
  const rules = new Map();

  // Process each URL
  for (const url of (results.urls || [])) {
    for (const issue of (url.issues || [])) {
      // Add rule if not exists
      if (!rules.has(issue.check)) {
        rules.set(issue.check, {
          id: issue.check,
          name: issue.check,
          shortDescription: { text: issue.check },
          fullDescription: { text: `Accessibility check: ${issue.check}` },
          defaultConfiguration: { level: 'error' },
          helpUri: `https://github.com/anthropics/mat-a11y#${issue.check}`
        });
      }

      sarifResults.push({
        ruleId: issue.check,
        level: issue.message.startsWith('[Warning]') ? 'warning' : 'error',
        message: { text: issue.message.replace(/^\[(Error|Warning|Info)\]\s*/, '') },
        locations: [{
          physicalLocation: {
            artifactLocation: {
              uri: issue.file,
              uriBaseId: '%SRCROOT%'
            },
            region: {
              startLine: issue.line || 1,
              startColumn: 1
            }
          }
        }],
        properties: {
          url: url.path,
          score: url.auditScore
        }
      });
    }
  }

  return JSON.stringify({
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [{
      tool: {
        driver: {
          name: toolName,
          version: toolVersion,
          informationUri: 'https://github.com/anthropics/mat-a11y',
          rules: Array.from(rules.values())
        }
      },
      results: sarifResults
    }]
  }, null, 2);
}

/**
 * JUnit XML - Universal CI format
 * Works with: Jenkins, GitLab CI, CircleCI, Azure DevOps, etc.
 */
function junit(results, options = {}) {
  const suiteName = options.suiteName || 'mat-a11y';
  const timestamp = new Date().toISOString();

  let totalTests = 0;
  let failures = 0;
  let testcases = '';

  for (const url of (results.urls || [])) {
    totalTests++;
    const passed = url.auditScore >= 90;

    if (!passed) {
      failures++;
      const failureMessages = url.issues.slice(0, 10).map(i =>
        `${i.check}: ${i.message.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]))}`
      ).join('\n');

      testcases += `
    <testcase name="${escapeXml(url.path)}" classname="${suiteName}" time="0">
      <failure message="Score: ${url.auditScore}% (failing &lt; 90%)" type="AccessibilityError">
${escapeXml(failureMessages)}
      </failure>
    </testcase>`;
    } else {
      testcases += `
    <testcase name="${escapeXml(url.path)}" classname="${suiteName}" time="0"/>`;
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="${suiteName}" tests="${totalTests}" failures="${failures}" time="0" timestamp="${timestamp}">
  <testsuite name="${suiteName}" tests="${totalTests}" failures="${failures}" errors="0" skipped="0" timestamp="${timestamp}">
    <properties>
      <property name="tier" value="${results.tier}"/>
      <property name="urlCount" value="${results.urlCount}"/>
      <property name="passing" value="${results.distribution.passing}"/>
      <property name="warning" value="${results.distribution.warning}"/>
      <property name="failing" value="${results.distribution.failing}"/>
    </properties>${testcases}
  </testsuite>
</testsuites>`;
}

/**
 * GitHub Actions Annotations
 * Shows inline errors on PR diffs
 */
function githubAnnotations(results, options = {}) {
  const lines = [];

  for (const url of (results.urls || [])) {
    for (const issue of (url.issues || [])) {
      const level = issue.message.startsWith('[Warning]') ? 'warning' : 'error';
      const message = issue.message.replace(/^\[(Error|Warning|Info)\]\s*/, '');
      const file = issue.file || '';
      const line = issue.line || 1;

      lines.push(`::${level} file=${file},line=${line},title=${issue.check}::${message} (${url.path})`);
    }
  }

  // Summary annotation
  const d = results.distribution;
  lines.push(`::notice title=mat-a11y Summary::Analyzed ${results.urlCount} URLs - Passing: ${d.passing}, Warning: ${d.warning}, Failing: ${d.failing}`);

  return lines.join('\n');
}

/**
 * GitLab Code Quality JSON
 * Shows in MR Code Quality widget
 * @see https://docs.gitlab.com/ee/ci/testing/code_quality.html
 */
function gitlabCodequality(results, options = {}) {
  const issues = [];

  for (const url of (results.urls || [])) {
    for (const issue of (url.issues || [])) {
      const severity = issue.message.startsWith('[Warning]') ? 'minor' : 'major';
      const fingerprint = Buffer.from(`${issue.file}:${issue.check}:${issue.line || 0}`).toString('base64');

      issues.push({
        type: 'issue',
        check_name: issue.check,
        description: issue.message.replace(/^\[(Error|Warning|Info)\]\s*/, ''),
        content: {
          body: `URL: ${url.path}\nScore: ${url.auditScore}%`
        },
        categories: ['Accessibility'],
        severity: severity,
        fingerprint: fingerprint,
        location: {
          path: issue.file,
          lines: {
            begin: issue.line || 1
          }
        }
      });
    }
  }

  return JSON.stringify(issues, null, 2);
}

/**
 * Azure Pipelines Test Results
 * @see https://docs.microsoft.com/en-us/azure/devops/pipelines/test/test-results
 */
function azurePipelines(results, options = {}) {
  // Azure uses JUnit format with some extensions
  return junit(results, { suiteName: 'mat-a11y.accessibility' });
}

/**
 * Bitbucket Code Insights
 * @see https://support.atlassian.com/bitbucket-cloud/docs/code-insights/
 */
function bitbucketInsights(results, options = {}) {
  const annotations = [];

  for (const url of (results.urls || [])) {
    for (const issue of (url.issues || [])) {
      annotations.push({
        path: issue.file,
        line: issue.line || 1,
        message: `[${issue.check}] ${issue.message.replace(/^\[(Error|Warning|Info)\]\s*/, '')}`,
        severity: issue.message.startsWith('[Warning]') ? 'MEDIUM' : 'HIGH',
        type: 'CODE_SMELL',
        link: `https://github.com/anthropics/mat-a11y#${issue.check}`
      });
    }
  }

  const d = results.distribution;
  const overallScore = Math.round((d.passing / results.urlCount) * 100) || 0;

  return JSON.stringify({
    title: 'mat-a11y Accessibility Report',
    details: `Analyzed ${results.urlCount} URLs`,
    result: d.failing > 0 ? 'FAILED' : 'PASSED',
    data: [
      { title: 'URLs Analyzed', type: 'NUMBER', value: results.urlCount },
      { title: 'Passing', type: 'NUMBER', value: d.passing },
      { title: 'Warning', type: 'NUMBER', value: d.warning },
      { title: 'Failing', type: 'NUMBER', value: d.failing },
      { title: 'Score', type: 'PERCENTAGE', value: overallScore }
    ],
    annotations: annotations.slice(0, 1000) // Bitbucket limit
  }, null, 2);
}

/**
 * TeamCity Service Messages
 * @see https://www.jetbrains.com/help/teamcity/service-messages.html
 */
function teamcity(results, options = {}) {
  const lines = [];
  const escape = (s) => s.replace(/['\n\r\|\[\]]/g, c => `|${c}`);

  lines.push(`##teamcity[testSuiteStarted name='mat-a11y']`);

  for (const url of (results.urls || [])) {
    const testName = escape(url.path);
    lines.push(`##teamcity[testStarted name='${testName}']`);

    if (url.auditScore < 90) {
      const message = escape(`Score: ${url.auditScore}%`);
      const details = escape(url.issues.slice(0, 5).map(i => `${i.check}: ${i.message}`).join('\n'));
      lines.push(`##teamcity[testFailed name='${testName}' message='${message}' details='${details}']`);
    }

    lines.push(`##teamcity[testFinished name='${testName}']`);
  }

  lines.push(`##teamcity[testSuiteFinished name='mat-a11y']`);

  // Build statistics
  lines.push(`##teamcity[buildStatisticValue key='mat-a11y.urlCount' value='${results.urlCount}']`);
  lines.push(`##teamcity[buildStatisticValue key='mat-a11y.passing' value='${results.distribution.passing}']`);
  lines.push(`##teamcity[buildStatisticValue key='mat-a11y.failing' value='${results.distribution.failing}']`);

  return lines.join('\n');
}

/**
 * Bamboo Test Results (JUnit-based)
 */
function bamboo(results, options = {}) {
  return junit(results, { suiteName: 'mat-a11y' });
}

/**
 * CircleCI Test Metadata
 * @see https://circleci.com/docs/collect-test-data/
 */
function circleci(results, options = {}) {
  // CircleCI uses JUnit format
  return junit(results, { suiteName: 'mat-a11y' });
}

/**
 * Buildkite Annotations
 * @see https://buildkite.com/docs/agent/v3/cli-annotate
 */
function buildkite(results, options = {}) {
  const d = results.distribution;
  let style = 'success';
  if (d.failing > 0) style = 'error';
  else if (d.warning > 0) style = 'warning';

  let md = `### mat-a11y Results\n\n`;
  md += `| Metric | Value |\n|--------|-------|\n`;
  md += `| URLs Analyzed | ${results.urlCount} |\n`;
  md += `| Passing | ${d.passing} |\n`;
  md += `| Warning | ${d.warning} |\n`;
  md += `| Failing | ${d.failing} |\n\n`;

  if (results.worstUrls && results.worstUrls.length > 0) {
    md += `#### Worst URLs\n\n`;
    for (const url of results.worstUrls.slice(0, 5)) {
      if (url.score >= 90) continue;
      md += `- **${url.path}** (${url.score}%)\n`;
      for (const issue of url.topIssues) {
        md += `  - ${issue.check}: ${issue.count} errors\n`;
      }
    }
  }

  return `buildkite-agent annotate '${md.replace(/'/g, "\\'")}' --style '${style}' --context 'mat-a11y'`;
}

/**
 * Travis CI (uses TAP format)
 */
function travis(results, options = {}) {
  const tap = require('./test-frameworks').tap;
  return tap(results, options);
}

/**
 * Drone CI
 * Uses standard exit codes and console output
 */
function drone(results, options = {}) {
  const lines = [];
  lines.push('=== mat-a11y Accessibility Report ===');
  lines.push(`Tier: ${results.tier}`);
  lines.push(`URLs: ${results.urlCount}`);
  lines.push(`Passing: ${results.distribution.passing}`);
  lines.push(`Warning: ${results.distribution.warning}`);
  lines.push(`Failing: ${results.distribution.failing}`);

  if (results.distribution.failing > 0) {
    lines.push('\n--- Failing URLs ---');
    for (const url of results.urls.filter(u => u.auditScore < 50)) {
      lines.push(`${url.path}: ${url.auditScore}%`);
    }
  }

  return lines.join('\n');
}

// Helpers
function escapeXml(s) {
  return String(s).replace(/[<>&"']/g, c => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;'
  }[c]));
}

module.exports = {
  sarif,
  junit,
  'github-annotations': githubAnnotations,
  'gitlab-codequality': gitlabCodequality,
  'azure-pipelines': azurePipelines,
  'bitbucket-insights': bitbucketInsights,
  teamcity,
  bamboo,
  circleci,
  buildkite,
  travis,
  drone
};
