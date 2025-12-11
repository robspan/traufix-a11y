module.exports = {
  name: 'touchTargets',
  description: 'Check interactive elements meet minimum 44x44px target size (WCAG 2.5.5)',
  tier: 'basic',
  type: 'scss',
  weight: 7,
  wcag: '2.5.5',

  check(content) {
    const issues = [];

    // Interactive element selectors to check
    const interactiveSelectors = [
      'button',
      '\\.btn',
      '\\.chip',
      '\\.toggle',
      '\\.icon-btn',
      '\\.icon-button',
      '\\.fab',
      'a\\[',            // links with attributes (usually interactive)
      'input\\[type=',
      '\\.clickable',
      '\\.tappable'
    ];

    // Build pattern to find interactive element rule blocks
    const selectorPattern = new RegExp(
      `(${interactiveSelectors.join('|')})[^{]*\\{([^}]*)\\}`,
      'gi'
    );

    // Minimum touch target size per WCAG 2.5.5 is 44x44px
    // WCAG 2.5.8 (AAA) recommends 44x44px, while 2.5.5 (AA) allows 24x24px minimum
    const minSize = 44;
    const minSizeRem = 2.75; // 44px / 16px

    let match;
    while ((match = selectorPattern.exec(content)) !== null) {
      const fullMatch = match[0];
      const selector = match[1].replace(/\\/g, '');
      const ruleBlock = match[2];

      // Check for explicit small sizes that violate touch target guidelines
      const heightMatch = ruleBlock.match(/(?:^|[^-])height\s*:\s*(\d+(?:\.\d+)?)(px|rem|em)/i);
      const widthMatch = ruleBlock.match(/(?:^|[^-])width\s*:\s*(\d+(?:\.\d+)?)(px|rem|em)/i);
      const minHeightMatch = ruleBlock.match(/min-height\s*:\s*(\d+(?:\.\d+)?)(px|rem|em)/i);
      const minWidthMatch = ruleBlock.match(/min-width\s*:\s*(\d+(?:\.\d+)?)(px|rem|em)/i);

      // Helper to convert to pixels for comparison
      const toPixels = (value, unit) => {
        const num = parseFloat(value);
        if (unit === 'rem' || unit === 'em') return num * 16;
        return num;
      };

      // Check for explicitly small heights (below 44px)
      if (heightMatch) {
        const heightPx = toPixels(heightMatch[1], heightMatch[2]);
        if (heightPx < minSize && heightPx > 0) {
          // Check if min-height compensates
          if (!minHeightMatch || toPixels(minHeightMatch[1], minHeightMatch[2]) < minSize) {
            issues.push(
              `[Error] Touch target smaller than 44x44px. Small targets are difficult to activate for users with motor impairments\n` +
              `  How to fix:\n` +
              `    - Ensure minimum 44x44px clickable area (padding counts)\n` +
              `  WCAG 2.5.5: Target Size | See: https://www.w3.org/WAI/WCAG21/Understanding/target-size\n` +
              `  Found: <${selector}> (height: ${heightMatch[1]}${heightMatch[2]} = ${Math.round(heightPx)}px)`
            );
          }
        }
      }

      // Check for explicitly small widths
      if (widthMatch) {
        const widthPx = toPixels(widthMatch[1], widthMatch[2]);
        if (widthPx < minSize && widthPx > 0) {
          // Check if min-width compensates
          if (!minWidthMatch || toPixels(minWidthMatch[1], minWidthMatch[2]) < minSize) {
            issues.push(
              `[Error] Touch target smaller than 44x44px. Small targets are difficult to activate for users with motor impairments\n` +
              `  How to fix:\n` +
              `    - Ensure minimum 44x44px clickable area (padding counts)\n` +
              `  WCAG 2.5.5: Target Size | See: https://www.w3.org/WAI/WCAG21/Understanding/target-size\n` +
              `  Found: <${selector}> (width: ${widthMatch[1]}${widthMatch[2]} = ${Math.round(widthPx)}px)`
            );
          }
        }
      }

      // Check for small min-height/min-width values
      if (minHeightMatch && !heightMatch) {
        const minHeightPx = toPixels(minHeightMatch[1], minHeightMatch[2]);
        if (minHeightPx < minSize && minHeightPx > 0) {
          issues.push(
            `[Error] Touch target smaller than 44x44px. Small targets are difficult to activate for users with motor impairments\n` +
            `  How to fix:\n` +
            `    - Ensure minimum 44x44px clickable area (padding counts)\n` +
            `  WCAG 2.5.5: Target Size | See: https://www.w3.org/WAI/WCAG21/Understanding/target-size\n` +
            `  Found: <${selector}> (min-height: ${minHeightMatch[1]}${minHeightMatch[2]} = ${Math.round(minHeightPx)}px)`
          );
        }
      }

      if (minWidthMatch && !widthMatch) {
        const minWidthPx = toPixels(minWidthMatch[1], minWidthMatch[2]);
        if (minWidthPx < minSize && minWidthPx > 0) {
          issues.push(
            `[Error] Touch target smaller than 44x44px. Small targets are difficult to activate for users with motor impairments\n` +
            `  How to fix:\n` +
            `    - Ensure minimum 44x44px clickable area (padding counts)\n` +
            `  WCAG 2.5.5: Target Size | See: https://www.w3.org/WAI/WCAG21/Understanding/target-size\n` +
            `  Found: <${selector}> (min-width: ${minWidthMatch[1]}${minWidthMatch[2]} = ${Math.round(minWidthPx)}px)`
          );
        }
      }

      // Check for font-size based icon buttons without adequate sizing
      const fontSizeMatch = ruleBlock.match(/font-size\s*:\s*(\d+(?:\.\d+)?)(px|rem|em)/i);
      if (fontSizeMatch && /icon/i.test(selector)) {
        const fontSizePx = toPixels(fontSizeMatch[1], fontSizeMatch[2]);
        // Icon buttons often only rely on font-size, check if there's adequate padding or min-size
        const hasPadding = /padding\s*:/i.test(ruleBlock);
        const hasMinSize = minHeightMatch || minWidthMatch;

        if (fontSizePx < 24 && !hasPadding && !hasMinSize) {
          issues.push(
            `[Error] Touch target smaller than 44x44px. Small targets are difficult to activate for users with motor impairments\n` +
            `  How to fix:\n` +
            `    - Ensure minimum 44x44px clickable area (padding counts)\n` +
            `  WCAG 2.5.5: Target Size | See: https://www.w3.org/WAI/WCAG21/Understanding/target-size\n` +
            `  Found: <${selector}> (font-size: ${fontSizeMatch[1]}${fontSizeMatch[2]}, no padding or min-size)`
          );
        }
      }
    }

    // Also check for line-height on inline interactive elements that might constrain height
    const lineHeightPattern = /(a|button|\.btn|\.link)[^{]*\{[^}]*line-height\s*:\s*(\d+(?:\.\d+)?)(px)?[^}]*\}/gi;
    let lineHeightMatch;
    while ((lineHeightMatch = lineHeightPattern.exec(content)) !== null) {
      const selector = lineHeightMatch[1];
      const lineHeightValue = parseFloat(lineHeightMatch[2]);
      const unit = lineHeightMatch[3] || '';

      // Only flag if it's a pixel value less than minimum
      if (unit === 'px' && lineHeightValue < minSize && lineHeightValue > 0) {
        issues.push(
          `[Error] Touch target smaller than 44x44px. Small targets are difficult to activate for users with motor impairments\n` +
          `  How to fix:\n` +
          `    - Ensure minimum 44x44px clickable area (padding counts)\n` +
          `  WCAG 2.5.5: Target Size | See: https://www.w3.org/WAI/WCAG21/Understanding/target-size\n` +
          `  Found: <${selector}> (line-height: ${lineHeightValue}px)`
        );
      }
    }

    return { pass: issues.length === 0, issues };
  }
};
