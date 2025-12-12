const { format } = require('../../core/errors');

module.exports = {
  name: 'matSidenavA11y',
  description: 'Check that mat-sidenav has proper labeling for screen readers',
  tier: 'full',
  type: 'html',
  weight: 3,

  check(content) {
    const issues = [];
    let elementsFound = 0;

    // Match mat-sidenav elements (not mat-sidenav-container or mat-sidenav-content)
    // Capture the full element including content for context analysis
    const sidenavRegex = /<mat-sidenav(?![a-z-])([^>]*)>([\s\S]*?)<\/mat-sidenav>|<mat-sidenav(?![a-z-])([^>]*)\/>/gi;

    let match;
    let sidenavIndex = 0;

    while ((match = sidenavRegex.exec(content)) !== null) {
      sidenavIndex++;
      elementsFound++;
      const fullMatch = match[0];
      const attributes = match[1] || match[3] || '';

      // Check for role="navigation" (static or bound)
      const hasRoleNavigation = /role\s*=\s*["']navigation["']/i.test(attributes) ||
                                /\[role\]\s*=\s*["']['"]?navigation['"]?["']/i.test(attributes);

      // Check for aria-label (static or bound)
      // Handles string literals like [attr.aria-label]="'text'" with .+ instead of [^"']+
      const hasAriaLabel = /(?<!\[)aria-label\s*=\s*["'][^"']+["']/i.test(attributes) ||
                           /\[aria-label\]\s*=\s*["'].+["']/i.test(attributes) ||
                           /\[attr\.aria-label\]\s*=\s*["'].+["']/i.test(attributes);

      // Check for aria-labelledby (static or bound)
      const hasAriaLabelledby = /(?<!\[)aria-labelledby\s*=\s*["'][^"']+["']/i.test(attributes) ||
                                /\[aria-labelledby\]\s*=\s*["'].+["']/i.test(attributes) ||
                                /\[attr\.aria-labelledby\]\s*=\s*["'].+["']/i.test(attributes);

      // Check if mat-sidenav is wrapped in a <nav> element
      // Look for <nav> before the mat-sidenav in the content
      const sidenavPosition = match.index;
      const contentBeforeSidenav = content.substring(0, sidenavPosition);

      // Find the most recent opening nav tag that hasn't been closed
      const navOpenings = (contentBeforeSidenav.match(/<nav[^>]*>/gi) || []).length;
      const navClosings = (contentBeforeSidenav.match(/<\/nav>/gi) || []).length;
      const isInsideNav = navOpenings > navClosings;

      // Check if sidenav has any accessibility attribute
      const hasAccessibility = hasRoleNavigation || hasAriaLabel || hasAriaLabelledby || isInsideNav;

      if (!hasAccessibility) {
        const snippet = fullMatch.length > 80 ? fullMatch.substring(0, 80) + '...' : fullMatch;
        issues.push(format('MAT_SIDENAV_MISSING_LABEL', { element: snippet }));
      }
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
