const { format } = require('../core/errors');

module.exports = {
  name: 'matIconAccessibility',
  description: 'Check that mat-icon has proper accessibility attributes (aria-hidden, aria-label, or aria-labelledby)',
  tier: 'material',
  type: 'html',
  weight: 7,
  wcag: '1.1.1',

  check(content) {
    const issues = [];
    let elementsFound = 0;

    // Pattern to match <mat-icon> elements (both self-closing and with content)
    // Captures the full tag including attributes
    const matIconElementRegex = /<mat-icon([^>]*)>([^<]*)<\/mat-icon>|<mat-icon([^>]*)\/>/gi;

    // Pattern to match elements with matIcon attribute selector
    const matIconAttrRegex = /<[a-z][a-z0-9-]*[^>]*\bmatIcon\b[^>]*>/gi;

    let match;

    // Check <mat-icon> elements
    while ((match = matIconElementRegex.exec(content)) !== null) {
      elementsFound++;
      const fullMatch = match[0];
      const attributes = match[1] || match[3] || '';

      const hasAriaHidden = /aria-hidden\s*=\s*["']true["']/i.test(attributes);
      const hasAriaLabel = /aria-label\s*=\s*["'][^"']+["']/i.test(attributes);
      const hasAriaLabelledby = /aria-labelledby\s*=\s*["'][^"']+["']/i.test(attributes);

      if (!hasAriaHidden && !hasAriaLabel && !hasAriaLabelledby) {
        issues.push(format('MAT_ICON_MISSING_LABEL', { element: fullMatch }));
      }
    }

    // Check elements with matIcon attribute
    while ((match = matIconAttrRegex.exec(content)) !== null) {
      elementsFound++;
      const fullMatch = match[0];

      const hasAriaHidden = /aria-hidden\s*=\s*["']true["']/i.test(fullMatch);
      const hasAriaLabel = /aria-label\s*=\s*["'][^"']+["']/i.test(fullMatch);
      const hasAriaLabelledby = /aria-labelledby\s*=\s*["'][^"']+["']/i.test(fullMatch);

      if (!hasAriaHidden && !hasAriaLabel && !hasAriaLabelledby) {
        issues.push(format('MAT_ICON_MISSING_LABEL', { element: fullMatch }));
      }
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
