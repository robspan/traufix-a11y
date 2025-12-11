module.exports = {
  name: 'headingOrder',
  description: 'Heading levels do not skip (no h1 to h3 without h2)',
  tier: 'basic',
  type: 'html',
  weight: 7,
  wcag: '1.3.1',

  check(content) {
    const issues = [];
    const headingRegex = /<h([1-6])[^>]*>/gi;
    const levels = [];
    let match;

    while ((match = headingRegex.exec(content)) !== null) {
      levels.push(parseInt(match[1]));
    }

    for (let i = 1; i < levels.length; i++) {
      const prev = levels[i - 1];
      const curr = levels[i];
      if (curr > prev + 1) {
        const message = `[Error] Heading level skipped (h${prev} to h${curr}). Screen reader users rely on heading hierarchy for navigation
  How to fix:
    - Use sequential heading levels (h1→h2→h3)
    - Don't skip levels in the heading structure
  WCAG 1.3.1: Info and Relationships | See: https://www.w3.org/WAI/tutorials/page-structure/headings/
  Found: <h${curr}>`;
        issues.push(message);
      }
    }

    return { pass: issues.length === 0, issues };
  }
};
