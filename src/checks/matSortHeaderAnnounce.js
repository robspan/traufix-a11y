const { format } = require('../core/errors');

module.exports = {
  name: 'matSortHeaderAnnounce',
  description: 'Check that mat-sort-header has sortActionDescription for screen reader announcements',
  tier: 'full',
  type: 'html',
  weight: 3,

  check(content) {
    // Early exit: no mat-sort-header elements, no issues
    if (!/mat-sort-header/i.test(content)) {
      return { pass: true, issues: [], elementsFound: 0 };
    }

    const issues = [];
    let elementsFound = 0;

    // Match elements with mat-sort-header attribute
    // Pattern matches: <th mat-sort-header ...> or <element mat-sort-header="columnName" ...>
    // Captures the entire opening tag to check for sortActionDescription
    const matSortHeaderRegex = /<(\w+)[^>]*\bmat-sort-header\b[^>]*>/gi;

    let match;
    while ((match = matSortHeaderRegex.exec(content)) !== null) {
      elementsFound++;
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
        issues.push(format('MAT_SORT_MISSING_LABEL', { element: snippet }));
      }
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
