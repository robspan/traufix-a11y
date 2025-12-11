module.exports = {
  name: 'visibilityHiddenUsage',
  description: 'Identifies usage of visibility: hidden and suggests considering aria-hidden for screen reader handling',
  tier: 'full',
  type: 'scss',
  weight: 3,

  check(content) {
    const issues = [];

    // Pattern to find visibility: hidden
    const visibilityHiddenPattern = /visibility\s*:\s*hidden/gi;

    const matches = content.match(visibilityHiddenPattern);

    if (matches && matches.length > 0) {
      // Find the selectors using visibility: hidden
      const selectorPattern = /([^{}]+)\{[^}]*visibility\s*:\s*hidden[^}]*\}/gi;
      const selectorMatches = content.match(selectorPattern);

      if (selectorMatches) {
        // Provide context-aware suggestions
        selectorMatches.forEach((match) => {
          const selectorMatch = match.match(/^([^{]+)\{/);
          const selector = selectorMatch ? selectorMatch[1].trim() : 'unknown';

          // Check if it's used for animation/transition (common valid use case)
          const isForAnimation = /transition|animation/i.test(match);

          // Check if it's a utility/helper class
          const isUtilityClass = /\.(hidden|invisible|visually-hidden|sr-only|screen-reader)/i.test(selector);

          if (isUtilityClass) {
            // This is likely intentional, provide informational message
            issues.push(
              `[Info] visibility: hidden found in utility class. This hides content visually but the element still takes up space and may affect focus order.\n` +
              `  How to fix:\n` +
              `    - For screen reader hiding: Add aria-hidden="true" in HTML alongside CSS hiding\n` +
              `    - For complete hiding (no space): Use display: none instead\n` +
              `    - Ensure hidden focusable elements don't disrupt keyboard navigation\n` +
              `  WCAG 1.3.2: Meaningful Sequence\n` +
              `  WCAG 2.4.3: Focus Order\n` +
              `  Found: ${selector}`
            );
          } else if (isForAnimation) {
            // Animation use case is generally okay, but mention it
            issues.push(
              `[Info] visibility: hidden found with animation/transition. While this is a common pattern, hidden states must be properly communicated to assistive technologies.\n` +
              `  How to fix:\n` +
              `    - Add aria-hidden="true" when element is visibility: hidden\n` +
              `    - Use aria-live regions for dynamic content changes\n` +
              `    - Ensure focus management during transitions\n` +
              `    - Test that keyboard focus doesn't move to hidden elements\n` +
              `  WCAG 1.3.2: Meaningful Sequence\n` +
              `  WCAG 2.4.3: Focus Order\n` +
              `  Found: ${selector}`
            );
          } else {
            issues.push(
              `[Warning] visibility: hidden may cause focus order and screen reader issues. The element remains in the DOM and takes up space, potentially disrupting logical reading and navigation order.\n` +
              `  How to fix:\n` +
              `    - For complete hiding: Use display: none (hides from everyone, no space)\n` +
              `    - For visual-only hiding (keep for screen readers): Use .sr-only/visually-hidden pattern\n` +
              `    - For screen reader hiding: Add aria-hidden="true" in HTML alongside CSS hiding\n` +
              `    - Ensure hidden focusable elements are removed from tab order with tabindex="-1"\n` +
              `  WCAG 1.3.2: Meaningful Sequence\n` +
              `  WCAG 2.4.3: Focus Order\n` +
              `  Found: ${selector}`
            );
          }
        });
      }
    }

    // Also check for visibility: collapse (similar concerns)
    const visibilityCollapsePattern = /visibility\s*:\s*collapse/gi;
    const collapseMatches = content.match(visibilityCollapsePattern);

    if (collapseMatches && collapseMatches.length > 0) {
      issues.push(
        `[Warning] visibility: collapse found (${collapseMatches.length} instance(s)). This behaves like visibility: hidden for most elements (except table rows/columns) and can cause focus order issues.\n` +
        `  How to fix:\n` +
        `    - Add aria-hidden="true" to inform screen readers of collapsed state\n` +
        `    - For tables: Ensure collapsed rows/columns are properly announced\n` +
        `    - Use aria-expanded to indicate collapsible content state\n` +
        `    - Ensure keyboard focus doesn't land on collapsed elements\n` +
        `  WCAG 1.3.2: Meaningful Sequence\n` +
        `  WCAG 2.4.3: Focus Order\n` +
        `  WCAG 4.1.2: Name, Role, Value (for state communication)`
      );
    }

    return {
      pass: issues.length === 0,
      issues
    };
  }
};
