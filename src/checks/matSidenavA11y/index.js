module.exports = {
  name: 'matSidenavA11y',
  description: 'Check that mat-sidenav has proper labeling for screen readers',
  tier: 'full',
  type: 'html',
  weight: 3,

  check(content) {
    const issues = [];

    // Match mat-sidenav elements (not mat-sidenav-container or mat-sidenav-content)
    // Capture the full element including content for context analysis
    const sidenavRegex = /<mat-sidenav(?![a-z-])([^>]*)>([\s\S]*?)<\/mat-sidenav>|<mat-sidenav(?![a-z-])([^>]*)\/>/gi;

    let match;
    let sidenavIndex = 0;

    while ((match = sidenavRegex.exec(content)) !== null) {
      sidenavIndex++;
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
        issues.push(
          `[Error] mat-sidenav #${sidenavIndex} lacks proper accessibility labeling for screen readers.\n` +
          `  Why it matters: Screen reader users need to understand the purpose of the sidenav.\n` +
          `  Without proper labeling, it may be announced as a generic region.\n` +
          `  How to fix (choose one):\n` +
          `    - Add role="navigation": <mat-sidenav role="navigation">\n` +
          `    - Add aria-label: <mat-sidenav aria-label="Main navigation">\n` +
          `    - Add aria-labelledby: <mat-sidenav aria-labelledby="nav-heading-id">\n` +
          `    - Wrap in <nav>: <nav><mat-sidenav>...</mat-sidenav></nav>\n` +
          `  WCAG 4.1.2: Name, Role, Value / WCAG 2.4.1: Bypass Blocks | See: https://material.angular.io/components/sidenav/overview#accessibility`
        );
      }
    }

    return {
      pass: issues.length === 0,
      issues
    };
  }
};
