const { format } = require('../../core/errors');

module.exports = {
  name: 'ariaHiddenBody',
  description: 'Body element does not have aria-hidden="true"',
  tier: 'basic',
  type: 'html',
  weight: 10,
  wcag: '4.1.2',

  check(content) {
    const issues = [];
    let elementsFound = 0;

    if (/<body[^>]*aria-hidden=["']true["']/i.test(content)) {
      elementsFound++;
      issues.push(format('ARIA_HIDDEN_BODY', { element: '<body aria-hidden="true">' }));
    }

    return { pass: issues.length === 0, issues, elementsFound };
  }
};
