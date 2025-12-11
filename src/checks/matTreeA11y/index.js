module.exports = {
  name: 'matTreeA11y',
  description: 'Check that mat-tree has proper ARIA attributes for accessibility',
  tier: 'full',
  type: 'html',
  weight: 3,

  check(content) {
    const issues = [];

    // Match mat-tree elements (both self-closing and with content)
    // Capture the full element for context analysis
    const matTreeRegex = /<mat-tree(?![a-z-])([^>]*)(?:\/>|>([\s\S]*?)<\/mat-tree>)/gi;

    let match;
    let treeIndex = 0;

    while ((match = matTreeRegex.exec(content)) !== null) {
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
        issues.push(
          `[Error] mat-tree #${treeIndex} lacks proper accessibility labeling. Screen reader users need to understand the purpose of the tree structure, and without proper labeling it may be announced as a generic tree with no context.\n` +
          `  How to fix:\n` +
          `    - Add aria-label: <mat-tree aria-label="File browser">\n` +
          `    - Add aria-labelledby: <mat-tree aria-labelledby="tree-heading-id">\n` +
          `    - With Angular binding: <mat-tree [aria-label]="treeLabel">\n` +
          `  WCAG 4.1.2: Name, Role, Value\n` +
          `  Documentation: https://material.angular.io/components/tree/overview#accessibility\n` +
          `  Found: ${snippet}`
        );
      }
    }

    return {
      pass: issues.length === 0,
      issues
    };
  }
};
