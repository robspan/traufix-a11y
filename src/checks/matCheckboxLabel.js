const { format } = require('../core/errors');

// Pre-compiled regex patterns
const EARLY_EXIT = /mat-checkbox/i;
const CHECKBOX_REGEX = /<mat-checkbox\b([^>]*)(?:\/>|>([\s\S]*?)<\/mat-checkbox>)/gi;
const ARIA_LABEL_VALUE = /\baria-label\s*=\s*["'][^"']+["']|\[aria-label\]|\[attr\.aria-label\]/i;
const ARIA_LABELLEDBY = /\baria-labelledby\s*=\s*["'][^"']+["']|\[aria-labelledby\]|\[attr\.aria-labelledby\]/i;
const ANGULAR_INTERPOLATION = /\{\{[^}]+\}\}/;
const STRIP_TAGS = /<[^>]+>/g;

module.exports = {
  name: 'matCheckboxLabel',
  description: 'Check that mat-checkbox has an accessible label',
  tier: 'full',
  type: 'html',
  weight: 3,

  check(content) {
    // Early exit: no relevant elements, no issues
    if (!EARLY_EXIT.test(content)) {
      return { pass: true, issues: [], elementsFound: 0 };
    }

    const issues = [];
    let elementsFound = 0;

    // Build line index lazily for O(log n) lookups
    let lineStarts = null;
    const getLineNumber = (pos) => {
      if (!lineStarts) {
        lineStarts = [0];
        for (let i = 0; i < content.length; i++) {
          if (content[i] === '\n') lineStarts.push(i + 1);
        }
      }
      let lo = 0, hi = lineStarts.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (lineStarts[mid] <= pos) lo = mid;
        else hi = mid - 1;
      }
      return lo + 1;
    };

    // Reset regex state
    CHECKBOX_REGEX.lastIndex = 0;

    let match;
    while ((match = CHECKBOX_REGEX.exec(content)) !== null) {
      elementsFound++;
      const fullMatch = match[0];
      const attrs = match[1] || '';
      const innerContent = match[2] || '';

      // Fast path: check aria attributes
      if (ARIA_LABEL_VALUE.test(attrs) || ARIA_LABELLEDBY.test(attrs)) {
        continue;
      }

      // Check for self-closing tag
      const isSelfClosing = fullMatch.endsWith('/>');

      if (!isSelfClosing && innerContent) {
        // Check for Angular interpolation
        if (ANGULAR_INTERPOLATION.test(innerContent)) {
          continue;
        }

        // Check for text content
        const textContent = innerContent.replace(STRIP_TAGS, '').replace(/\s+/g, ' ').trim();
        if (textContent.length > 0) {
          continue;
        }
      }

      // No accessible label found
      const lineNumber = getLineNumber(match.index);
      issues.push(format('MAT_CHECKBOX_MISSING_LABEL', { element: fullMatch, line: lineNumber }));
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
