const { format } = require('../core/errors');

module.exports = {
  name: 'matTreeA11y',
  description: 'Check that mat-tree has proper ARIA attributes for accessibility',
  tier: 'full',
  type: 'html',
  weight: 3,

  check(content) {
    const issues = [];
    let elementsFound = 0;

    // Match mat-tree elements (both self-closing and with content)
    // Capture the full element for context analysis
    const matTreeRegex = /<mat-tree(?![a-z-])([^>]*)(?:\/>|>([\s\S]*?)<\/mat-tree>)/gi;

    let match;
    let treeIndex = 0;

    while ((match = matTreeRegex.exec(content)) !== null) {
      elementsFound++;
      treeIndex++;
      const fullMatch = match[0];
      const attributes = match[1] || '';

      // Check for aria-label (static or bound)
      // Handle static: aria-label="value"
      // Handle Angular binding: [aria-label]="variable" or [aria-label]="'literal'"
      // Handle attr binding: [attr.aria-label]="variable" or [attr.aria-label]="'literal'"
      const hasAriaLabel = /aria-label\s*=\s*["'][^"']+["']/i.test(attributes) ||
                           /\[aria-label\]\s*=\s*["'][^"']+["']/i.test(attributes) ||
                           /\[attr\.aria-label\]\s*=\s*["'].+["']/i.test(attributes);

      // Check for aria-labelledby (static or bound)
      const hasAriaLabelledby = /aria-labelledby\s*=\s*["'][^"']+["']/i.test(attributes) ||
                                /\[aria-labelledby\]\s*=\s*["'][^"']+["']/i.test(attributes) ||
                                /\[attr\.aria-labelledby\]\s*=\s*["'].+["']/i.test(attributes);

      // Check if mat-tree has any accessibility attribute
      const hasAccessibility = hasAriaLabel || hasAriaLabelledby;

      if (!hasAccessibility) {
        const snippet = fullMatch.length > 100 ? fullMatch.substring(0, 100) + '...' : fullMatch;
        issues.push(format('MAT_TREE_MISSING_LABEL', { element: snippet }));
      }
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
