const { parseColor, getLuminance, getContrastRatio, getContrastRating } = require('../../colors');
const { format } = require('../../core/errors');

module.exports = {
  name: 'colorContrast',
  description: 'Detects obvious low-contrast color patterns that fail WCAG requirements',
  tier: 'basic',
  type: 'scss',
  weight: 7,

  check(content) {
    const issues = [];
    let elementsFound = 0;

    // Pattern to find rule blocks with both color and background
    const ruleBlockPattern = /([\w\s.#\[\]='"~^$*|&>:+-]+)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;

    let match;
    while ((match = ruleBlockPattern.exec(content)) !== null) {
      elementsFound++;
      const selector = match[1].trim();
      const declarations = match[2];

      // Skip if it uses CSS variables or SCSS variables (can't analyze statically)
      if (/var\(|^\$|\$[a-z]/i.test(declarations)) {
        continue;
      }

      // Extract text color and background color from the same rule
      const colorMatch = declarations.match(/(?:^|[^-])color\s*:\s*([^;}\n]+)/i);
      const bgMatch = declarations.match(/background(?:-color)?\s*:\s*([^;}\n]+)/i);

      if (colorMatch && bgMatch) {
        const textColor = colorMatch[1].trim();
        const bgColor = bgMatch[1].trim();

        // Skip gradients, images, and variables
        if (/gradient|url\(|var\(|\$/i.test(bgColor)) {
          continue;
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
              // Between 3.0 and 4.5 - only passes for large text
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
    const problematicPatterns = [
      {
        // Very light gray text (#ccc, #ddd, #eee) - almost invisible on white
        pattern: /(?:^|[^-])color\s*:\s*#([cde])\1\1(?![0-9a-f])/gi,
        code: 'COLOR_CONTRAST_LOW',
        getData: (match) => {
          const color = match.match(/#[cde]{3}/i)[0];
          return { ratio: '1.6', required: '4.5', element: `Very light text color "${color}"` };
        }
      },
      {
        // Highly transparent text (opacity below 0.4) - definitely unreadable
        pattern: /(?:^|[^-])color\s*:\s*rgba\s*\([^)]*,\s*0\.[0-3]\d*\s*\)/gi,
        code: 'COLOR_TRANSPARENT_TEXT',
        getData: (match) => {
          const colorValue = match.match(/rgba\s*\([^)]+\)/i)[0];
          return { element: `"${colorValue}"` };
        }
      }
    ];

    const seenMessages = new Set();
    for (const { pattern, code, getData } of problematicPatterns) {
      let patternMatch;
      pattern.lastIndex = 0; // Reset regex
      while ((patternMatch = pattern.exec(content)) !== null) {
        const data = getData(patternMatch[0]);
        const message = format(code, data);
        // Avoid duplicate messages
        if (!seenMessages.has(message)) {
          seenMessages.add(message);
          issues.push(message);
        }
      }
    }

    // Filter: only fail on errors, not info messages
    const errorCount = issues.filter(i => i.startsWith('[Error]')).length;

    return {
      pass: errorCount === 0,
      issues,
      elementsFound
    };
  }
};
