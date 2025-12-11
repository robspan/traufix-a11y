module.exports = {
  name: 'matTableHeaders',
  description: 'Check that mat-table has mat-header-row for screen reader accessibility',
  tier: 'enhanced',
  type: 'html',
  weight: 7,
  wcag: '1.3.1',

  check(content) {
    const issues = [];

    // Pattern to match mat-table elements
    const matTableElementRegex = /<mat-table([^>]*)>([\s\S]*?)<\/mat-table>/gi;

    // Pattern to match elements with mat-table attribute/directive
    const matTableAttrRegex = /<table[^>]*\bmat-table\b[^>]*>([\s\S]*?)<\/table>/gi;

    let match;

    // Check <mat-table> elements
    while ((match = matTableElementRegex.exec(content)) !== null) {
      const fullMatch = match[0];
      const tableContent = match[2] || '';

      // Check for mat-header-row in content
      // Can be <mat-header-row> element or [mat-header-row] attribute
      const hasHeaderRow = /<mat-header-row/i.test(tableContent) || /\bmat-header-row\b/i.test(tableContent);

      if (!hasHeaderRow) {
        const snippet = fullMatch.length > 100 ? fullMatch.substring(0, 100) + '...' : fullMatch;
        issues.push(
          `[Error] mat-table missing header row. Screen readers need headers to describe column data\n` +
          `  How to fix:\n` +
          `    - Add mat-header-row with mat-header-cell elements\n` +
          `  WCAG 1.3.1: Info and Relationships | See: https://material.angular.io/components/table/overview#accessibility\n` +
          `  Found: ${snippet}`
        );
      }
    }

    // Check <table mat-table> elements
    while ((match = matTableAttrRegex.exec(content)) !== null) {
      const fullMatch = match[0];
      const tableContent = match[1] || '';

      // Check for mat-header-row or tr with mat-header-row attribute
      const hasHeaderRow = /<mat-header-row/i.test(tableContent) ||
                           /\bmat-header-row\b/i.test(tableContent) ||
                           /<tr[^>]*mat-header-row/i.test(tableContent);

      if (!hasHeaderRow) {
        const snippet = fullMatch.length > 100 ? fullMatch.substring(0, 100) + '...' : fullMatch;
        issues.push(
          `[Error] mat-table missing header row. Screen readers need headers to describe column data\n` +
          `  How to fix:\n` +
          `    - Add mat-header-row with mat-header-cell elements\n` +
          `  WCAG 1.3.1: Info and Relationships | See: https://material.angular.io/components/table/overview#accessibility\n` +
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
