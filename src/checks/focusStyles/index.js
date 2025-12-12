const { format } = require('../../core/errors');

module.exports = {
  name: 'focusStyles',
  description: 'Detects outline removal on focus without alternative visual indicators',
  tier: 'basic',
  type: 'scss',
  weight: 7,
  wcag: '2.4.7',

  check(content) {
    const issues = [];
    let elementsFound = 0;

    // Pattern to find rule blocks - captures selector and declarations
    const ruleBlockPattern = /([\w\s.#\[\]='"~^$*|&>:+-]+)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;

    let match;
    while ((match = ruleBlockPattern.exec(content)) !== null) {
      elementsFound++;
      const selector = match[1].trim();
      const declarations = match[2];

      // Check if this is a focus-related selector
      const isFocusSelector = /:focus(?:-visible|-within)?/i.test(selector);

      if (isFocusSelector) {
        // Check if outline is being removed
        const hasOutlineNone = /outline\s*:\s*(?:none|0|0px)\s*(?:!important)?[;\s}]/i.test(declarations);

        if (hasOutlineNone) {
          // Check for alternative focus indicators
          const hasBoxShadow = /box-shadow\s*:\s*(?!none|0)[^;]+/i.test(declarations);
          const hasBorderChange = /border(?:-color|-width)?\s*:\s*(?!none|0px|inherit|transparent)[^;]+/i.test(declarations);
          const hasBackgroundChange = /background(?:-color)?\s*:\s*(?!none|inherit|transparent)[^;]+/i.test(declarations);
          const hasTextDecoration = /text-decoration\s*:\s*(?!none|inherit)[^;]+/i.test(declarations);
          const hasColorChange = /(?:^|[^-])color\s*:\s*(?!inherit)[^;]+/i.test(declarations);
          const hasTransform = /transform\s*:\s*(?!none)[^;]+/i.test(declarations);
          const hasRingOffset = /ring-offset|--tw-ring/i.test(declarations); // Tailwind CSS ring utilities

          const hasAlternative = hasBoxShadow || hasBorderChange || hasBackgroundChange ||
                                 hasTextDecoration || hasColorChange || hasTransform || hasRingOffset;

          if (!hasAlternative) {
            // Extract a cleaner selector for the message
            const cleanSelector = selector.replace(/\s+/g, ' ').substring(0, 60);
            issues.push(format('FOCUS_OUTLINE_REMOVED', { element: cleanSelector }));
          }
        }
      }
    }

    // Also check for global outline:none patterns that affect all elements
    const globalOutlineNone = /^\s*\*\s*\{[^}]*outline\s*:\s*(?:none|0)/mi.test(content) ||
                              /^\s*:focus\s*\{[^}]*outline\s*:\s*(?:none|0)/mi.test(content);

    if (globalOutlineNone) {
      // Check if there's a compensating focus-visible rule
      const hasFocusVisibleCompensation = /:focus-visible\s*\{[^}]*(?:outline|box-shadow|border)/i.test(content);

      if (!hasFocusVisibleCompensation) {
        issues.push(format('FOCUS_OUTLINE_REMOVED', { element: 'global focus outline removal' }));
      }
    }

    return { pass: issues.length === 0, issues, elementsFound };
  }
};
