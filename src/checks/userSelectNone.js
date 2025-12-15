const { format } = require('../core/errors');

module.exports = {
  name: 'userSelectNone',
  description: 'Warns when user-select: none is applied to body or large container elements, preventing text selection',
  tier: 'full',
  type: 'scss',
  weight: 3,

  check(content) {
    // Early exit: no relevant elements, no issues
    if (!/user-select/i.test(content)) {
      return { pass: true, issues: [], elementsFound: 0 };
    }

    const issues = [];
    let elementsFound = 0;

    // Acceptable selectors for user-select: none (interactive elements where it makes sense)
    const acceptableSelectors = [
      /\.drag/i,
      /\.slider/i,
      /\.handle/i,
      /\.grab/i,
      /\.icon-btn/i,
      /\.icon-button/i,
      /\.btn-icon/i,
      /button.*icon/i,
      /\.sortable/i,
      /\.draggable/i,
      /\.resizable/i,
      /\.carousel/i,
      /\.swipe/i,
      /\.toggle-switch/i,
      /\.range/i
    ];

    // Problematic selectors where user-select: none causes accessibility issues
    const problematicSelectors = [
      { pattern: 'body', name: 'body' },
      { pattern: 'html', name: 'html' },
      { pattern: '\\*', name: '* (universal selector)' },
      { pattern: 'main', name: 'main' },
      { pattern: 'article', name: 'article' },
      { pattern: 'section', name: 'section' },
      { pattern: '\\.container', name: '.container' },
      { pattern: '\\.wrapper', name: '.wrapper' },
      { pattern: '\\.content', name: '.content' },
      { pattern: '\\.page', name: '.page' },
      { pattern: '\\.app', name: '.app' },
      { pattern: '\\.layout', name: '.layout' },
      { pattern: '\\.main', name: '.main' },
      { pattern: '\\.body', name: '.body' }
    ];

    // Check each problematic selector
    for (const { pattern, name } of problematicSelectors) {
      // Match selector with user-select: none (including vendor prefixes)
      const selectorPattern = new RegExp(
        `${pattern}\\s*\\{([^}]*)\\}`,
        'gi'
      );

      let match;
      while ((match = selectorPattern.exec(content)) !== null) {
        elementsFound++;
        const ruleBlock = match[1];

        // Check for user-select: none (with or without vendor prefix)
        const hasUserSelectNone = /(?:-webkit-|-moz-|-ms-)?user-select\s*:\s*none/i.test(ruleBlock);

        if (hasUserSelectNone) {
          // Check if this is actually an acceptable use case based on the full selector
          const fullSelector = match[0].match(/^([^{]+)\{/)?.[1]?.trim() || name;
          const isAcceptable = acceptableSelectors.some(re => re.test(fullSelector));

          if (!isAcceptable) {
            const element = `user-select: none on "${fullSelector}"`;
            issues.push(format('USER_SELECT_NONE', { element }));
          }
        }
      }
    }

    // Deduplicate issues (same selector might match multiple patterns)
    const uniqueIssues = [...new Set(issues)];

    return {
      pass: uniqueIssues.length === 0,
      issues: uniqueIssues,
      elementsFound
    };
  }
};
