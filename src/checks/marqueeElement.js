const { format } = require('../core/errors');

module.exports = {
  name: 'marqueeElement',
  description: 'The deprecated <marquee> element is inaccessible and should not be used',
  tier: 'material',
  type: 'html',
  weight: 7,

  check(content) {
    // Early exit: no relevant elements, no issues
    if (!/<marquee/i.test(content)) {
      return { pass: true, issues: [], elementsFound: 0 };
    }

    const issues = [];
    let elementsFound = 0;

    // Match marquee elements (opening tag)
    const marqueeRegex = /<marquee\b[^>]*>/gi;
    const marqueeMatches = content.match(marqueeRegex);

    if (marqueeMatches && marqueeMatches.length > 0) {
      for (const match of marqueeMatches) {
        elementsFound++;
        issues.push(format('MOTION_MARQUEE', { element: match }));
      }
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
