const { format } = require('../core/errors');

module.exports = {
  name: 'blinkElement',
  description: 'The deprecated <blink> element can trigger seizures and should not be used',
  tier: 'material',
  type: 'html',
  weight: 7,

  check(content) {
    // Early exit: no relevant elements, no issues
    if (!/<blink/i.test(content)) {
      return { pass: true, issues: [], elementsFound: 0 };
    }

    const issues = [];
    let elementsFound = 0;
    const lines = content.split('\n');

    // Match blink elements (opening tag, including self-closing)
    const blinkRegex = /<blink\b[^>]*\/?>/gi;

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const matches = line.match(blinkRegex);

      if (matches) {
        matches.forEach(match => {
          elementsFound++;
          issues.push(format('MOTION_BLINK', { element: match, line: lineNumber }));
        });
      }
    });

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
