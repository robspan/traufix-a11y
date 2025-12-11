module.exports = {
  name: 'tabindex',
  description: 'Tabindex values do not exceed 0 (disrupts natural tab order)',
  tier: 'basic',
  type: 'html',
  weight: 7,
  wcag: '2.4.3',

  check(content) {
    const issues = [];
    const tabindexRegex = /tabindex=["'](\d+)["']/gi;
    let match;

    while ((match = tabindexRegex.exec(content)) !== null) {
      const value = parseInt(match[1]);
      if (value > 0) {
        issues.push(
          `[Error] Positive tabindex value found. Positive tabindex disrupts natural tab order and confuses users\n` +
          `  How to fix:\n` +
          `    - Use tabindex="0" for focusable\n` +
          `    - Use tabindex="-1" for programmatic focus only\n` +
          `  WCAG 2.4.3: Focus Order | See: https://www.w3.org/WAI/WCAG21/Understanding/focus-order\n` +
          `  Found: tabindex="${value}"`
        );
      }
    }

    return { pass: issues.length === 0, issues };
  }
};
