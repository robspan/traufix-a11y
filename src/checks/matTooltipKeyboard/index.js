module.exports = {
  name: 'matTooltipKeyboard',
  description: 'Check that matTooltip is not placed on non-focusable elements',
  tier: 'full',
  type: 'html',
  weight: 3,
  wcag: '2.1.1',

  check(content) {
    const issues = [];

    // List of naturally focusable elements
    const focusableElements = ['a', 'button', 'input', 'select', 'textarea', 'area'];

    // Match elements with matTooltip
    const tooltipRegex = /<(\w+)([^>]*)\[?matTooltip\]?\s*=\s*["'][^"']*["']([^>]*)>/gi;

    let match;
    while ((match = tooltipRegex.exec(content)) !== null) {
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
        issues.push(
          `[Error] matTooltip on non-focusable element. Keyboard users cannot access tooltip content\n` +
          `  How to fix:\n` +
          `    - Add tabindex="0" to make element focusable\n` +
          `    - Use on button/link instead\n` +
          `  WCAG 2.1.1: Keyboard | See: https://material.angular.io/components/tooltip/overview#accessibility\n` +
          `  Found: ${snippet}`
        );
      }
    }

    return {
      pass: issues.length === 0,
      issues
    };
  }
};
