const { format } = require('../core/errors');

module.exports = {
  name: 'matPaginatorLabel',
  description: 'Check that mat-paginator has aria-label for screen reader context',
  tier: 'full',
  type: 'html',
  weight: 3,

  check(content) {
    // Early exit: no relevant elements, no issues
    if (!/mat-paginator/i.test(content)) {
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

    // Match mat-paginator elements (both self-closing and with closing tag)
    // Pattern: <mat-paginator ...> or <mat-paginator ... /> or <mat-paginator></mat-paginator>
    const paginatorRegex = /<mat-paginator(?![a-z-])([^>]*?)(?:\/>|>)/gi;

    let match;
    while ((match = paginatorRegex.exec(content)) !== null) {
      elementsFound++;
      const fullMatch = match[0];
      const attributes = match[1] || '';

      if (!hasAccessibleLabel(attributes)) {
        issues.push(format('MAT_PAGINATOR_MISSING_LABEL', { element: fullMatch }));
      }
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
