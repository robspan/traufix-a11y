const { format } = require('../../core/errors');

module.exports = {
  name: 'metaRefresh',
  description: 'Meta refresh can disorient users and should be avoided (WCAG 2.2.1, 3.2.5)',
  tier: 'full',
  type: 'html',
  weight: 7,

  check(content) {
    const issues = [];
    let elementsFound = 0;

    // Pattern to match <meta http-equiv="refresh" ...>
    // Handles various quote styles and attribute ordering
    const metaRefreshPattern = /<meta\s+[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi;

    const matches = content.match(metaRefreshPattern);

    if (matches) {
      matches.forEach((match) => {
        elementsFound++;
        issues.push(format('META_REFRESH', { element: match }));
      });
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
