const { format } = require('../core/errors');

// Pre-compiled regex patterns
const EARLY_EXIT = /line-height\s*:/i;
const LINE_HEIGHT_PATTERN = /([\w\s.#\[\]='"~^$*|&>:+-]+)\s*\{[^}]*line-height\s*:\s*([^;}\n]+)/gi;
const UNITLESS_VALUE = /^(\d+(?:\.\d+)?)$/;
const PERCENT_VALUE = /^(\d+(?:\.\d+)?)\s*%/;
const NORMAL_KEYWORD = /^normal$/i;
// Combined pattern for body text selectors
const BODY_TEXT_SELECTOR = /^(?:body|p|\.text|\.content|\.body|\.paragraph|\.description|article|\.article|main|section)/i;

module.exports = {
  name: 'lineHeightTight',
  description: 'Detects line-height below 1.2 on body text which makes content harder to read',
  tier: 'full',
  type: 'scss',
  weight: 3,

  check(content) {
    // Early exit: no line-height declarations, no issues
    if (!EARLY_EXIT.test(content)) {
      return { pass: true, issues: [], elementsFound: 0 };
    }

    const issues = [];
    let elementsFound = 0;

    // Reset regex state
    LINE_HEIGHT_PATTERN.lastIndex = 0;

    let match;
    while ((match = LINE_HEIGHT_PATTERN.exec(content)) !== null) {
      elementsFound++;
      const selector = match[1].trim();
      const lineHeight = match[2].trim();

      // Skip 'normal' keyword early
      if (NORMAL_KEYWORD.test(lineHeight)) {
        continue;
      }

      let isTooTight = false;
      let parsedValue = '';

      // Check unitless values (preferred)
      const unitlessMatch = lineHeight.match(UNITLESS_VALUE);
      if (unitlessMatch) {
        const value = parseFloat(unitlessMatch[1]);
        if (value < 1.2) {
          isTooTight = true;
          parsedValue = value.toString();
        }
      } else {
        // Check percentage values
        const percentMatch = lineHeight.match(PERCENT_VALUE);
        if (percentMatch) {
          const value = parseFloat(percentMatch[1]);
          if (value < 120) {
            isTooTight = true;
            parsedValue = `${value}%`;
          }
        }
      }

      if (isTooTight) {
        issues.push(format('TEXT_LINE_HEIGHT_TIGHT', { element: `${selector} { line-height: ${parsedValue}; }` }));
      }
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
