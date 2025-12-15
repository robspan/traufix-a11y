const { format } = require('../core/errors');

// Pre-compiled regex patterns
const EARLY_EXIT = /font-size\s*:/i;
const FONT_SIZE_PATTERN = /([\w\s.#\[\]='"~^$*|&>:+-]+)\s*\{[^}]*font-size\s*:\s*([^;}\n]+)/gi;
const PX_VALUE = /^(\d+(?:\.\d+)?)\s*px/i;
const REM_VALUE = /^(\d+(?:\.\d+)?)\s*rem/i;
const EM_VALUE = /^(\d+(?:\.\d+)?)\s*em/i;
const PT_VALUE = /^(\d+(?:\.\d+)?)\s*pt/i;

module.exports = {
  name: 'smallFontSize',
  description: 'Detects font sizes below 12px which can be difficult to read for users with visual impairments',
  tier: 'full',
  type: 'scss',
  weight: 3,

  check(content) {
    // Early exit: no font-size declarations, no issues
    if (!EARLY_EXIT.test(content)) {
      return { pass: true, issues: [], elementsFound: 0 };
    }

    const issues = [];
    let elementsFound = 0;

    // Reset regex state
    FONT_SIZE_PATTERN.lastIndex = 0;

    let match;
    while ((match = FONT_SIZE_PATTERN.exec(content)) !== null) {
      elementsFound++;
      const selector = match[1].trim();
      const fontSize = match[2].trim();

      let isTooSmall = false;
      let parsedValue = '';

      // Check pixel values
      const pxMatch = fontSize.match(PX_VALUE);
      if (pxMatch) {
        const pxValue = parseFloat(pxMatch[1]);
        if (pxValue < 12) {
          isTooSmall = true;
          parsedValue = `${pxValue}px`;
        }
      } else {
        // Check rem values (assuming 16px base)
        const remMatch = fontSize.match(REM_VALUE);
        if (remMatch) {
          const remValue = parseFloat(remMatch[1]);
          if (remValue < 0.75) {
            isTooSmall = true;
            parsedValue = `${remValue}rem (approximately ${remValue * 16}px)`;
          }
        } else {
          // Check em values
          const emMatch = fontSize.match(EM_VALUE);
          if (emMatch) {
            const emValue = parseFloat(emMatch[1]);
            if (emValue < 0.75) {
              isTooSmall = true;
              parsedValue = `${emValue}em`;
            }
          } else {
            // Check pt values
            const ptMatch = fontSize.match(PT_VALUE);
            if (ptMatch) {
              const ptValue = parseFloat(ptMatch[1]);
              if (ptValue < 9) {
                isTooSmall = true;
                parsedValue = `${ptValue}pt`;
              }
            }
          }
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