/**
 * Verify Structure Check
 *
 * Pre-verification that ensures all verify files have the required 4-dimensional
 * test structure before running the actual self-test.
 *
 * Required sections (each must have at least 1 line of actual code, not just comments):
 *   - @a11y-pass:           Obvious cases that should NOT trigger issues
 *   - @a11y-fail:           Obvious cases that SHOULD trigger issues
 *   - @a11y-false-positive: Tricky accessible code that naive checks might incorrectly flag
 *   - @a11y-false-negative: Tricky inaccessible code that naive checks might miss
 *
 * The 4 dimensions ensure comprehensive testing:
 *   - pass + false-positive → both expect 0 issues (obvious + edge cases)
 *   - fail + false-negative → both expect >0 issues (obvious + edge cases)
 */

const fs = require('fs');
const path = require('path');

const REQUIRED_SECTIONS = [
  '@a11y-pass',
  '@a11y-fail',
  '@a11y-false-positive',
  '@a11y-false-negative'
];

// Minimum non-whitespace content lines required after each section marker
const MIN_CONTENT_LINES = 1;

/**
 * Check if a verify file has all required sections with content
 */
function checkVerifyFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(path.dirname(filePath));
  const issues = [];

  for (const section of REQUIRED_SECTIONS) {
    // Match section marker in both HTML comments and SCSS/CSS comments
    const htmlPattern = new RegExp(`<!--\\s*${section}\\s*-->`, 'i');
    const scssPattern = new RegExp(`(?:\\/\\*|\\/)\\s*${section}`, 'i');

    const hasSection = htmlPattern.test(content) || scssPattern.test(content);

    if (!hasSection) {
      issues.push({
        check: fileName,
        file: filePath,
        section,
        error: `Missing section: ${section}`
      });
      continue;
    }

    // Check if section has actual content (not just whitespace/comments)
    const sectionContent = extractSectionContent(content, section);
    const contentLineCount = countContentLines(sectionContent);

    if (contentLineCount < MIN_CONTENT_LINES) {
      issues.push({
        check: fileName,
        file: filePath,
        section,
        error: `Section ${section} has no actual content (found ${contentLineCount} content lines, need ${MIN_CONTENT_LINES})`
      });
    }
  }

  return issues;
}

/**
 * Extract content between a section marker and the next section (or end of file)
 */
function extractSectionContent(content, section) {
  // Find section start
  const patterns = [
    new RegExp(`<!--\\s*${section}\\s*-->`, 'i'),
    new RegExp(`\\/\\*\\s*${section}\\s*\\*\\/`, 'i'),
    new RegExp(`\\/\\/\\s*${section}`, 'i')
  ];

  let startIndex = -1;
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      startIndex = match.index + match[0].length;
      break;
    }
  }

  if (startIndex === -1) return '';

  // Find next section or end of file
  let endIndex = content.length;
  for (const nextSection of REQUIRED_SECTIONS) {
    if (nextSection === section) continue;

    const nextPatterns = [
      new RegExp(`<!--\\s*${nextSection}\\s*-->`, 'i'),
      new RegExp(`\\/\\*\\s*${nextSection}\\s*\\*\\/`, 'i'),
      new RegExp(`\\/\\/\\s*${nextSection}`, 'i')
    ];

    for (const pattern of nextPatterns) {
      const match = content.substring(startIndex).match(pattern);
      if (match && (startIndex + match.index) < endIndex) {
        endIndex = startIndex + match.index;
      }
    }
  }

  return content.substring(startIndex, endIndex);
}

/**
 * Strip all comments from content and return only actual code
 * Handles: HTML comments, CSS block comments, SCSS line comments
 */
function stripComments(content) {
  let result = content;

  // Remove HTML comments (including multi-line)
  result = result.replace(/<!--[\s\S]*?-->/g, '');

  // Remove CSS/SCSS block comments (including multi-line)
  result = result.replace(/\/\*[\s\S]*?\*\//g, '');

  // Remove single-line SCSS comments
  result = result.replace(/\/\/.*$/gm, '');

  return result;
}

/**
 * Count actual content lines (non-empty, non-comment)
 */
function countContentLines(sectionContent) {
  // Strip all comments first
  const stripped = stripComments(sectionContent);

  // Count non-empty lines
  const lines = stripped
    .split('\n')
    .filter(line => line.trim().length > 0);

  return lines.length;
}

// Verify files are in dev-tools/tests/verify-files (not in src/checks)
const VERIFY_FILES_DIR = path.join(__dirname, 'tests', 'verify-files');

/**
 * Run structure verification on all verify files
 */
function verifyAllStructures(verifyFilesDir) {
  const results = {
    passed: [],
    failed: [],
    skipped: []
  };

  if (!verifyFilesDir) {
    verifyFilesDir = VERIFY_FILES_DIR;
  }

  if (!fs.existsSync(verifyFilesDir)) {
    console.error(`Verify files directory not found: ${verifyFilesDir}`);
    return results;
  }

  const verifyFiles = fs.readdirSync(verifyFilesDir)
    .filter(f => f.endsWith('.html') || f.endsWith('.scss'));

  for (const fileName of verifyFiles) {
    const checkName = path.basename(fileName, path.extname(fileName));
    const verifyFile = path.join(verifyFilesDir, fileName);

    const issues = checkVerifyFile(verifyFile);

    if (issues.length === 0) {
      results.passed.push(checkName);
    } else {
      results.failed.push({ check: checkName, issues });
    }
  }

  return results;
}

/**
 * Print verification results
 */
function printResults(results) {
  console.log('\n' + '='.repeat(60));
  console.log('VERIFY FILE STRUCTURE CHECK');
  console.log('='.repeat(60));
  console.log(`\nRequired sections: ${REQUIRED_SECTIONS.join(', ')}`);
  console.log(`Minimum content lines per section: ${MIN_CONTENT_LINES}\n`);

  console.log(`Total checks: ${results.passed.length + results.failed.length + results.skipped.length}`);
  console.log(`  Complete:   ${results.passed.length}`);
  console.log(`  Incomplete: ${results.failed.length}`);
  console.log(`  Skipped:    ${results.skipped.length}`);

  if (results.failed.length > 0) {
    console.log('\n' + '-'.repeat(40));
    console.log('INCOMPLETE VERIFY FILES:');
    for (const { check, issues } of results.failed) {
      console.log(`\n  [INCOMPLETE] ${check}`);
      for (const issue of issues) {
        console.log(`    - ${issue.error}`);
      }
    }
  }

  if (results.skipped.length > 0) {
    console.log('\n' + '-'.repeat(40));
    console.log('SKIPPED (no verify file):');
    for (const { check } of results.skipped) {
      console.log(`  - ${check}`);
    }
  }

  console.log('\n' + '='.repeat(60));

  return results.failed.length === 0;
}

/**
 * Main entry point
 */
function run(verifyFilesDir) {
  if (!verifyFilesDir) {
    verifyFilesDir = VERIFY_FILES_DIR;
  }

  const results = verifyAllStructures(verifyFilesDir);
  const allPassed = printResults(results);

  return { success: allPassed, results };
}

module.exports = { run, verifyAllStructures, checkVerifyFile, REQUIRED_SECTIONS };

// Run directly if called as script
if (require.main === module) {
  const { success } = run();
  process.exit(success ? 0 : 1);
}
