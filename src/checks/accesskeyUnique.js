const { format } = require('../core/errors');

module.exports = {
  name: 'accesskeyUnique',
  description: 'Accesskey values are unique',
  tier: 'basic',
  type: 'html',
  weight: 7,
  wcag: '4.1.1',

  check(content) {
    // Early exit: no relevant elements, no issues
    if (!/accesskey/i.test(content)) {
      return { pass: true, issues: [], elementsFound: 0 };
    }

    const issues = [];
    let elementsFound = 0;
    const accesskeyRegex = /accesskey=["']([^"']+)["']/gi;
    const keys = [];
    let match;

    while ((match = accesskeyRegex.exec(content)) !== null) {
      elementsFound++;
      keys.push(match[1].toLowerCase());
    }

    const counts = {};
    for (const key of keys) {
      counts[key] = (counts[key] || 0) + 1;
    }

    for (const [key, count] of Object.entries(counts)) {
      if (count > 1) {
        issues.push(format('ACCESSKEY_DUPLICATE', { key, element: `accesskey="${key}" (${count} occurrences)` }));
      }
    }

    return { pass: issues.length === 0, issues, elementsFound };
  }
};
