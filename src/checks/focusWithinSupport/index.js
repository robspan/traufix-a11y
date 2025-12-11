module.exports = {
  name: 'focusWithinSupport',
  description: 'Suggests using :focus-within for complex interactive containers with nested focusable elements',
  tier: 'full',
  type: 'scss',
  weight: 3,

  check(content) {
    const issues = [];

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

    // Track detected complex patterns
    const detectedPatterns = [];

    for (const pattern of complexContainerPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          // Extract the selector name for reporting
          const selectorMatch = match.match(/(?:nav|\.[\w-]+|fieldset)/i);
          if (selectorMatch) {
            detectedPatterns.push(selectorMatch[0]);
          }
        });
      }
    }

    // Remove duplicates
    const uniquePatterns = [...new Set(detectedPatterns)];

    if (uniquePatterns.length > 0 && !hasFocusWithin) {
      issues.push(
        `[Info] Complex interactive containers without :focus-within. Keyboard users may not see clear visual indication when navigating nested focusable elements.\n` +
        `  How to fix:\n` +
        `    - Add :focus-within pseudo-class to container selectors\n` +
        `    - Apply visual styles (border, background, shadow) when children are focused\n` +
        `    - Example: .container:focus-within { outline: 2px solid blue; }\n` +
        `    - Test with keyboard navigation to ensure focus is always visible\n` +
        `  WCAG 2.4.7: Focus Visible\n` +
        `  Found: Complex containers (${uniquePatterns.slice(0, 3).join(', ')}${uniquePatterns.length > 3 ? '...' : ''})`
      );
    }

    return {
      pass: issues.length === 0,
      issues
    };
  }
};
