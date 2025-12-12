/**
 * Formatter Verification System
 *
 * Tests all formatters against comprehensive fixtures to ensure:
 * - No crashes with any input type
 * - Valid output format (JSON parseable, XML well-formed, etc.)
 * - Proper handling of edge cases
 *
 * Uses both:
 * - Static fixtures (hand-crafted edge cases)
 * - Generated fixtures (real check output from verify files)
 */

'use strict';

const path = require('path');
const { loadAllFormatters } = require('./index.js');
const fixtures = require('./_fixtures/sample-results.js');
const { generateDiverseFixtures } = require('./_fixtures/generateFixtures.js');

/**
 * Validate JSON output
 * @param {string} output - Formatter output
 * @returns {{ valid: boolean, error?: string }}
 */
function validateJSON(output) {
  try {
    JSON.parse(output);
    return { valid: true };
  } catch (e) {
    return { valid: false, error: `Invalid JSON: ${e.message}` };
  }
}

/**
 * Validate XML output (basic well-formedness check)
 * @param {string} output - Formatter output
 * @returns {{ valid: boolean, error?: string }}
 */
function validateXML(output) {
  // Check for basic XML structure
  if (!output.trim().startsWith('<?xml') && !output.trim().startsWith('<')) {
    return { valid: false, error: 'Output does not start with XML declaration or tag' };
  }

  // Check for unescaped special characters (basic check)
  // Look for & not followed by amp; lt; gt; quot; apos; or #
  const unescapedAmpersand = /&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g;
  const matches = output.match(unescapedAmpersand);
  if (matches && matches.length > 0) {
    return { valid: false, error: `Found ${matches.length} unescaped ampersands` };
  }

  // Check for balanced tags (very basic)
  const openTags = (output.match(/<[a-zA-Z][^>]*[^/]>/g) || []).length;
  const closeTags = (output.match(/<\/[a-zA-Z][^>]*>/g) || []).length;
  const selfClosing = (output.match(/<[^>]*\/>/g) || []).length;

  // This is a rough heuristic - real XML validation would use a parser
  if (Math.abs(openTags - closeTags) > selfClosing + 5) {
    return { valid: false, error: `Possibly unbalanced tags: ${openTags} open, ${closeTags} close` };
  }

  return { valid: true };
}

/**
 * Validate text output
 * @param {string} output - Formatter output
 * @returns {{ valid: boolean, error?: string }}
 */
function validateText(output) {
  if (typeof output !== 'string') {
    return { valid: false, error: 'Output is not a string' };
  }
  return { valid: true };
}

/**
 * Validate HTML output
 * @param {string} output - Formatter output
 * @returns {{ valid: boolean, error?: string }}
 */
function validateHTML(output) {
  if (!output.includes('<') || !output.includes('>')) {
    return { valid: false, error: 'Output does not appear to contain HTML tags' };
  }
  return { valid: true };
}

/**
 * Get validator for output type
 * @param {string} outputType - Output type (json, xml, text, html)
 * @returns {Function}
 */
function getValidator(outputType) {
  switch (outputType) {
    case 'json': return validateJSON;
    case 'xml': return validateXML;
    case 'html': return validateHTML;
    default: return validateText;
  }
}

/**
 * Test a single formatter against a single fixture
 * @param {object} formatter - Formatter module
 * @param {object} fixture - Test fixture { name, data, type }
 * @returns {{ passed: boolean, error?: string, duration: number }}
 */
function testFormatterWithFixture(formatter, fixture) {
  const start = Date.now();

  try {
    // Run the formatter
    const output = formatter.format(fixture.data);
    const duration = Date.now() - start;

    // Check output is not empty
    if (!output || output.length === 0) {
      return { passed: false, error: 'Output is empty', duration };
    }

    // Validate output format
    const validator = getValidator(formatter.output);
    const validation = validator(output);

    if (!validation.valid) {
      return { passed: false, error: validation.error, duration };
    }

    return { passed: true, duration };
  } catch (e) {
    return {
      passed: false,
      error: `Threw exception: ${e.message}`,
      duration: Date.now() - start
    };
  }
}

/**
 * Get all fixtures (static + generated)
 * @returns {Array} Combined fixtures array
 */
function getAllFixtures() {
  // Start with static fixtures
  const allFixtures = [...fixtures.all];

  // Add dynamically generated fixtures from real check output
  try {
    const generated = generateDiverseFixtures();
    allFixtures.push(...generated);
  } catch (e) {
    // If generation fails, continue with static fixtures only
    console.warn(`[verifyFormatters] Warning: Could not generate fixtures: ${e.message}`);
  }

  return allFixtures;
}

/**
 * Verify all formatters against all fixtures
 * @param {object} options - Options
 * @param {boolean} options.includeGenerated - Include generated fixtures (default: true)
 * @returns {object} Verification results
 */
function verifyAllFormatters(options = {}) {
  const { includeGenerated = true } = options;

  const formatters = loadAllFormatters();
  const allFixtures = includeGenerated ? getAllFixtures() : fixtures.all;

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    fixtureCount: allFixtures.length,
    staticFixtures: fixtures.all.length,
    generatedFixtures: allFixtures.length - fixtures.all.length,
    formatters: {}
  };

  for (const [name, formatter] of formatters) {
    const formatterResult = {
      name,
      category: formatter.category,
      output: formatter.output,
      fixtures: {},
      passed: 0,
      failed: 0
    };

    for (const fixture of allFixtures) {
      results.total++;
      const testResult = testFormatterWithFixture(formatter, fixture);

      formatterResult.fixtures[fixture.name] = testResult;

      if (testResult.passed) {
        formatterResult.passed++;
        results.passed++;
      } else {
        formatterResult.failed++;
        results.failed++;
      }
    }

    results.formatters[name] = formatterResult;
  }

  return results;
}

/**
 * Format verification results for console output
 * @param {object} results - Verification results
 * @param {object} options - Formatting options
 * @param {boolean} options.verbose - Show all fixtures, not just failures
 * @returns {string}
 */
function formatVerifyResults(results, options = {}) {
  const { verbose = false } = options;
  const lines = [];

  lines.push('='.repeat(60));
  lines.push('FORMATTER VERIFICATION RESULTS');
  lines.push('='.repeat(60));
  lines.push('');

  // Summary
  const passRate = results.total > 0 ? ((results.passed / results.total) * 100).toFixed(1) : 0;
  const fixtureInfo = results.generatedFixtures > 0
    ? ` (${results.staticFixtures} static + ${results.generatedFixtures} generated)`
    : '';
  lines.push(`Fixtures:    ${results.fixtureCount || 'N/A'}${fixtureInfo}`);
  lines.push(`Total tests: ${results.total}`);
  lines.push(`  Passed:    ${results.passed}`);
  lines.push(`  Failed:    ${results.failed}`);
  lines.push(`  Pass rate: ${passRate}%`);
  lines.push('');

  // Per-formatter results
  const formatterNames = Object.keys(results.formatters).sort();
  const totalFixtures = results.fixtureCount || Object.keys(results.formatters[formatterNames[0]]?.fixtures || {}).length;

  for (const name of formatterNames) {
    const fr = results.formatters[name];
    const status = fr.failed === 0 ? '[PASS]' : '[FAIL]';

    lines.push(`${status} ${name} (${fr.passed}/${totalFixtures} fixtures)`);

    // Show failures
    for (const [fixtureName, testResult] of Object.entries(fr.fixtures)) {
      if (!testResult.passed) {
        lines.push(`       FAIL: ${fixtureName}`);
        lines.push(`             ${testResult.error}`);
      } else if (verbose) {
        lines.push(`       pass: ${fixtureName} (${testResult.duration}ms)`);
      }
    }
  }

  lines.push('');
  lines.push('='.repeat(60));

  return lines.join('\n');
}

/**
 * Get summary of verification results
 * @param {object} results - Verification results
 * @returns {object}
 */
function getVerifySummary(results) {
  const failedFormatters = [];
  const passedFormatters = [];

  for (const [name, fr] of Object.entries(results.formatters)) {
    if (fr.failed > 0) {
      failedFormatters.push({
        name,
        failed: fr.failed,
        total: fr.passed + fr.failed
      });
    } else {
      passedFormatters.push(name);
    }
  }

  return {
    total: results.total,
    passed: results.passed,
    failed: results.failed,
    passRate: results.total > 0 ? (results.passed / results.total) * 100 : 0,
    formatterCount: Object.keys(results.formatters).length,
    passedFormatters,
    failedFormatters
  };
}

// ============================================
// CLI support - run directly
// ============================================

if (require.main === module) {
  console.log('Running formatter verification...\n');

  const results = verifyAllFormatters();
  console.log(formatVerifyResults(results, { verbose: process.argv.includes('--verbose') }));

  const summary = getVerifySummary(results);
  process.exit(summary.failed > 0 ? 1 : 0);
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  verifyAllFormatters,
  formatVerifyResults,
  getVerifySummary,
  testFormatterWithFixture,

  // Validators
  validateJSON,
  validateXML,
  validateHTML,
  validateText
};
