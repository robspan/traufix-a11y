module.exports = {
  name: 'matListSelectionLabel',
  description: 'Check that mat-selection-list has proper labeling for accessibility',
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
    function createIssue(snippet) {
      return (
        `[Error] <mat-selection-list> missing accessible label. Screen readers need a label to describe the purpose of this selection list.\n` +
        `  How to fix:\n` +
        `    - Add aria-label: <mat-selection-list aria-label="Select options">\n` +
        `    - Or use aria-labelledby: <mat-selection-list aria-labelledby="label-id">\n` +
        `    - Angular binding also works: [aria-label]="labelVariable"\n` +
        `  WCAG 4.1.2: Name, Role, Value | See: https://material.angular.io/components/list/overview#accessibility\n` +
        `  Found: ${snippet}`
      );
    }

    // Match <mat-selection-list> elements and capture their attributes
    const regex = /<mat-selection-list([^>]*)>/gi;

    let match;
    while ((match = regex.exec(content)) !== null) {
      const fullMatch = match[0];
      const attributes = match[1] || '';

      if (!hasAccessibleLabel(attributes)) {
        const snippet = fullMatch.length > 80 ? fullMatch.substring(0, 80) + '...' : fullMatch;
        issues.push(createIssue(snippet));
      }
    }

    return {
      pass: issues.length === 0,
      issues
    };
  }
};
