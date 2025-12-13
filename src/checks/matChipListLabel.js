const { format } = require('../core/errors');

module.exports = {
  name: 'matChipListLabel',
  description: 'Check that mat-chip-list/mat-chip-listbox/mat-chip-set has aria-label or aria-labelledby',
  tier: 'full',
  type: 'html',
  weight: 7,

  check(content) {
    const issues = [];
    let elementsFound = 0;

    /**
     * Helper to check if an element has a valid accessible label
     * Handles both static attributes and Angular property bindings
     */
    function hasAccessibleLabel(attributes) {
      // Static aria-label with non-empty value
      const hasStaticAriaLabel = /aria-label\s*=\s*["'][^"']+["']/i.test(attributes);
      // Angular bound aria-label: [aria-label]="..." or [attr.aria-label]="..."
      const hasBoundAriaLabel = /\[aria-label\]\s*=\s*["'][^"']+["']/i.test(attributes) ||
                                /\[attr\.aria-label\]\s*=\s*["'][^"']+["']/i.test(attributes);
      // Static aria-labelledby
      const hasStaticAriaLabelledby = /aria-labelledby\s*=\s*["'][^"']+["']/i.test(attributes);
      // Angular bound aria-labelledby
      const hasBoundAriaLabelledby = /\[aria-labelledby\]\s*=\s*["'][^"']+["']/i.test(attributes) ||
                                     /\[attr\.aria-labelledby\]\s*=\s*["'][^"']+["']/i.test(attributes);

      return hasStaticAriaLabel || hasBoundAriaLabel || hasStaticAriaLabelledby || hasBoundAriaLabelledby;
    }

    // Chip components to check (covers both legacy and MDC-based APIs)
    const chipComponents = [
      { name: 'mat-chip-list', regex: /<mat-chip-list([^>]*)>/gi },
      { name: 'mat-chip-listbox', regex: /<mat-chip-listbox([^>]*)>/gi },
      { name: 'mat-chip-set', regex: /<mat-chip-set([^>]*)>/gi },
      { name: 'mat-chip-grid', regex: /<mat-chip-grid([^>]*)>/gi }
    ];

    for (const { name, regex } of chipComponents) {
      let match;
      while ((match = regex.exec(content)) !== null) {
        elementsFound++;
        const fullMatch = match[0];
        const attributes = match[1] || '';

        if (!hasAccessibleLabel(attributes)) {
          issues.push(format('MAT_CHIP_LIST_MISSING_LABEL', { element: fullMatch }));
        }
      }
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
