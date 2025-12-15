const { format } = require('../core/errors');

module.exports = {
  name: 'tabindex',
  description: 'Tabindex values do not exceed 0 (disrupts natural tab order)',
  tier: 'basic',
  type: 'html',
  weight: 7,
  wcag: '2.4.3',

  check(content) {
    // Early exit: no relevant elements, no issues
    if (!/tabindex/i.test(content)) {
      return { pass: true, issues: [], elementsFound: 0 };
    }

    const issues = [];
    let elementsFound = 0;
    const tabindexRegex = /tabindex=["'](\d+)["']/gi;
    let match;

    while ((match = tabindexRegex.exec(content)) !== null) {
      elementsFound++;
      const value = parseInt(match[1]);
      if (value > 0) {
        issues.push(format('TABINDEX_POSITIVE', {
          value: value,
          element: `tabindex="${value}"`
        }));
      }
    }

    return { pass: issues.length === 0, issues, elementsFound };
  }
};
