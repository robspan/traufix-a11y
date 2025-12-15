const { parseColor, getLuminance, getContrastRatio, getContrastRating } = require('../colors');
const { format } = require('../core/errors');
const { resolveValue, containsVariable, isLiteralColor } = require('../core/variableResolver');

// Pre-compiled regex patterns
const EARLY_EXIT_COLOR = /\bcolor\s*:/i;
const EARLY_EXIT_BG = /background/i;
const RULE_BLOCK = /([\w\s.#\[\]='"~^$*|&>:+-]+)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
const COLOR_DECL = /(?:^|[^-])color\s*:\s*([^;}\n]+)/i;
const BG_DECL = /background(?:-color)?\s*:\s*([^;}\n]+)/i;
const GRADIENT_OR_URL = /gradient|url\(/i;
const FUNC_CALL = /^[a-z-]+\s*\(/i;
const LIGHT_GRAY = /(?:^|[^-])color\s*:\s*#([cde])\1\1(?![0-9a-f])/gi;
const TRANSPARENT_TEXT = /(?:^|[^-])color\s*:\s*rgba\s*\([^)]*,\s*0\.[0-3]\d*\s*\)/gi;

module.exports = {
  name: 'colorContrast',
  description: 'Detects obvious low-contrast color patterns that fail WCAG requirements',
  tier: 'basic',
  type: 'scss',
  weight: 7,

  /**
   * Check color contrast in SCSS content
   * @param {string} content - SCSS file content
   * @param {object} context - Variable context from variableResolver (optional)
   * @returns {object} - { pass, issues, elementsFound }
   */
  check(content, context = null) {
    // Early exit: no color declarations, no issues
    if (!EARLY_EXIT_COLOR.test(content) || !EARLY_EXIT_BG.test(content)) {
      return { pass: true, issues: [], elementsFound: 0 };
    }

    const issues = [];
    let elementsFound = 0;
    let variablesResolved = 0;
    let variablesSkipped = 0;

    // Create empty context if not provided
    const varContext = context || {
      scssVars: new Map(),
      cssVars: new Map(),
      maps: new Map()
    };

    // Reset regex state
    RULE_BLOCK.lastIndex = 0;

    let match;
    while ((match = RULE_BLOCK.exec(content)) !== null) {
      elementsFound++;
      const selector = match[1].trim();
      const declarations = match[2];

      // Extract text color and background color from the same rule
      const colorMatch = declarations.match(COLOR_DECL);
      const bgMatch = declarations.match(BG_DECL);

      if (colorMatch && bgMatch) {
        let textColor = colorMatch[1].trim();
        let bgColor = bgMatch[1].trim();

        // Skip gradients and images (cannot analyze)
        if (GRADIENT_OR_URL.test(bgColor)) {
          continue;
        }

        // Try to resolve variables/functions
        if (containsVariable(textColor)) {
          const resolved = resolveValue(textColor, varContext);
          if (resolved && isLiteralColor(resolved)) {
            textColor = resolved;
            variablesResolved++;
          } else {
            variablesSkipped++;
            continue;
          }
        }

        if (containsVariable(bgColor)) {
          const resolved = resolveValue(bgColor, varContext);
          if (resolved && isLiteralColor(resolved)) {
            bgColor = resolved;
            variablesResolved++;
          } else {
            variablesSkipped++;
            continue;
          }
        }

        // Try to resolve color functions
        if (!isLiteralColor(textColor) && FUNC_CALL.test(textColor)) {
          const resolved = resolveValue(textColor, varContext);
          if (resolved && isLiteralColor(resolved)) {
            textColor = resolved;
            variablesResolved++;
          } else {
            variablesSkipped++;
            continue;
          }
        }

        if (!isLiteralColor(bgColor) && FUNC_CALL.test(bgColor)) {
          const resolved = resolveValue(bgColor, varContext);
          if (resolved && isLiteralColor(resolved)) {
            bgColor = resolved;
            variablesResolved++;
          } else {
            variablesSkipped++;
            continue;
          }
        }

        const textRgb = parseColor(textColor);
        const bgRgb = parseColor(bgColor);

        if (textRgb && bgRgb) {
          const ratio = getContrastRatio(textColor, bgColor);

          if (ratio !== null && ratio < 4.5) {
            const cleanSelector = selector.replace(/\s+/g, ' ').substring(0, 50);

            if (ratio < 3.0) {
              issues.push(format('COLOR_CONTRAST_LOW', {
                ratio: ratio.toFixed(2),
                required: '4.5',
                element: `"${cleanSelector}": ${textColor} on ${bgColor}`
              }));
            } else {
              issues.push(format('COLOR_CONTRAST_LARGE_TEXT', {
                ratio: ratio.toFixed(2),
                element: `"${cleanSelector}": ${textColor} on ${bgColor}`
              }));
            }
          }
        }
      }
    }

    // Detect obviously problematic patterns even without pairing
    const seenMessages = new Set();

    // Very light gray text (#ccc, #ddd, #eee) - almost invisible on white
    LIGHT_GRAY.lastIndex = 0;
    let patternMatch;
    while ((patternMatch = LIGHT_GRAY.exec(content)) !== null) {
      const color = patternMatch[0].match(/#[cde]{3}/i)[0];
      const message = format('COLOR_CONTRAST_LOW', { ratio: '1.6', required: '4.5', element: `Very light text color "${color}"` });
      if (!seenMessages.has(message)) {
        seenMessages.add(message);
        issues.push(message);
      }
    }

    // Highly transparent text (opacity below 0.4) - definitely unreadable
    TRANSPARENT_TEXT.lastIndex = 0;
    while ((patternMatch = TRANSPARENT_TEXT.exec(content)) !== null) {
      const colorValue = patternMatch[0].match(/rgba\s*\([^)]+\)/i)[0];
      const message = format('COLOR_TRANSPARENT_TEXT', { element: `"${colorValue}"` });
      if (!seenMessages.has(message)) {
        seenMessages.add(message);
        issues.push(message);
      }
    }

    // Filter: only fail on errors, not info messages
    const errorCount = issues.filter(i => i.startsWith('[Error]')).length;

    return {
      pass: errorCount === 0,
      issues,
      elementsFound,
      variablesResolved,
      variablesSkipped
    };
  }
};
