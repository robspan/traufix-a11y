const { format } = require('../core/errors');

module.exports = {
  name: 'tableHeaders',
  description: 'Data tables have header cells (th elements)',
  tier: 'basic',
  type: 'html',
  weight: 7,
  wcag: '1.3.1',

  check(content) {
    const issues = [];
    let elementsFound = 0;

    // Match each table element individually (non-greedy to handle nested tables)
    const tableRegex = /<table[^>]*>[\s\S]*?<\/table>/gi;
    let match;

    while ((match = tableRegex.exec(content)) !== null) {
      elementsFound++;
      const tableHtml = match[0];
      const tableOpenTag = tableHtml.match(/<table[^>]*>/i)[0];

      // Skip layout tables with role="presentation" or role="none" on the table element itself
      if (/role=["'](presentation|none)["']/i.test(tableOpenTag)) {
        continue;
      }

      // Skip tables with aria-hidden="true" on the table element
      if (/aria-hidden=["']true["']/i.test(tableOpenTag)) {
        continue;
      }

      // Count td elements in the table
      const tdMatches = tableHtml.match(/<td[^>]*>/gi);
      const tdCount = tdMatches ? tdMatches.length : 0;

      // Skip empty tables (no td content)
      if (tdCount === 0) {
        continue;
      }

      // Skip single-cell tables (only one td)
      if (tdCount === 1) {
        continue;
      }

      // Check if this table has th headers
      const hasTh = /<th[^>]*>/i.test(tableHtml);

      // Check if this is an Angular Material table
      const hasMatTable = /mat-table|matColumnDef/i.test(tableHtml);

      if (!hasTh && !hasMatTable) {
        issues.push(format('TABLE_MISSING_HEADERS', {
          element: '<table>'
        }));
      }
    }

    return { pass: issues.length === 0, issues, elementsFound };
  }
};
