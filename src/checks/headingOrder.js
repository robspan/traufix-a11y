const { format } = require('../core/errors');

module.exports = {
  name: 'headingOrder',
  description: 'Heading levels do not skip (no h1 to h3 without h2)',
  tier: 'basic',
  type: 'html',
  weight: 7,
  wcag: '1.3.1',

  check(content) {
    const issues = [];
    let elementsFound = 0;
    const headingRegex = /<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>/gi;
    const levels = [];
    let match;

    while ((match = headingRegex.exec(content)) !== null) {
      elementsFound++;
      const level = parseInt(match[1]);
      const headingContent = match[3];

      // Check if heading is empty
      const trimmedContent = headingContent.replace(/<[^>]*>/g, '').trim();
      if (trimmedContent.length === 0) {
        issues.push(format('HEADING_EMPTY', { level, element: `<h${level}>` }));
      }

      levels.push(level);
    }

    for (let i = 1; i < levels.length; i++) {
      const prev = levels[i - 1];
      const curr = levels[i];
      if (curr > prev + 1) {
        issues.push(format('HEADING_SKIP_LEVEL', {
          from: prev,
          to: curr,
          element: `<h${curr}>`
        }));
      }
    }

    return { pass: issues.length === 0, issues, elementsFound };
  }
};
