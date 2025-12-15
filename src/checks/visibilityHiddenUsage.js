const { format } = require('../core/errors');

module.exports = {
  name: 'visibilityHiddenUsage',
  description: 'Identifies usage of visibility: hidden and suggests considering aria-hidden for screen reader handling',
  tier: 'full',
  type: 'scss',
  weight: 3,

  check(content) {
    // Early exit: no relevant elements, no issues
    if (!/visibility/i.test(content)) {
      return { pass: true, issues: [], elementsFound: 0 };
    }

    const issues = [];
    let elementsFound = 0;

    // Pattern to find visibility: hidden
    const visibilityHiddenPattern = /visibility\s*:\s*hidden/gi;

    const matches = content.match(visibilityHiddenPattern);

    if (matches && matches.length > 0) {
      elementsFound += matches.length;
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

          // Use the centralized error format for all cases
          const element = selector;
          issues.push(format('VISIBILITY_HIDDEN_FOCUS', { element }));
        });
      }
    }

    // Also check for visibility: collapse (similar concerns)
    const visibilityCollapsePattern = /visibility\s*:\s*collapse/gi;
    const collapseMatches = content.match(visibilityCollapsePattern);

    if (collapseMatches && collapseMatches.length > 0) {
      elementsFound += collapseMatches.length;
      const element = `visibility: collapse (${collapseMatches.length} instance(s))`;
      issues.push(format('VISIBILITY_HIDDEN_FOCUS', { element }));
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
