module.exports = {
  name: 'matSortHeaderAnnounce',
  description: 'Check that mat-sort-header has sortActionDescription for screen reader announcements',
  tier: 'full',
  type: 'html',
  weight: 3,

  check(content) {
    const issues = [];

    // Match elements with mat-sort-header attribute
    // Pattern matches: <th mat-sort-header ...> or <element mat-sort-header="columnName" ...>
    // Captures the entire opening tag to check for sortActionDescription
    const matSortHeaderRegex = /<(\w+)[^>]*\bmat-sort-header\b[^>]*>/gi;

    let match;
    while ((match = matSortHeaderRegex.exec(content)) !== null) {
      const fullMatch = match[0];
      const tagName = match[1];

      // Check for sortActionDescription (static attribute)
      const hasSortActionDescription = /\bsortActionDescription\s*=\s*["'][^"']+["']/i.test(fullMatch);

      // Check for [sortActionDescription] (Angular property binding)
      // The binding value can contain single quotes inside double quotes, e.g., [sortActionDescription]="'text'"
      // or a variable reference like [sortActionDescription]="myVar"
      const hasSortActionDescriptionBinding = /\[sortActionDescription\]\s*=\s*"[^"]+"/i.test(fullMatch) ||
                                               /\[sortActionDescription\]\s*=\s*'[^']+'/i.test(fullMatch);

      if (!hasSortActionDescription && !hasSortActionDescriptionBinding) {
        const snippet = fullMatch.length > 100 ? fullMatch.substring(0, 100) + '...' : fullMatch;
        issues.push(
          `[Warning] <${tagName} mat-sort-header> is missing sortActionDescription. Screen readers may announce unclear or generic sort actions without descriptive text.\n` +
          `  How to fix:\n` +
          `    - Add sortActionDescription="Sort by column name" for static descriptions\n` +
          `    - Or use [sortActionDescription]="expression" for dynamic descriptions\n` +
          `    - Provide context-specific text like "Sort by product name" instead of generic "Sort"\n` +
          `  WCAG 4.1.2: Name, Role, Value | See: https://material.angular.io/components/sort/overview#accessibility\n` +
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
