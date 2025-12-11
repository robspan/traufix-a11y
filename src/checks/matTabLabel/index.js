module.exports = {
  name: 'matTabLabel',
  description: 'Check that mat-tab has a label (via label attribute, aria-label, or text content)',
  tier: 'full',
  type: 'html',
  weight: 3,

  check(content) {
    const issues = [];

    // Match mat-tab elements (use negative lookahead to not match mat-tab-group, mat-tab-label, mat-tab-nav-bar, etc.)
    const tabRegex = /<mat-tab(?![a-z-])([^>]*)>([\s\S]*?)<\/mat-tab>|<mat-tab(?![a-z-])([^>]*)\/>/gi;

    let match;
    let tabIndex = 0;
    while ((match = tabRegex.exec(content)) !== null) {
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
        issues.push(
          `[Error] mat-tab #${tabIndex} is missing a label. Screen readers cannot announce the purpose of unlabeled tabs, making navigation impossible for users who rely on assistive technology.\n` +
          `  How to fix:\n` +
          `    - Add label="Tab Name" attribute for static labels\n` +
          `    - Add [label]="tabLabel" for dynamic labels\n` +
          `    - Add <ng-template mat-tab-label>Tab Name</ng-template> for rich content (icons, badges)\n` +
          `  WCAG 4.1.2: Name, Role, Value\n` +
          `  Example: <mat-tab label="Overview">...</mat-tab>`
        );
      }
    }

    return {
      pass: issues.length === 0,
      issues
    };
  }
};
