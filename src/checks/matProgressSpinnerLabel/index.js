module.exports = {
  name: 'matProgressSpinnerLabel',
  description: 'Check that mat-progress-spinner/mat-spinner has aria-label describing its purpose',
  tier: 'full',
  type: 'html',
  weight: 3,

  check(content) {
    const issues = [];

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

    /**
     * Helper to generate actionable error message
     */
    function createIssue(componentName, snippet) {
      return (
        `[Error] <${componentName}> missing accessible label. ` +
        `Screen readers need a label to describe what is loading or being processed.\n` +
        `  How to fix:\n` +
        `    - Add aria-label: <${componentName} aria-label="Loading user data">\n` +
        `    - Or use aria-labelledby: <${componentName} aria-labelledby="loading-text-id">\n` +
        `    - Angular binding also works: [aria-label]="loadingLabel"\n` +
        `  WCAG 4.1.2: Name, Role, Value | See: https://material.angular.io/components/progress-spinner/overview#accessibility\n` +
        `  Found: ${snippet}`
      );
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
        const fullMatch = match[0];
        const attributes = match[1] || '';

        if (!hasAccessibleLabel(attributes)) {
          const snippet = fullMatch.length > 80 ? fullMatch.substring(0, 80) + '...' : fullMatch;
          issues.push(createIssue(name, snippet));
        }
      }
    }

    return {
      pass: issues.length === 0,
      issues
    };
  }
};
