/**
 * mat-a11y Output Formatters
 *
 * 14 output formats for CI/CD, monitoring, and notifications.
 * Each formatter is a .js file with name, category, output, and format().
 */

const {
  loadAllFormatters,
  getFormattersByCategory,
  getFormattersByOutput,
  getFormatter,
  format,
  listFormatters,
  listFormattersWithInfo,
  VALID_CATEGORIES,
  VALID_OUTPUTS
} = require('./loader');

module.exports = {
  // Core API
  loadAllFormatters,
  getFormattersByCategory,
  getFormattersByOutput,
  getFormatter,
  format,
  listFormatters,
  listFormattersWithInfo,

  // Constants
  VALID_CATEGORIES,
  VALID_OUTPUTS
};
