'use strict';

/**
 * Grafana JSON Datasource Formatter
 *
 * Exports accessibility results in Grafana JSON datasource format for
 * direct integration with Grafana dashboards using the JSON datasource plugin.
 *
 * @see https://grafana.com/grafana/plugins/simpod-json-datasource/
 * @see https://grafana.com/docs/grafana/latest/datasources/
 * @module formatters/grafana-json
 */

const { normalizeResults } = require('./result-utils');

/**
 * Format results as Grafana JSON datasource format
 *
 * Produces a JSON structure compatible with Grafana's JSON datasource plugin,
 * including both timeseries data for graphs and table data for detailed views.
 *
 * @param {object} results - Analysis results
 * @param {string[]} results.urls - Array of URL result objects
 * @param {object} results.distribution - Distribution of passing/warning/failing URLs
 * @param {number} results.distribution.passing - Number of passing URLs (score >= 90)
 * @param {number} results.distribution.warning - Number of warning URLs (score 50-89)
 * @param {number} results.distribution.failing - Number of failing URLs (score < 50)
 * @param {string} results.tier - Analysis tier (basic, material, full)
 * @param {number} results.urlCount - Total number of URLs analyzed
 * @param {object} [options={}] - Formatter options
 * @param {number} [options.timestamp] - Unix timestamp in milliseconds (default: Date.now())
 * @param {boolean} [options.includeAnnotations=false] - Include annotations section
 * @param {boolean} [options.includeAudits=true] - Include audits in table data
 * @param {boolean} [options.pretty=true] - Pretty-print JSON output
 * @returns {string} JSON string for Grafana datasource
 */
function format(results, options = {}) {
  const timestamp = options.timestamp || Date.now();
  const includeAnnotations = options.includeAnnotations || false;
  const includeAudits = options.includeAudits !== false;
  const pretty = options.pretty !== false;

  const normalized = normalizeResults(results);

  const tier = normalized.tier || 'material';
  const urlCount = normalized.total || 0;
  const distribution = normalized.distribution || { passing: 0, warning: 0, failing: 0 };
  const urls = normalized.entities || [];

  // Calculate pass rate
  const passRate = urlCount > 0 ? (distribution.passing / urlCount) * 100 : 0;

  // Build timeseries data for graphs
  const timeseries = [
    {
      target: 'urls_total',
      datapoints: [[urlCount, timestamp]]
    },
    {
      target: 'urls_passing',
      datapoints: [[distribution.passing, timestamp]]
    },
    {
      target: 'urls_warning',
      datapoints: [[distribution.warning, timestamp]]
    },
    {
      target: 'urls_failing',
      datapoints: [[distribution.failing, timestamp]]
    },
    {
      target: 'pass_rate',
      datapoints: [[parseFloat(passRate.toFixed(2)), timestamp]]
    }
  ];

  // Add per-URL score timeseries
  for (const url of urls) {
    const urlPath = url.label || 'unknown';
    const score = typeof url.auditScore === 'number' ? url.auditScore : 0;
    timeseries.push({
      target: `score_${urlPath.replace(/[^a-zA-Z0-9]/g, '_')}`,
      datapoints: [[score, timestamp]]
    });
  }

  // Build table data for detailed views
  const urlTable = {
    columns: [
      { text: 'URL', type: 'string' },
      { text: 'Score', type: 'number' },
      { text: 'Status', type: 'string' },
      { text: 'Issues', type: 'number' }
    ],
    rows: urls.map(url => {
      const urlPath = url.label || 'unknown';
      const score = typeof url.auditScore === 'number' ? url.auditScore : 0;
      const issueCount = url.issues ? url.issues.length : 0;
      let status = 'failing';
      if (score >= 90) status = 'passing';
      else if (score >= 50) status = 'warning';
      return [urlPath, score, status, issueCount];
    }),
    type: 'table'
  };

  // Build issues table
  const issueRows = [];
  for (const issue of normalized.issues || []) {
    issueRows.push([
      issue.entity || 'unknown',
      issue.check || 'unknown',
      issue.message || '',
      issue.file || '',
      issue.line || 0
    ]);
  }

  const issuesTable = {
    columns: [
      { text: 'URL', type: 'string' },
      { text: 'Check', type: 'string' },
      { text: 'Message', type: 'string' },
      { text: 'File', type: 'string' },
      { text: 'Line', type: 'number' }
    ],
    rows: issueRows,
    type: 'table'
  };

  // Build audits table if requested
  let auditsTable = null;
  if (includeAudits && results.summary && results.summary.audits) {
    auditsTable = {
      columns: [
        { text: 'Audit', type: 'string' },
        { text: 'Passed', type: 'boolean' },
        { text: 'Issues', type: 'number' },
        { text: 'Weight', type: 'number' }
      ],
      rows: results.summary.audits.map(audit => [
        audit.name || 'unknown',
        audit.passed || false,
        audit.issues || 0,
        audit.weight || 1
      ]),
      type: 'table'
    };
  }

  // Build the response object
  const response = {
    // Metadata
    _generated: {
      tool: 'mat-a11y',
      notice: 'Generated file - do not edit'
    },
    meta: {
      tier,
      urlCount,
      passRate: parseFloat(passRate.toFixed(2)),
      timestamp,
      generatedAt: new Date(timestamp).toISOString()
    },

    // Timeseries for Grafana graphs
    timeseries,

    // Summary distribution
    distribution: {
      passing: distribution.passing,
      warning: distribution.warning,
      failing: distribution.failing
    },

    // Tables for Grafana table panels
    tables: {
      urls: urlTable,
      issues: issuesTable
    }
  };

  // Add audits table if available
  if (auditsTable) {
    response.tables.audits = auditsTable;
  }

  // Add annotations if requested
  if (includeAnnotations) {
    response.annotations = [];

    // Add annotation for failing URLs
    for (const url of urls) {
      const score = typeof url.auditScore === 'number' ? url.auditScore : 0;
      if (score < 50) {
        response.annotations.push({
          annotation: {
            name: 'Failing URL',
            enabled: true
          },
          time: timestamp,
          title: `Failing: ${url.label}`,
          text: `Score: ${score}`,
          tags: ['a11y', 'failing', tier]
        });
      }
    }
  }

  return pretty
    ? JSON.stringify(response, null, 2)
    : JSON.stringify(response);
}

module.exports = {
  name: 'grafana-json',
  description: 'Grafana JSON datasource format for dashboard integration',
  category: 'monitoring',
  output: 'json',
  fileExtension: '.json',
  mimeType: 'application/json',
  format
};
