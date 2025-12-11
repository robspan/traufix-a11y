module.exports = {
  name: 'matPaginatorLabel',
  description: 'Check that mat-paginator has aria-label for screen reader context',
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

    /**
     * Helper to generate actionable error message
     */
    function createIssue(snippet) {
      return (
        `[Error] <mat-paginator> missing accessible label. ` +
        `Screen readers need a label to describe what data is being paginated.\n` +
        `  How to fix:\n` +
        `    - Add aria-label: <mat-paginator aria-label="Table pagination">\n` +
        `    - Or use aria-labelledby: <mat-paginator aria-labelledby="pagination-label">\n` +
        `    - Angular binding also works: [aria-label]="paginatorLabel"\n` +
        `  WCAG 4.1.2: Name, Role, Value | See: https://material.angular.io/components/paginator/overview#accessibility\n` +
        `  Found: ${snippet}`
      );
    }

    // Match mat-paginator elements (both self-closing and with closing tag)
    // Pattern: <mat-paginator ...> or <mat-paginator ... /> or <mat-paginator></mat-paginator>
    const paginatorRegex = /<mat-paginator(?![a-z-])([^>]*?)(?:\/>|>)/gi;

    let match;
    while ((match = paginatorRegex.exec(content)) !== null) {
      const fullMatch = match[0];
      const attributes = match[1] || '';

      if (!hasAccessibleLabel(attributes)) {
        const snippet = fullMatch.length > 100 ? fullMatch.substring(0, 100) + '...' : fullMatch;
        issues.push(createIssue(snippet));
      }
    }

    return {
      pass: issues.length === 0,
      issues
    };
  }
};
