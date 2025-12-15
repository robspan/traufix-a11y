const { format } = require('../core/errors');

module.exports = {
  name: 'matProgressBarLabel',
  description: 'Check that mat-progress-bar has aria-label describing its purpose',
  tier: 'full',
  type: 'html',
  weight: 3,

  check(content) {
    // Early exit: no relevant elements, no issues
    if (!/mat-progress-bar/i.test(content)) {
      return { pass: true, issues: [], elementsFound: 0 };
    }

    const issues = [];
    let elementsFound = 0;

    /**
     * Helper to check if an element has a valid accessible label
     * Handles both static attributes and Angular property bindings
     */
    function hasAccessibleLabel(attributes) {
      // Static aria-label with non-empty value (not empty string)
      const hasStaticAriaLabel = /(?<!\[)aria-label\s*=\s*["'][^"']+["']/i.test(attributes);
      // Angular bound aria-label: [aria-label]="..." or [attr.aria-label]="..."
      // Handles both variable bindings and string literals like [attr.aria-label]="'text'"
      const hasBoundAriaLabel = /\[aria-label\]\s*=\s*["'].+["']/i.test(attributes) ||
                                /\[attr\.aria-label\]\s*=\s*["'].+["']/i.test(attributes);
      // Static aria-labelledby
      const hasStaticAriaLabelledby = /(?<!\[)aria-labelledby\s*=\s*["'][^"']+["']/i.test(attributes);
      // Angular bound aria-labelledby
      const hasBoundAriaLabelledby = /\[aria-labelledby\]\s*=\s*["'].+["']/i.test(attributes) ||
                                     /\[attr\.aria-labelledby\]\s*=\s*["'].+["']/i.test(attributes);

      return hasStaticAriaLabel || hasBoundAriaLabel || hasStaticAriaLabelledby || hasBoundAriaLabelledby;
    }

    // Match mat-progress-bar elements (both self-closing and with closing tag)
    // Pattern: <mat-progress-bar ...> or <mat-progress-bar ... />
    const progressBarRegex = /<mat-progress-bar(?![a-z-])([^>]*?)(?:\/>|>)/gi;

    let match;
    while ((match = progressBarRegex.exec(content)) !== null) {
      elementsFound++;
      const fullMatch = match[0];
      const attributes = match[1] || '';

      if (!hasAccessibleLabel(attributes)) {
        issues.push(format('MAT_PROGRESS_MISSING_LABEL', { element: fullMatch }));
      }
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
