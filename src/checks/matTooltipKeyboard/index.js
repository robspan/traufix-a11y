const { format } = require('../../core/errors');

module.exports = {
  name: 'matTooltipKeyboard',
  description: 'Check that matTooltip is not placed on non-focusable elements',
  tier: 'full',
  type: 'html',
  weight: 3,
  wcag: '2.1.1',

  check(content) {
    const issues = [];
    let elementsFound = 0;

    // List of naturally focusable elements
    const focusableElements = ['a', 'button', 'input', 'select', 'textarea', 'area'];

    // Match elements with matTooltip
    const tooltipRegex = /<(\w+)([^>]*)\[?matTooltip\]?\s*=\s*["'][^"']*["']([^>]*)>/gi;

    let match;
    while ((match = tooltipRegex.exec(content)) !== null) {
      elementsFound++;
      const fullMatch = match[0];
      const tagName = match[1].toLowerCase();
      const beforeAttr = match[2] || '';
      const afterAttr = match[3] || '';
      const allAttributes = beforeAttr + afterAttr;

      // Check if the element is naturally focusable
      const isNaturallyFocusable = focusableElements.includes(tagName);

      // Check for tabindex attribute (makes element focusable)
      const hasTabindex = /tabindex\s*=\s*["']?[^"'\s>]+["']?/i.test(fullMatch);

      // Check for Angular tabindex binding
      const hasTabindexBinding = /\[tabindex\]\s*=\s*["'][^"']*["']/i.test(fullMatch);

      // Check if element has interactive Angular directives that might make it focusable
      const hasClickHandler = /\(click\)\s*=/i.test(fullMatch);
      const hasRouterLink = /routerLink/i.test(fullMatch);

      // If element is not focusable, flag it
      if (!isNaturallyFocusable && !hasTabindex && !hasTabindexBinding) {
        const snippet = fullMatch.length > 100 ? fullMatch.substring(0, 100) + '...' : fullMatch;
        issues.push(format('MAT_TOOLTIP_KEYBOARD', { element: snippet }));
      }
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
