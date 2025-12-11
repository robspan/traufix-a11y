module.exports = {
  name: 'matButtonToggleLabel',
  description: 'Check that mat-button-toggle-group has aria-label for group context',
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
        `[Error] <mat-button-toggle-group> missing accessible label. Screen readers need a label to describe the purpose of this button toggle group.\n` +
        `  How to fix:\n` +
        `    - Add aria-label: <mat-button-toggle-group aria-label="Text alignment">\n` +
        `    - Or use aria-labelledby: <mat-button-toggle-group aria-labelledby="label-id">\n` +
        `    - Angular binding also works: [aria-label]="labelVariable"\n` +
        `  Note: Labels on individual mat-button-toggle elements do not label the group itself.\n` +
        `  WCAG 4.1.2: Name, Role, Value | See: https://material.angular.io/components/button-toggle/overview#accessibility\n` +
        `  Found: ${snippet}`
      );
    }

    // Match <mat-button-toggle-group> elements
    const matButtonToggleGroupRegex = /<mat-button-toggle-group([^>]*)>/gi;

    let match;
    while ((match = matButtonToggleGroupRegex.exec(content)) !== null) {
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
