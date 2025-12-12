const { format } = require('../../core/errors');

module.exports = {
  name: 'hoverWithoutFocus',
  description: 'Ensures :hover styles have matching :focus styles for keyboard user parity',
  tier: 'material',
  type: 'scss',
  weight: 3,
  wcag: '2.1.1',

  check(content) {
    const issues = [];
    let elementsFound = 0;

    // Pattern to find :hover pseudo-class with its selector
    // Captures the selector before :hover
    const hoverPattern = /([\w\s.#\[\]='"~^$*|-]+):hover\s*\{/g;

    // Find all hover declarations
    const hoverMatches = [];
    let match;

    while ((match = hoverPattern.exec(content)) !== null) {
      elementsFound++;
      const selector = match[1].trim();
      // Skip if it's already a combined hover/focus rule
      if (!match[0].includes(':focus')) {
        hoverMatches.push({
          selector,
          fullMatch: match[0],
          index: match.index
        });
      }
    }

    // For each hover, check if a corresponding focus exists
    for (const hover of hoverMatches) {
      const selector = hover.selector;

      // Escape special regex characters in the selector
      const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Check for various focus patterns:
      // 1. selector:focus
      // 2. selector:focus-visible
      // 3. Combined selector:hover, selector:focus (or vice versa)
      // 4. &:focus in nested SCSS (when selector contains &)
      const focusPatterns = [
        new RegExp(`${escapedSelector}\\s*:focus(?:-visible)?\\s*\\{`, 'i'),
        new RegExp(`${escapedSelector}\\s*:hover\\s*,\\s*${escapedSelector}\\s*:focus`, 'i'),
        new RegExp(`${escapedSelector}\\s*:focus\\s*,\\s*${escapedSelector}\\s*:hover`, 'i'),
        new RegExp(`:hover\\s*,\\s*:focus`, 'i'), // Combined pseudo-classes
        new RegExp(`:focus\\s*,\\s*:hover`, 'i'),
      ];

      // Also check for &:focus if we're in SCSS context
      const ampersandFocusPattern = /&:focus(?:-visible)?\s*\{/i;

      // Check if any context around the hover has a corresponding focus
      const contextStart = Math.max(0, hover.index - 500);
      const contextEnd = Math.min(content.length, hover.index + 500);
      const context = content.substring(contextStart, contextEnd);

      const hasFocus = focusPatterns.some(pattern => pattern.test(content)) ||
                       ampersandFocusPattern.test(context);

      if (!hasFocus) {
        issues.push(format('HOVER_WITHOUT_FOCUS', { element: `${selector}:hover` }));
      }
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
