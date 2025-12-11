module.exports = {
  name: 'matChipListLabel',
  description: 'Check that mat-chip-list/mat-chip-listbox/mat-chip-set has aria-label or aria-labelledby',
  tier: 'full',
  type: 'html',
  weight: 7,

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
        `[Error] <${componentName}> missing accessible label. Screen readers need a label to describe the purpose of this chip collection.\n` +
        `  How to fix:\n` +
        `    - Add aria-label: <${componentName} aria-label="Select your tags">\n` +
        `    - Or use aria-labelledby: <${componentName} aria-labelledby="label-id">\n` +
        `    - Angular binding also works: [aria-label]="labelVariable"\n` +
        `  WCAG 4.1.2: Name, Role, Value | See: https://material.angular.io/components/chips/overview#accessibility\n` +
        `  Found: ${snippet}`
      );
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
