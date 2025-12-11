const { parseColor, getLuminance, getContrastRatio, getContrastRating } = require('../../colors');

module.exports = {
  name: 'colorContrast',
  description: 'Detects obvious low-contrast color patterns that fail WCAG requirements',
  tier: 'basic',
  type: 'scss',
  weight: 7,

  check(content) {
    const issues = [];

    // Pattern to find rule blocks with both color and background
    const ruleBlockPattern = /([\w\s.#\[\]='"~^$*|&>:+-]+)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;

    let match;
    while ((match = ruleBlockPattern.exec(content)) !== null) {
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
            const rating = getContrastRating(ratio);
            const cleanSelector = selector.replace(/\s+/g, ' ').substring(0, 50);

            if (ratio < 3.0) {
              issues.push(
                `[Error] Low contrast in "${cleanSelector}": ${textColor} on ${bgColor} ` +
                `(ratio: ${ratio.toFixed(2)}:1, needs 4.5:1 for AA). ` +
                `FIX: Increase contrast by using darker text or lighter background.`
              );
            } else {
              // Between 3.0 and 4.5 - only passes for large text
              issues.push(
                `[Warning] Contrast in "${cleanSelector}": ${textColor} on ${bgColor} ` +
                `(ratio: ${ratio.toFixed(2)}:1) only meets AA for large text (18pt+/14pt bold). ` +
                `FIX: For normal text, increase contrast to 4.5:1 minimum.`
              );
            }
          }
        }
      }
    }

    // Detect obviously problematic patterns even without pairing
    const problematicPatterns = [
      {
        // Very light gray text (#ccc, #ddd, #eee) - almost invisible on white
        // These are definite problems - #ccc on white is only 1.6:1 ratio
        pattern: /(?:^|[^-])color\s*:\s*#([cde])\1\1(?![0-9a-f])/gi,
        msg: (match) => {
          const color = match.match(/#[cde]{3}/i)[0];
          return `[Error] Very light text color "${color}" has insufficient contrast on light backgrounds. ` +
                 `FIX: Use a darker color (e.g., #767676 or darker meets 4.5:1 on white).`;
        }
      },
      {
        // Highly transparent text (opacity below 0.4) - definitely unreadable
        pattern: /(?:^|[^-])color\s*:\s*rgba\s*\([^)]*,\s*0\.[0-3]\d*\s*\)/gi,
        msg: (match) => {
          const colorValue = match.match(/rgba\s*\([^)]+\)/i)[0];
          return `[Error] Highly transparent text "${colorValue}" is difficult to read. ` +
                 `FIX: Increase opacity to at least 0.55 for adequate contrast.`;
        }
      },
      {
        // White or near-white text without context - informational only
        // This might be intentional with a dark background, so just warn
        pattern: /(?:^|[^-])color\s*:\s*(?:#fff(?:fff)?|white)\s*[;}\n]/gi,
        msg: () => {
          return `[Info] White text detected. Verify it's paired with a dark background ` +
                 `(contrast ratio 4.5:1 minimum for normal text).`;
        }
      }
    ];

    const seenMessages = new Set();
    for (const { pattern, msg } of problematicPatterns) {
      let patternMatch;
      pattern.lastIndex = 0; // Reset regex
      while ((patternMatch = pattern.exec(content)) !== null) {
        const message = typeof msg === 'function' ? msg(patternMatch[0]) : msg;
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
      issues
    };
  }
};
