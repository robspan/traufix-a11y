module.exports = {
  name: 'focusWithinSupport',
  description: 'Suggests using :focus-within for complex interactive containers with nested focusable elements',
  tier: 'full',
  type: 'scss',
  weight: 3,

  check(content) {
    // Early exit: no relevant elements, no issues
    if (!/:focus-within/i.test(content)) {
      return { pass: true, issues: [], elementsFound: 0 };
    }

    const issues = [];
    let elementsFound = 0;

    // Pattern to detect complex interactive containers
    // These are selectors that contain nested interactive elements (links, buttons, inputs)
    const complexContainerPatterns = [
      // Nav containers with links
      /(?:nav|\.nav[a-z-]*|\.menu[a-z-]*|\.navigation)\s*\{[^}]*\}[\s\S]*?(?:a|button)\s*\{/gi,
      // Card/list item containers with interactive elements
      /(?:\.card[a-z-]*|\.list-item[a-z-]*|\.item[a-z-]*)\s*\{[^}]*\}[\s\S]*?(?:a|button|input)\s*\{/gi,
      // Dropdown containers
      /(?:\.dropdown[a-z-]*|\.select[a-z-]*)\s*\{/gi,
      // Form groups with multiple inputs
      /(?:\.form-group[a-z-]*|\.input-group[a-z-]*|fieldset)\s*\{/gi,
      // Tab containers
      /(?:\.tab[a-z-]*|\.tabs[a-z-]*)\s*\{/gi,
      // Accordion containers
      /(?:\.accordion[a-z-]*|\.collapse[a-z-]*|\.expandable[a-z-]*)\s*\{/gi,
    ];

    // Check if :focus-within is already being used
    const hasFocusWithin = /:focus-within/i.test(content);

    // Check if child elements have proper :focus styles (alternative to :focus-within)
    const hasChildFocusStyles = /[\w-]+\s+(?:a|button|input):focus\s*\{[^}]*(?:outline|box-shadow|border|background)/i.test(content);

    // Track detected complex patterns
    const detectedPatterns = [];

    for (const pattern of complexContainerPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        elementsFound += matches.length;
        matches.forEach(match => {
          // Extract the selector name for reporting
          const selectorMatch = match.match(/(?:nav|\.[\w-]+|fieldset)/i);
          if (selectorMatch) {
            const selector = selectorMatch[0];
            // Skip non-interactive containers (text-block, decorative, simple, wrapper, etc.)
            if (!/text|decorative|static|simple|wrapper/i.test(selector)) {
              detectedPatterns.push(selector);
            }
          }
        });
      }
    }

    // Remove duplicates
    const uniquePatterns = [...new Set(detectedPatterns)];

    // Only flag if:
    // 1. Has complex patterns
    // 2. No :focus-within
    // 3. No child :focus styles providing visual feedback
    if (uniquePatterns.length > 0 && !hasFocusWithin && !hasChildFocusStyles) {
      const containerList = uniquePatterns.slice(0, 3).join(', ') + (uniquePatterns.length > 3 ? '...' : '');
      issues.push(
        `[Info] Complex interactive containers without :focus-within. Keyboard users may not see clear visual indication when navigating nested focusable elements.\n` +
        `  How to fix:\n` +
        `    - Add :focus-within pseudo-class to container selectors\n` +
        `    - Or ensure child elements (a, button, input) have visible :focus styles\n` +
        `    - Apply visual styles (border, background, shadow) when children are focused\n` +
        `    - Example: .container:focus-within { outline: 2px solid blue; }\n` +
        `    - Test with keyboard navigation to ensure focus is always visible\n` +
        `  WCAG 2.4.7: Focus Visible\n` +
        `  Found: Complex containers (${containerList})`
      );
    }

    // Check for ineffective :focus-within styles (false-negative detection)
    // These have :focus-within but the styles are invisible/ineffective
    const focusWithinMatches = [...content.matchAll(/([\w.-]+):focus-within\s*\{([^}]*)\}/gi)];
    elementsFound += focusWithinMatches.length;
    for (const match of focusWithinMatches) {
      const selector = match[1];
      const styles = match[2];

      // Check for transparent colors
      const hasTransparent = /(?:outline|border|box-shadow)[^;]*transparent/i.test(styles);

      // Check for rgba with 0 alpha (e.g., rgba(0, 0, 0, 0))
      const hasZeroAlpha = /rgba\s*\([^)]*,\s*0\s*\)/i.test(styles);

      // Check for outline-color or border-color matching white background
      // This is a heuristic - checking if outline-color is #fff or #ffffff
      const hasWhiteOnWhite = /(?:outline-color|border-color)\s*:\s*(?:#fff(?:fff)?|white|rgb\s*\(\s*255\s*,\s*255\s*,\s*255\s*\))/i.test(styles);

      if (hasTransparent || hasZeroAlpha || hasWhiteOnWhite) {
        issues.push(
          `[Warning] Ineffective :focus-within styles on "${selector}". The focus indication is invisible.\n` +
          `  How to fix:\n` +
          `    - Use a visible color for outline, border, or box-shadow\n` +
          `    - Ensure sufficient contrast between focus indicator and background\n` +
          `    - Avoid transparent, rgba with 0 alpha, or same-as-background colors\n` +
          `    - Example: .container:focus-within { outline: 2px solid blue; }\n` +
          `  WCAG 2.4.7: Focus Visible\n` +
          `  Found: ${match[0].substring(0, 60)}...`
        );
      }
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
