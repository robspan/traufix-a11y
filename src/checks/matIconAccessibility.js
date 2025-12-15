const { format } = require('../core/errors');

// Pre-compiled regex patterns
const EARLY_EXIT = /mat-icon|\bmatIcon\b/i;
// Combined pattern: matches both <mat-icon>...</mat-icon> and elements with [matIcon]
const MAT_ICON_COMBINED = /<mat-icon([^>]*)(?:>([^<]*)<\/mat-icon>|\/>)|<[a-z][a-z0-9-]*[^>]*\bmatIcon\b[^>]*>/gi;
const ARIA_HIDDEN_TRUE = /aria-hidden\s*=\s*["']true["']/i;
const ARIA_LABEL_VALUE = /aria-label\s*=\s*["'][^"']+["']/i;
const ARIA_LABELLEDBY_VALUE = /aria-labelledby\s*=\s*["'][^"']+["']/i;

module.exports = {
  name: 'matIconAccessibility',
  description: 'Check that mat-icon has proper accessibility attributes (aria-hidden, aria-label, or aria-labelledby)',
  tier: 'material',
  type: 'html',
  weight: 7,
  wcag: '1.1.1',

  check(content) {
    // Early exit: no relevant elements, no issues
    if (!EARLY_EXIT.test(content)) {
      return { pass: true, issues: [], elementsFound: 0 };
    }

    const issues = [];
    let elementsFound = 0;

    // Reset regex state
    MAT_ICON_COMBINED.lastIndex = 0;

    let match;
    while ((match = MAT_ICON_COMBINED.exec(content)) !== null) {
      elementsFound++;
      const fullMatch = match[0];

      // Fast path: test against full match for aria attributes
      if (ARIA_HIDDEN_TRUE.test(fullMatch) || 
          ARIA_LABEL_VALUE.test(fullMatch) || 
          ARIA_LABELLEDBY_VALUE.test(fullMatch)) {
        continue;
      }

      issues.push(format('MAT_ICON_MISSING_LABEL', { element: fullMatch }));
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
