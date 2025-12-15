const { format } = require('../core/errors');

// Pre-compiled regex patterns
const EARLY_EXIT = /<img\b/i;
const IMG_REGEX = /<img[^>]*>/gi;
const HAS_ALT = /\balt=|\[alt\]=|\[attr\.alt\]/i;

module.exports = {
  name: 'imageAlt',
  description: 'Images have alt attributes',
  tier: 'basic',
  type: 'html',
  weight: 10,
  wcag: '1.1.1',

  check(content) {
    // Early exit: no img elements, no issues
    if (!EARLY_EXIT.test(content)) {
      return { pass: true, issues: [], elementsFound: 0 };
    }

    const issues = [];
    let elementsFound = 0;

    // Reset regex state
    IMG_REGEX.lastIndex = 0;

    let match;
    while ((match = IMG_REGEX.exec(content)) !== null) {
      elementsFound++;
      const img = match[0];

      if (!HAS_ALT.test(img)) {
        issues.push(format('IMG_MISSING_ALT', { element: img }));
      }
    }

    return { pass: issues.length === 0, issues, elementsFound };
  }
};
