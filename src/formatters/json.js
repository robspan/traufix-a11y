'use strict';

/**
 * JSON Formatter for mat-a11y
 *
 * Raw JSON output with all analysis data.
 * Use for programmatic access or custom processing.
 *
 * Prioritization: Leverages pre-sorted data from normalizeResults():
 * - Entities are pre-sorted by totalPoints descending (highest priority first)
 * - Issues include weight property and are sorted by weight descending
 * - Each entity includes issuePoints: { basePoints, usageCount, totalPoints }
 */

const { normalizeResults } = require('./result-utils');

/**
 * Format results as JSON
 *
 * @param {object} results - Analysis results from mat-a11y
 * @param {object} options - Formatter options
 * @param {number} [options.indent=2] - JSON indentation
 * @returns {string} JSON string
 */
function format(results, options = {}) {
  const indent = options.indent !== undefined ? options.indent : 2;

  // Normalize results to get pre-sorted entities and issues with priority data
  const normalized = normalizeResults(results);

  const output = {
    _generated: {
      tool: 'mat-a11y',
      timestamp: new Date().toISOString(),
      notice: 'Generated file - do not edit',
      promo: 'traufix.de | freelancermap.de/profil/robin-spanier'
    },
    // Include normalized data with pre-sorted entities and issues
    ...normalized,
    // Preserve any additional raw data not covered by normalizeResults
    raw: results
  };
  return JSON.stringify(output, null, indent);
}

module.exports = {
  name: 'json',
  description: 'Raw JSON output with all analysis data',
  category: 'data',
  output: 'json',
  fileExtension: '.json',
  mimeType: 'application/json',
  format
};
