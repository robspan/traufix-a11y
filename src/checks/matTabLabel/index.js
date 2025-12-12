const { format } = require('../../core/errors');

module.exports = {
  name: 'matTabLabel',
  description: 'Check that mat-tab has a label (via label attribute, aria-label, or text content)',
  tier: 'full',
  type: 'html',
  weight: 3,

  check(content) {
    const issues = [];
    let elementsFound = 0;

    // Match mat-tab elements (use negative lookahead to not match mat-tab-group, mat-tab-label, mat-tab-nav-bar, etc.)
    const tabRegex = /<mat-tab(?![a-z-])([^>]*)>([\s\S]*?)<\/mat-tab>|<mat-tab(?![a-z-])([^>]*)\/>/gi;

    let match;
    let tabIndex = 0;
    while ((match = tabRegex.exec(content)) !== null) {
      elementsFound++;
      tabIndex++;
      const attributes = match[1] || match[3] || '';
      const tabContent = match[2] || '';

      // Check for label attribute (static)
      const hasLabel = /(?:^|\s)label\s*=\s*["'][^"']+["']/i.test(attributes);

      // Check for [label] binding (Angular property binding)
      const hasLabelBinding = /(?:^|\s)\[label\]\s*=\s*["'][^"']*["']/i.test(attributes);

      // Check for aria-label (static or binding)
      const hasAriaLabel = /(?:^|\s)\[?aria-label\]?\s*=\s*["'][^"']+["']/i.test(attributes);

      // Check for aria-labelledby (static or binding)
      const hasAriaLabelledby = /(?:^|\s)\[?aria-labelledby\]?\s*=\s*["'][^"']+["']/i.test(attributes);

      // Check for ng-template with mat-tab-label directive
      // Handles both <ng-template mat-tab-label> and <ng-template #ref mat-tab-label>
      const hasMatTabLabel = /<ng-template[^>]*\bmat-tab-label\b[^>]*>[\s\S]*?<\/ng-template>/i.test(tabContent);

      if (!hasLabel && !hasLabelBinding && !hasAriaLabel && !hasAriaLabelledby && !hasMatTabLabel) {
        issues.push(format('MAT_TAB_MISSING_LABEL', { element: `mat-tab #${tabIndex}` }));
      }
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
