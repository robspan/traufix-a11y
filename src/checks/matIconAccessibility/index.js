module.exports = {
  name: 'matIconAccessibility',
  description: 'Check that mat-icon has proper accessibility attributes (aria-hidden, aria-label, or aria-labelledby)',
  tier: 'enhanced',
  type: 'html',
  weight: 7,
  wcag: '1.1.1',

  check(content) {
    const issues = [];

    // Pattern to match <mat-icon> elements (both self-closing and with content)
    // Captures the full tag including attributes
    const matIconElementRegex = /<mat-icon([^>]*)>([^<]*)<\/mat-icon>|<mat-icon([^>]*)\/>/gi;

    // Pattern to match elements with matIcon attribute selector
    const matIconAttrRegex = /<[a-z][a-z0-9-]*[^>]*\bmatIcon\b[^>]*>/gi;

    let match;

    // Check <mat-icon> elements
    while ((match = matIconElementRegex.exec(content)) !== null) {
      const fullMatch = match[0];
      const attributes = match[1] || match[3] || '';

      const hasAriaHidden = /aria-hidden\s*=\s*["']true["']/i.test(attributes);
      const hasAriaLabel = /aria-label\s*=\s*["'][^"']+["']/i.test(attributes);
      const hasAriaLabelledby = /aria-labelledby\s*=\s*["'][^"']+["']/i.test(attributes);

      if (!hasAriaHidden && !hasAriaLabel && !hasAriaLabelledby) {
        // Extract a snippet for context (truncate if too long)
        const snippet = fullMatch.length > 80 ? fullMatch.substring(0, 80) + '...' : fullMatch;
        issues.push(
          `[Error] mat-icon missing accessibility attributes. Icons are announced incorrectly without proper ARIA\n` +
          `  How to fix:\n` +
          `    - Add aria-hidden="true" for decorative icons\n` +
          `    - Add aria-label for meaningful icons\n` +
          `  WCAG 1.1.1: Non-text Content | See: https://material.angular.io/components/icon/overview#accessibility\n` +
          `  Found: ${snippet}`
        );
      }
    }

    // Check elements with matIcon attribute
    while ((match = matIconAttrRegex.exec(content)) !== null) {
      const fullMatch = match[0];

      const hasAriaHidden = /aria-hidden\s*=\s*["']true["']/i.test(fullMatch);
      const hasAriaLabel = /aria-label\s*=\s*["'][^"']+["']/i.test(fullMatch);
      const hasAriaLabelledby = /aria-labelledby\s*=\s*["'][^"']+["']/i.test(fullMatch);

      if (!hasAriaHidden && !hasAriaLabel && !hasAriaLabelledby) {
        const snippet = fullMatch.length > 80 ? fullMatch.substring(0, 80) + '...' : fullMatch;
        issues.push(
          `[Error] mat-icon missing accessibility attributes. Icons are announced incorrectly without proper ARIA\n` +
          `  How to fix:\n` +
          `    - Add aria-hidden="true" for decorative icons\n` +
          `    - Add aria-label for meaningful icons\n` +
          `  WCAG 1.1.1: Non-text Content | See: https://material.angular.io/components/icon/overview#accessibility\n` +
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
