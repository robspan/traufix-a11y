const { format } = require('../core/errors');

module.exports = {
  name: 'matProgressSpinnerLabel',
  description: 'Check that mat-progress-spinner/mat-spinner has aria-label describing its purpose',
  tier: 'full',
  type: 'html',
  weight: 3,

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

    // Spinner components to check
    // mat-spinner is shorthand for mat-progress-spinner with mode="indeterminate"
    const spinnerComponents = [
      { name: 'mat-progress-spinner', regex: /<mat-progress-spinner(?![a-z-])([^>]*)(?:\/>|>)/gi },
      { name: 'mat-spinner', regex: /<mat-spinner(?![a-z-])([^>]*)(?:\/>|>)/gi }
    ];

    for (const { name, regex } of spinnerComponents) {
      let match;
      while ((match = regex.exec(content)) !== null) {
        elementsFound++;
        const fullMatch = match[0];
        const attributes = match[1] || '';

        if (!hasAccessibleLabel(attributes)) {
          issues.push(format('MAT_PROGRESS_MISSING_LABEL', { element: fullMatch }));
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
