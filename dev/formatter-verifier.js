/**
 * Formatter Verifier
 *
 * Validates that each formatter produces correct output format.
 * Similar to check verification for accessibility checks.
 *
 * @module dev/formatter-verifier
 */

'use strict';

const { loadAllFormatters } = require('../src/formatters/loader');
const { sitemapResult, minimalResult, emptyResult, allFailingResult } = require('./fixtures/sample-results');

/**
 * Validators for each output type
 */
const outputValidators = {
  /**
   * Validate JSON output
   */
  json: (output, formatterName) => {
    const errors = [];

    // Must be valid JSON
    let parsed;
    try {
      parsed = JSON.parse(output);
    } catch (e) {
      errors.push(`Invalid JSON: ${e.message}`);
      return { valid: false, errors };
    }

    // Must be object or array
    if (typeof parsed !== 'object' || parsed === null) {
      errors.push('JSON must be an object or array');
    }

    // Format-specific validation
    const formatValidation = formatSpecificValidators[formatterName];
    if (formatValidation) {
      const formatErrors = formatValidation(parsed, output);
      errors.push(...formatErrors);
    }

    return { valid: errors.length === 0, errors, parsed };
  },

  /**
   * Validate XML output
   */
  xml: (output, formatterName) => {
    const errors = [];

    // Must start with XML declaration or root element
    const trimmed = output.trim();
    if (!trimmed.startsWith('<?xml') && !trimmed.startsWith('<')) {
      errors.push('XML must start with declaration or root element');
    }

    // Basic well-formedness checks
    if (!trimmed.endsWith('>')) {
      errors.push('XML must end with closing tag');
    }

    // Check for matching tags (basic)
    const openTags = (trimmed.match(/<[a-zA-Z][^>]*[^\/]>/g) || []).length;
    const closeTags = (trimmed.match(/<\/[a-zA-Z][^>]*>/g) || []).length;
    const selfClosing = (trimmed.match(/<[a-zA-Z][^>]*\/>/g) || []).length;

    // This is a rough check - open tags should roughly equal close tags
    // (self-closing don't count)
    if (Math.abs(openTags - closeTags) > openTags * 0.1) {
      errors.push(`Potential unclosed tags: ${openTags} open, ${closeTags} close`);
    }

    // Format-specific validation
    const formatValidation = formatSpecificValidators[formatterName];
    if (formatValidation) {
      const formatErrors = formatValidation(null, output);
      errors.push(...formatErrors);
    }

    return { valid: errors.length === 0, errors };
  },

  /**
   * Validate text output
   */
  text: (output, formatterName) => {
    const errors = [];

    // Must be non-empty string
    if (typeof output !== 'string') {
      errors.push('Output must be a string');
      return { valid: false, errors };
    }

    if (output.trim().length === 0) {
      errors.push('Output is empty');
    }

    // Format-specific validation
    const formatValidation = formatSpecificValidators[formatterName];
    if (formatValidation) {
      const formatErrors = formatValidation(null, output);
      errors.push(...formatErrors);
    }

    return { valid: errors.length === 0, errors };
  },

  /**
   * Validate HTML output
   */
  html: (output, formatterName) => {
    const errors = [];

    if (!output.includes('<') || !output.includes('>')) {
      errors.push('Output does not appear to be HTML');
    }

    return { valid: errors.length === 0, errors };
  }
};

/**
 * Format-specific validators
 * Each returns an array of error strings
 */
const formatSpecificValidators = {
  sarif: (parsed) => {
    const errors = [];
    if (!parsed.$schema) errors.push('Missing $schema');
    if (parsed.version !== '2.1.0') errors.push('Version should be 2.1.0');
    if (!Array.isArray(parsed.runs)) errors.push('Missing runs array');
    if (parsed.runs && parsed.runs[0]) {
      if (!parsed.runs[0].tool) errors.push('Missing tool object');
      if (!Array.isArray(parsed.runs[0].results)) errors.push('Missing results array');
    }
    return errors;
  },

  junit: (parsed, output) => {
    const errors = [];
    if (!output.includes('<testsuites')) errors.push('Missing <testsuites> root');
    if (!output.includes('<testsuite')) errors.push('Missing <testsuite>');
    if (!output.includes('tests="')) errors.push('Missing tests attribute');
    if (!output.includes('failures="')) errors.push('Missing failures attribute');
    return errors;
  },

  'github-annotations': (parsed, output) => {
    const errors = [];
    // Should contain GitHub annotation format
    const hasAnnotations = output.includes('::error') ||
                          output.includes('::warning') ||
                          output.includes('::notice');
    if (!hasAnnotations) errors.push('Missing GitHub annotation commands (::error, ::warning, ::notice)');
    return errors;
  },

  'gitlab-codequality': (parsed) => {
    const errors = [];
    if (!Array.isArray(parsed)) errors.push('Must be an array');
    if (parsed.length > 0) {
      const first = parsed[0];
      if (!first.type) errors.push('Missing type field');
      if (!first.check_name) errors.push('Missing check_name field');
      if (!first.fingerprint) errors.push('Missing fingerprint field');
      if (!first.location) errors.push('Missing location field');
    }
    return errors;
  },

  markdown: (parsed, output) => {
    const errors = [];
    if (!output.includes('#')) errors.push('Missing markdown headers');
    if (!output.includes('|')) errors.push('Missing markdown tables');
    return errors;
  },

  csv: (parsed, output) => {
    const errors = [];
    const lines = output.trim().split('\n');
    if (lines.length < 1) errors.push('CSV must have at least header row');
    // Check header has expected columns
    const header = lines[0].toLowerCase();
    if (!header.includes('url') && !header.includes('path')) {
      errors.push('CSV header should include URL or Path column');
    }
    if (!header.includes('score')) {
      errors.push('CSV header should include Score column');
    }
    return errors;
  },

  prometheus: (parsed, output) => {
    const errors = [];
    // Check for metric format: metric_name{labels} value
    if (!output.includes('mat_a11y')) errors.push('Missing mat_a11y metrics');
    // Should have HELP/TYPE comments and metric lines
    const hasHelp = output.includes('# HELP');
    const hasType = output.includes('# TYPE');
    // Metric line: metric_name{label="value"} 123
    const hasMetrics = /^mat_a11y[a-z_]*(\{[^}]*\})?\s+[\d.]+/m.test(output);
    if (!hasHelp && !hasType && !hasMetrics) {
      errors.push('No valid Prometheus format found (missing HELP/TYPE/metrics)');
    }
    return errors;
  },

  'grafana-json': (parsed) => {
    const errors = [];
    if (!parsed.timeseries && !parsed.table) {
      errors.push('Must have timeseries or table data');
    }
    return errors;
  },

  slack: (parsed) => {
    const errors = [];
    if (!parsed.blocks && !parsed.attachments && !parsed.text) {
      errors.push('Slack message must have blocks, attachments, or text');
    }
    return errors;
  },

  discord: (parsed) => {
    const errors = [];
    if (!parsed.embeds && !parsed.content) {
      errors.push('Discord message must have embeds or content');
    }
    return errors;
  },

  teams: (parsed) => {
    const errors = [];
    // Adaptive Card format
    if (!parsed.type && !parsed.attachments) {
      errors.push('Teams message must be Adaptive Card or have attachments');
    }
    return errors;
  },

  datadog: (parsed) => {
    const errors = [];
    if (!parsed.series && !Array.isArray(parsed)) {
      errors.push('DataDog format must have series array');
    }
    return errors;
  },

  sonarqube: (parsed) => {
    const errors = [];
    if (!parsed.issues && !Array.isArray(parsed)) {
      errors.push('SonarQube format must have issues array');
    }
    return errors;
  },

  checkstyle: (parsed, output) => {
    const errors = [];
    if (!output.includes('<checkstyle')) errors.push('Missing <checkstyle> root');
    return errors;
  }
};

/**
 * Verify a single formatter
 *
 * @param {object} formatter - Formatter module
 * @param {object} testData - Test data to use
 * @returns {object} Verification result
 */
function verifyFormatter(formatter, testData = sitemapResult) {
  const result = {
    name: formatter.name,
    status: 'unknown',
    errors: [],
    output: null,
    outputLength: 0
  };

  try {
    // Run the formatter
    const output = formatter.format(testData);
    result.output = output;
    result.outputLength = output ? output.length : 0;

    // Validate output type
    const validator = outputValidators[formatter.output];
    if (!validator) {
      result.errors.push(`Unknown output type: ${formatter.output}`);
      result.status = 'failed';
      return result;
    }

    // Run validation
    const validation = validator(output, formatter.name);
    if (!validation.valid) {
      result.errors.push(...validation.errors);
      result.status = 'failed';
    } else {
      result.status = 'verified';
    }
  } catch (error) {
    result.errors.push(`Exception: ${error.message}`);
    result.status = 'failed';
  }

  return result;
}

/**
 * Verify all formatters
 *
 * @param {object} options - Options
 * @param {boolean} [options.verbose=false] - Include output in results
 * @returns {object} Verification results
 */
function verifyAllFormatters(options = {}) {
  const registry = loadAllFormatters();
  const results = {
    total: registry.size,
    verified: 0,
    failed: 0,
    details: []
  };

  // Test with standard fixture
  for (const [name, formatter] of registry) {
    const verification = verifyFormatter(formatter, sitemapResult);

    if (!options.verbose) {
      delete verification.output;
    }

    results.details.push(verification);

    if (verification.status === 'verified') {
      results.verified++;
    } else {
      results.failed++;
    }
  }

  // Sort by status (failed first)
  results.details.sort((a, b) => {
    if (a.status === 'failed' && b.status !== 'failed') return -1;
    if (a.status !== 'failed' && b.status === 'failed') return 1;
    return a.name.localeCompare(b.name);
  });

  return results;
}

/**
 * Verify formatters handle edge cases
 *
 * @returns {object} Edge case test results
 */
function verifyEdgeCases() {
  const registry = loadAllFormatters();
  const results = {
    total: registry.size,
    passed: 0,
    failed: 0,
    details: []
  };

  const edgeCases = [
    { name: 'minimal', data: minimalResult },
    { name: 'empty', data: emptyResult },
    { name: 'allFailing', data: allFailingResult }
  ];

  for (const [name, formatter] of registry) {
    const formatterResult = {
      name,
      edgeCases: []
    };

    let allPassed = true;

    for (const edgeCase of edgeCases) {
      try {
        const output = formatter.format(edgeCase.data);
        const validator = outputValidators[formatter.output];
        const validation = validator(output, name);

        formatterResult.edgeCases.push({
          case: edgeCase.name,
          status: validation.valid ? 'passed' : 'failed',
          errors: validation.errors
        });

        if (!validation.valid) allPassed = false;
      } catch (error) {
        formatterResult.edgeCases.push({
          case: edgeCase.name,
          status: 'failed',
          errors: [`Exception: ${error.message}`]
        });
        allPassed = false;
      }
    }

    formatterResult.status = allPassed ? 'passed' : 'failed';
    results.details.push(formatterResult);

    if (allPassed) {
      results.passed++;
    } else {
      results.failed++;
    }
  }

  return results;
}

/**
 * Get verification summary as formatted string
 *
 * @param {object} results - Verification results
 * @returns {string} Formatted summary
 */
function formatVerificationSummary(results) {
  const lines = [];

  lines.push('========================================');
  lines.push('  FORMATTER VERIFICATION');
  lines.push('========================================');
  lines.push('');
  lines.push(`Total: ${results.total}`);
  lines.push(`Verified: ${results.verified}`);
  lines.push(`Failed: ${results.failed}`);
  lines.push('');

  if (results.failed > 0) {
    lines.push('FAILED:');
    for (const detail of results.details) {
      if (detail.status === 'failed') {
        lines.push(`  ${detail.name}:`);
        for (const error of detail.errors) {
          lines.push(`    - ${error}`);
        }
      }
    }
    lines.push('');
  }

  lines.push('VERIFIED:');
  for (const detail of results.details) {
    if (detail.status === 'verified') {
      lines.push(`  ✓ ${detail.name} (${detail.outputLength} bytes)`);
    }
  }

  lines.push('');
  lines.push('========================================');

  return lines.join('\n');
}

module.exports = {
  verifyFormatter,
  verifyAllFormatters,
  verifyEdgeCases,
  formatVerificationSummary,
  outputValidators,
  formatSpecificValidators
};
