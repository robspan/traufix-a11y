module.exports = {
  name: 'touchTargets',
  description: 'Check interactive elements meet minimum touch target size (WCAG 2.5.5)',
  tier: 'full',  // Changed from basic - too many false positives for basic tier
  type: 'scss',
  weight: 3,  // Lower weight - often design decisions
  wcag: '2.5.5',

  check(content) {
    // Early exit: no relevant elements, no issues
    if (!/width:|height:/i.test(content)) {
      return { pass: true, issues: [], elementsFound: 0 };
    }

    const issues = [];
    let elementsFound = 0;

    // WCAG 2.5.5 (AA) requires 24x24px minimum
    // WCAG 2.5.8 (AAA) recommends 44x44px
    // We only flag as Error below 24px, Warning for 24-44px
    const minSizeAA = 24;  // AA requirement
    const minSizeAAA = 44; // AAA recommendation

    // Interactive element selectors to check
    const interactiveSelectors = [
      // Buttons
      'button',
      '\\.btn',
      '\\.icon-btn',
      '\\.icon-button',
      '\\.fab',
      // Form inputs
      'input',
      'select',
      'textarea',
      // Links
      '\\ba\\b',
      '\\.link',
      // Custom interactive elements
      '\\[role="button"\\]',
      '\\[role="link"\\]',
      '\\[role="checkbox"\\]',
      '\\[role="radio"\\]',
      '\\[role="switch"\\]',
      '\\[role="tab"\\]',
      '\\[role="menuitem"\\]',
      // Common UI patterns
      '\\.clickable',
      '\\.interactive',
      '\\.toggle',
      '\\.chip',
      '\\.tag'
    ];

    // Build pattern to find interactive element rule blocks
    const selectorPattern = new RegExp(
      `(${interactiveSelectors.join('|')})[^{]*\\{([^}]*)\\}`,
      'gi'
    );

    // Helper to convert to pixels for comparison
    const toPixels = (value, unit) => {
      const num = parseFloat(value);
      if (unit === 'rem' || unit === 'em') return num * 16;
      return num;
    };

    // Helper to extract padding and calculate effective size
    const getPaddingContribution = (ruleBlock) => {
      // Check for padding that adds to clickable area
      const paddingMatch = ruleBlock.match(/padding\s*:\s*(\d+(?:\.\d+)?)(px|rem|em)?/i);
      const paddingYMatch = ruleBlock.match(/padding-(?:top|bottom)\s*:\s*(\d+(?:\.\d+)?)(px|rem|em)?/i);
      const paddingXMatch = ruleBlock.match(/padding-(?:left|right)\s*:\s*(\d+(?:\.\d+)?)(px|rem|em)?/i);

      let paddingY = 0, paddingX = 0;
      if (paddingMatch) {
        const val = toPixels(paddingMatch[1], paddingMatch[2] || 'px');
        paddingY = val * 2;
        paddingX = val * 2;
      }
      if (paddingYMatch) paddingY = toPixels(paddingYMatch[1], paddingYMatch[2] || 'px') * 2;
      if (paddingXMatch) paddingX = toPixels(paddingXMatch[1], paddingXMatch[2] || 'px') * 2;

      return { paddingY, paddingX };
    };

    let match;
    while ((match = selectorPattern.exec(content)) !== null) {
      elementsFound++;
      const selector = match[1].replace(/\\/g, '');
      const ruleBlock = match[2];

      // Skip if inside a @media query for desktop/hover devices
      const beforeMatch = content.substring(0, match.index);
      const lastMediaQuery = beforeMatch.lastIndexOf('@media');
      if (lastMediaQuery !== -1) {
        const mediaSection = beforeMatch.substring(lastMediaQuery);
        // Skip desktop-only media queries
        if (/\(hover:\s*hover\)|\(min-width:\s*(768|1024|1200)px\)/i.test(mediaSection)) {
          continue;
        }
      }

      const heightMatch = ruleBlock.match(/(?:^|[^-])height\s*:\s*(\d+(?:\.\d+)?)(px|rem|em)/i);
      const widthMatch = ruleBlock.match(/(?:^|[^-])width\s*:\s*(\d+(?:\.\d+)?)(px|rem|em)/i);
      const minHeightMatch = ruleBlock.match(/min-height\s*:\s*(\d+(?:\.\d+)?)(px|rem|em)/i);
      const minWidthMatch = ruleBlock.match(/min-width\s*:\s*(\d+(?:\.\d+)?)(px|rem|em)/i);

      const { paddingY, paddingX } = getPaddingContribution(ruleBlock);

      // Check height
      if (heightMatch) {
        const heightPx = toPixels(heightMatch[1], heightMatch[2]);
        const effectiveHeight = heightPx + paddingY;

        // Skip if min-height compensates
        if (minHeightMatch && toPixels(minHeightMatch[1], minHeightMatch[2]) >= minSizeAA) {
          continue;
        }

        // Only flag if effective size is below AA requirement (24px)
        if (effectiveHeight < minSizeAA && effectiveHeight > 0) {
          issues.push(
            `[Error] Touch target below 24px minimum (WCAG AA). Users with motor impairments cannot reliably activate\n` +
            `  How to fix:\n` +
            `    - Ensure minimum 24x24px clickable area (44x44px recommended)\n` +
            `  WCAG 2.5.5: Target Size | See: https://www.w3.org/WAI/WCAG21/Understanding/target-size\n` +
            `  Found: <${selector}> (height: ${Math.round(effectiveHeight)}px effective)`
          );
        }
      }

      // Check width
      if (widthMatch) {
        const widthPx = toPixels(widthMatch[1], widthMatch[2]);
        const effectiveWidth = widthPx + paddingX;

        // Skip if min-width compensates
        if (minWidthMatch && toPixels(minWidthMatch[1], minWidthMatch[2]) >= minSizeAA) {
          continue;
        }

        // Only flag if effective size is below AA requirement (24px)
        if (effectiveWidth < minSizeAA && effectiveWidth > 0) {
          issues.push(
            `[Error] Touch target below 24px minimum (WCAG AA). Users with motor impairments cannot reliably activate\n` +
            `  How to fix:\n` +
            `    - Ensure minimum 24x24px clickable area (44x44px recommended)\n` +
            `  WCAG 2.5.5: Target Size | See: https://www.w3.org/WAI/WCAG21/Understanding/target-size\n` +
            `  Found: <${selector}> (width: ${Math.round(effectiveWidth)}px effective)`
          );
        }
      }
    }

    return { pass: issues.length === 0, issues, elementsFound };
  }
};
