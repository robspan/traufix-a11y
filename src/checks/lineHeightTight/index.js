module.exports = {
  name: 'lineHeightTight',
  description: 'Detects line-height below 1.2 on body text which makes content harder to read',
  tier: 'full',
  type: 'scss',
  weight: 3,

  check(content) {
    const issues = [];

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
          issues.push(
            `[Warning] Selector "${selector}" has tight line-height. ` +
            `Insufficient line spacing makes text difficult to read, especially for users with cognitive disabilities or low vision.\n` +
            `  How to fix:\n` +
            `    - Increase line-height to at least 1.5 for body text (WCAG recommendation)\n` +
            `    - Use unitless values for better scaling: line-height: 1.5;\n` +
            `    - For headings, minimum 1.2 is acceptable\n` +
            `    - Test with users who have dyslexia or low vision\n` +
            `  WCAG 1.4.12: Text Spacing\n` +
            `  Found: ${selector} { line-height: ${parsedValue}; }`
          );
        } else {
          issues.push(
            `[Info] Selector "${selector}" has tight line-height. ` +
            `If this contains readable text, insufficient spacing may impact readability.\n` +
            `  How to fix:\n` +
            `    - Consider increasing to at least 1.2 for better readability\n` +
            `    - Use 1.5 or higher for body text\n` +
            `    - Use unitless values for better scaling\n` +
            `  WCAG 1.4.12: Text Spacing\n` +
            `  Found: ${selector} { line-height: ${parsedValue}; }`
          );
        }
      }
    }

    return {
      pass: issues.length === 0,
      issues
    };
  }
};
