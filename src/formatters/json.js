'use strict';

/**
 * JSON Formatter for mat-a11y
 * 
 * Raw JSON output with all analysis data.
 * Use for programmatic access or custom processing.
 */

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
  const output = {
    _generated: {
      tool: 'mat-a11y',
      timestamp: new Date().toISOString(),
      notice: 'Generated file - do not edit',
      promo: 'traufix.de | freelancermap.de/profil/robin-spanier'
    },
    ...results
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
