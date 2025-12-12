const { format } = require('../../core/errors');

module.exports = {
  name: 'smallFontSize',
  description: 'Detects font sizes below 12px which can be difficult to read for users with visual impairments',
  tier: 'full',
  type: 'scss',
  weight: 3,

  check(content) {
    const issues = [];
    let elementsFound = 0;

    // Pattern to find font-size declarations
    const fontSizePattern = /([\w\s.#\[\]='"~^$*|&>:+-]+)\s*\{[^}]*font-size\s*:\s*([^;}\n]+)/gi;

    let match;

    while ((match = fontSizePattern.exec(content)) !== null) {
      elementsFound++;
      const selector = match[1].trim();
      const fontSize = match[2].trim();

      let isTooSmall = false;
      let parsedValue = '';

      // Check pixel values
      const pxMatch = fontSize.match(/^(\d+(?:\.\d+)?)\s*px/i);
      if (pxMatch) {
        const pxValue = parseFloat(pxMatch[1]);
        if (pxValue < 12) {
          isTooSmall = true;
          parsedValue = `${pxValue}px`;
        }
      }

      // Check rem values (assuming 16px base)
      const remMatch = fontSize.match(/^(\d+(?:\.\d+)?)\s*rem/i);
      if (remMatch) {
        const remValue = parseFloat(remMatch[1]);
        if (remValue < 0.75) { // 0.75rem = 12px at 16px base
          isTooSmall = true;
          parsedValue = `${remValue}rem (approximately ${remValue * 16}px)`;
        }
      }

      // Check em values (context-dependent, but warn for very small values)
      const emMatch = fontSize.match(/^(\d+(?:\.\d+)?)\s*em/i);
      if (emMatch) {
        const emValue = parseFloat(emMatch[1]);
        if (emValue < 0.75) {
          isTooSmall = true;
          parsedValue = `${emValue}em`;
        }
      }

      // Check pt values (12px approximately equals 9pt)
      const ptMatch = fontSize.match(/^(\d+(?:\.\d+)?)\s*pt/i);
      if (ptMatch) {
        const ptValue = parseFloat(ptMatch[1]);
        if (ptValue < 9) {
          isTooSmall = true;
          parsedValue = `${ptValue}pt`;
        }
      }

      if (isTooSmall) {
        issues.push(format('TEXT_SMALL_FONT', {
          size: parsedValue,
          element: `"${selector}"`
        }));
      }
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
