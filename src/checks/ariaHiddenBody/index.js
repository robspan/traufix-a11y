module.exports = {
  name: 'ariaHiddenBody',
  description: 'Body element does not have aria-hidden="true"',
  tier: 'basic',
  type: 'html',
  weight: 10,
  wcag: '4.1.2',

  check(content) {
    const issues = [];

    if (/<body[^>]*aria-hidden=["']true["']/i.test(content)) {
      issues.push(
        `[Error] Body element has aria-hidden="true". This hides the entire page from assistive technology\n` +
        `  How to fix:\n` +
        `    - Remove aria-hidden from the body element\n` +
        `    - Use aria-hidden only on specific elements that should be hidden\n` +
        `  WCAG 4.1.2: Name, Role, Value | See: https://www.w3.org/TR/wai-aria/#aria-hidden\n` +
        `  Found: <body aria-hidden="true">`
      );
    }

    return { pass: issues.length === 0, issues };
  }
};
