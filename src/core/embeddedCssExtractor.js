/**
 * @fileoverview Extract embedded CSS from HTML files.
 *
 * This module extracts CSS content from:
 * - <style> tags
 * - Inline style="" attributes (future enhancement)
 *
 * @module core/embeddedCssExtractor
 */

'use strict';

// Regex to match <style> tags and capture their content
const STYLE_TAG_REGEX = /<style[^>]*>([\s\S]*?)<\/style>/gi;

// Early exit check - skip files without <style> tags
const HAS_STYLE_TAG = /<style[\s>]/i;

/**
 * Extract CSS from <style> tags in HTML content.
 *
 * @param {string} htmlContent - HTML content to extract CSS from
 * @returns {Array<{css: string, startLine: number, endLine: number}>} Array of extracted CSS blocks with line info
 */
function extractStyleTags(htmlContent) {
  // Early exit - no style tags, return empty array
  if (!HAS_STYLE_TAG.test(htmlContent)) {
    return [];
  }

  const results = [];
  STYLE_TAG_REGEX.lastIndex = 0;

  let match;
  while ((match = STYLE_TAG_REGEX.exec(htmlContent)) !== null) {
    const fullMatch = match[0];
    const cssContent = match[1];
    const startIndex = match.index;

    // Calculate line number of <style> tag
    const startLine = getLineNumber(htmlContent, startIndex);

    // Calculate end line
    const endIndex = startIndex + fullMatch.length;
    const endLine = getLineNumber(htmlContent, endIndex);

    // Calculate offset for the CSS content (after <style...>)
    const styleTagEnd = htmlContent.indexOf('>', startIndex) + 1;
    const cssStartLine = getLineNumber(htmlContent, styleTagEnd);

    if (cssContent.trim()) {
      results.push({
        css: cssContent,
        startLine: cssStartLine,
        endLine: endLine - 1,
        tagStartLine: startLine
      });
    }
  }

  return results;
}

/**
 * Get line number from character index.
 *
 * @param {string} content - Content to search
 * @param {number} index - Character index
 * @returns {number} Line number (1-indexed)
 */
function getLineNumber(content, index) {
  let line = 1;
  for (let i = 0; i < index && i < content.length; i++) {
    if (content[i] === '\n') line++;
  }
  return line;
}

/**
 * Adjust issue line numbers to match original HTML file.
 *
 * @param {string[]} issues - Array of issue messages
 * @param {number} lineOffset - Line offset to add
 * @returns {string[]} Adjusted issue messages
 */
function adjustIssueLineNumbers(issues, lineOffset) {
  return issues.map(issue => {
    // Match patterns like "(line 5)" at end of message
    return issue.replace(/\(line\s+(\d+)\)(\s*)$/, (match, line, trailing) => {
      const adjustedLine = parseInt(line, 10) + lineOffset - 1;
      return `(line ${adjustedLine})${trailing}`;
    });
  });
}

/**
 * Check if HTML content has embedded CSS.
 *
 * @param {string} htmlContent - HTML content to check
 * @returns {boolean} True if file has <style> tags
 */
function hasEmbeddedCss(htmlContent) {
  return HAS_STYLE_TAG.test(htmlContent);
}

module.exports = {
  extractStyleTags,
  adjustIssueLineNumbers,
  hasEmbeddedCss,
  getLineNumber
};
