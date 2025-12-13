const { format } = require('../core/errors');

module.exports = {
  name: 'imageAlt',
  description: 'Images have alt attributes',
  tier: 'basic',
  type: 'html',
  weight: 10,
  wcag: '1.1.1',

  check(content) {
    const issues = [];
    let elementsFound = 0;
    const imgRegex = /<img[^>]*>/gi;
    let match;

    while ((match = imgRegex.exec(content)) !== null) {
      elementsFound++;
      const img = match[0];
      const hasAlt = /\balt=/i.test(img) || /\[alt\]=/i.test(img) || /\[attr\.alt\]=/i.test(img);

      if (!hasAlt) {
        issues.push(format('IMG_MISSING_ALT', { element: img }));
      }
    }

    return { pass: issues.length === 0, issues, elementsFound };
  }
};
