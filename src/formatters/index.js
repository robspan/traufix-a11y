/**
 * mat-a11y Output Formatters
 *
 * 85+ output formats for every integration imaginable.
 * Each formatter is a module in its own folder with validation.
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
