const { format } = require('../core/errors');

module.exports = {
  name: 'lineHeightTight',
  description: 'Detects line-height below 1.2 on body text which makes content harder to read',
  tier: 'full',
  type: 'scss',
  weight: 3,

  check(content) {
    const issues = [];
    let elementsFound = 0;

    // Pattern to find line-height declarations with their selectors
    const lineHeightPattern = /([\w\s.#\[\]='"~^$*|&>:+-]+)\s*\{[^}]*line-height\s*:\s*([^;}\n]+)/gi;

    // Selectors that typically contain body text
    const bodyTextSelectors = [
      /^body$/i,
      /^p$/i,
      /^\.text/i,
      /^\.content/i,
      /^\.body/i,
      /^\.paragraph/i,
      /^\.description/i,
      /^article/i,
      /^\.article/i,
      /^main/i,
      /^section/i,
    ];

    let match;

    while ((match = lineHeightPattern.exec(content)) !== null) {
      elementsFound++;
      const selector = match[1].trim();
      const lineHeight = match[2].trim();

      let isTooTight = false;
      let parsedValue = '';

      // Check unitless values (preferred)
      const unitlessMatch = lineHeight.match(/^(\d+(?:\.\d+)?)$/);
      if (unitlessMatch) {
        const value = parseFloat(unitlessMatch[1]);
        if (value < 1.2) {
          isTooTight = true;
          parsedValue = value.toString();
        }
      }

      // Check percentage values
      const percentMatch = lineHeight.match(/^(\d+(?:\.\d+)?)\s*%/);
      if (percentMatch) {
        const value = parseFloat(percentMatch[1]);
        if (value < 120) { // 120% = 1.2
          isTooTight = true;
          parsedValue = `${value}%`;
        }
      }

      // Check for 'normal' keyword - this is fine
      if (/^normal$/i.test(lineHeight)) {
        continue;
      }

      if (isTooTight) {
        // Determine if this is likely body text
        const isBodyText = bodyTextSelectors.some(pattern => pattern.test(selector));

        if (isBodyText) {
          issues.push(format('TEXT_LINE_HEIGHT_TIGHT', { element: `${selector} { line-height: ${parsedValue}; }` }));
        } else {
          issues.push(format('TEXT_LINE_HEIGHT_TIGHT', { element: `${selector} { line-height: ${parsedValue}; }` }));
        }
      }
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
