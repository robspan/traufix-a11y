const { format } = require('../core/errors');

module.exports = {
  name: 'cdkAriaDescriber',
  description: 'Complex widgets have aria-describedby for usage instructions',
  tier: 'full',
  type: 'html',
  weight: 3,

  check(content) {
    const issues = [];
    let elementsFound = 0;

    // Find line number for a match position
    const getLineNumber = (pos) => {
      return content.substring(0, pos).split('\n').length;
    };

    // Complex widget roles that often benefit from descriptions
    const complexWidgetRoles = ['listbox', 'tree', 'grid', 'treegrid'];

    // Build pattern to match any of the complex widget roles
    const rolesPattern = complexWidgetRoles.join('|');
    const complexWidgetPattern = new RegExp(
      `<(\\w+[-\\w]*)([^>]*)\\brole\\s*=\\s*["'](${rolesPattern})["']([^>]*)>`,
      'gi'
    );

    // Pattern to check for aria-describedby (standard HTML and Angular bindings)
    const hasAriaDescribedBy = (elementString) => {
      return /\baria-describedby\s*=/i.test(elementString) ||
             /\[attr\.aria-describedby\]\s*=/i.test(elementString) ||
             /\[aria-describedby\]\s*=/i.test(elementString);
    };

    // Helper to extract element snippet for reporting
    const getSnippet = (match) => {
      const snippet = match.length > 80 ? match.substring(0, 80) + '...' : match;
      return snippet.replace(/\s+/g, ' ').trim();
    };

    let match;
    while ((match = complexWidgetPattern.exec(content)) !== null) {
      elementsFound++;
      const elementString = match[0];
      const lineNumber = getLineNumber(match.index);

      if (!hasAriaDescribedBy(elementString)) {
        const snippet = getSnippet(elementString);
        issues.push(format('CDK_LIVE_ANNOUNCER_MISSING', { element: snippet, line: lineNumber }));
      }
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
