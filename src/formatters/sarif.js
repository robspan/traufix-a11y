'use strict';

/**
 * SARIF Formatter for mat-a11y
 *
 * Static Analysis Results Interchange Format (SARIF)
 * Used by GitHub Security tab, VS Code SARIF Viewer, and many other tools.
 *
 * @see https://sarifweb.azurewebsites.net/
 * @see https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html
 */

/**
 * SARIF severity level mapping
 * Maps issue prefixes to SARIF severity levels
 */
const SEVERITY_MAP = {
  '[Error]': 'error',
  '[Warning]': 'warning',
  '[Info]': 'note'
};

const { normalizeResults } = require('./result-utils');

/**
 * Get SARIF severity level from issue message
 * @param {string} message - Issue message
 * @returns {string} SARIF level (error, warning, note)
 */
function getSeverityLevel(message) {
  for (const [prefix, level] of Object.entries(SEVERITY_MAP)) {
    if (message.startsWith(prefix)) {
      return level;
    }
  }
  return 'error'; // Default to error
}

/**
 * Strip severity prefix from message
 * @param {string} message - Issue message
 * @returns {string} Clean message
 */
function cleanMessage(message) {
  return message.replace(/^\[(Error|Warning|Info)\]\s*/, '');
}

/**
 * Format results as SARIF 2.1.0
 *
 * @param {object} results - Analysis results from mat-a11y
 * @param {Array} results.urls - Array of URL results
 * @param {object} results.distribution - Distribution of passing/warning/failing
 * @param {string} results.tier - Analysis tier used
 * @param {number} results.urlCount - Total number of URLs analyzed
 * @param {object} options - Formatter options
 * @param {string} [options.toolName='mat-a11y'] - Tool name in SARIF output
 * @param {string} [options.toolVersion='3.0.0'] - Tool version
 * @param {string} [options.repositoryUri] - Repository URI for code flow
 * @param {string} [options.runId] - Unique run identifier
 * @returns {string} SARIF JSON string
 */
function format(results, options = {}) {
  const toolName = options.toolName || 'mat-a11y';
  const toolVersion = options.toolVersion || '3.0.0';
  const repositoryUri = options.repositoryUri || '';
  const runId = options.runId || `run-${Date.now()}`;

  const normalized = normalizeResults(results);

  const sarifResults = [];
  const rules = new Map();
  const artifacts = new Map();

  // Process each entity's issues
  for (const issue of normalized.issues) {
      const ruleId = issue.check;
      const level = getSeverityLevel(issue.message);
      const message = cleanMessage(issue.message);
      const filePath = issue.file || '';
      const line = issue.line || 1;

      // Add rule if not exists
      if (!rules.has(ruleId)) {
        rules.set(ruleId, {
          id: ruleId,
          name: ruleId,
          shortDescription: {
            text: `Accessibility check: ${ruleId}`
          },
          fullDescription: {
            text: `mat-a11y accessibility rule that checks for ${ruleId.replace(/([A-Z])/g, ' $1').toLowerCase().trim()}`
          },
          defaultConfiguration: {
            level: 'error'
          },
          helpUri: `https://github.com/anthropics/mat-a11y#${ruleId}`,
          properties: {
            tags: ['accessibility', 'a11y', 'wcag']
          }
        });
      }

      // Track artifacts (files)
      if (filePath && !artifacts.has(filePath)) {
        artifacts.set(filePath, {
          location: {
            uri: filePath,
            uriBaseId: '%SRCROOT%'
          },
          roles: ['analysisTarget']
        });
      }

      // Create result entry
      const resultEntry = {
        ruleId: ruleId,
        ruleIndex: Array.from(rules.keys()).indexOf(ruleId),
        level: level,
        message: {
          text: message
        },
        locations: [{
          physicalLocation: {
            artifactLocation: {
              uri: filePath,
              uriBaseId: '%SRCROOT%'
            },
            region: {
              startLine: line,
              startColumn: 1
            }
          }
        }],
        properties: {
          url: issue.entity,
          auditScore: issue.auditScore
        }
      };

      // Add related locations if available
      if (issue.element) {
        resultEntry.relatedLocations = [{
          physicalLocation: {
            artifactLocation: {
              uri: filePath,
              uriBaseId: '%SRCROOT%'
            },
            region: {
              startLine: line,
              snippet: {
                text: issue.element
              }
            }
          },
          message: {
            text: 'Related element'
          }
        }];
      }

      sarifResults.push(resultEntry);
  }

  // Build invocation object
  const invocation = {
    executionSuccessful: true,
    startTimeUtc: new Date().toISOString(),
    endTimeUtc: new Date().toISOString(),
    toolConfigurationNotifications: [],
    properties: {
      tier: normalized.tier,
      urlCount: normalized.total,
      distribution: normalized.distribution
    }
  };

  // Mark as failed if there are failing URLs
  if (normalized.distribution && normalized.distribution.failing > 0) {
    invocation.exitCode = 1;
  } else {
    invocation.exitCode = 0;
  }

  // Build the complete SARIF document
  const sarifDocument = {
    _generated: {
      tool: 'mat-a11y',
      notice: 'Generated file - do not edit',
      promo: 'traufix.de | freelancermap.de/profil/robin-spanier'
    },
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [{
      tool: {
        driver: {
          name: toolName,
          version: toolVersion,
          semanticVersion: toolVersion,
          informationUri: 'https://github.com/anthropics/mat-a11y',
          rules: Array.from(rules.values()),
          properties: {
            'analysis-tier': results.tier
          }
        }
      },
      artifacts: Array.from(artifacts.values()),
      results: sarifResults,
      invocations: [invocation],
      properties: {
        id: runId,
        summary: {
          urls: normalized.total,
          passing: normalized.distribution?.passing || 0,
          warning: normalized.distribution?.warning || 0,
          failing: normalized.distribution?.failing || 0
        }
      }
    }]
  };

  // Add original URI base IDs if repository URI is provided
  if (repositoryUri) {
    sarifDocument.runs[0].originalUriBaseIds = {
      '%SRCROOT%': {
        uri: repositoryUri
      }
    };
  }

  return JSON.stringify(sarifDocument, null, 2);
}

module.exports = {
  name: 'sarif',
  description: 'SARIF 2.1.0 format for GitHub Security tab and code scanning',
  category: 'cicd',
  output: 'json',
  fileExtension: '.sarif.json',
  mimeType: 'application/sarif+json',
  format
};
