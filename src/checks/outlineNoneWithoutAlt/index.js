const { format } = require('../../core/errors');

/**
 * Gets the line number for a given index in the content string
 */
function getLineNumber(content, index) {
  const upToIndex = content.substring(0, index);
  const lines = upToIndex.split('\n');
  return lines.length;
}

module.exports = {
  name: 'outlineNoneWithoutAlt',
  description: 'Detects outline removal without alternative focus indicator',
  tier: 'material',
  type: 'scss',
  weight: 3,

  check(content) {
    const issues = [];

    // Patterns to detect focus indicator removal:
    // - outline: none
    // - outline: 0
    // - outline: transparent
    // - outline-style: none
    // - outline-width: 0
    const outlineRemovalPattern = /outline(?:-style|-width)?\s*:\s*(none|0|transparent)(\s*!important)?\s*;/gi;

    // Pattern to find :focus pseudo-class with alternative styles
    // Alternative indicators: box-shadow, border (not border-radius), background color changes, text-decoration
    const focusWithAltPattern = /:focus(?:-visible|-within)?[^{]*\{[^}]*(box-shadow|border\s*:|border-color|background\s*:|background-color|text-decoration)[^}]*\}/gi;

    // Find all outline removal occurrences
    const outlineMatches = content.match(outlineRemovalPattern);

    if (outlineMatches && outlineMatches.length > 0) {
      // Check if there are alternative focus styles in the file
      const hasFocusAlt = focusWithAltPattern.test(content);

      if (!hasFocusAlt) {
        issues.push(format('FOCUS_OUTLINE_REMOVED', { element: `${outlineMatches.length} instance(s) of outline removal` }));
      }
    }

    // Critical check: outline removal directly in :focus rules without alternative
    // This pattern matches :focus, :focus-visible, :focus-within rules
    const focusRulePattern = /:focus(?:-visible|-within)?[^{]*\{([^}]*)\}/gi;

    let match;
    while ((match = focusRulePattern.exec(content)) !== null) {
      const ruleContent = match[1];
      const lineNumber = getLineNumber(content, match.index);

      // Check if this focus rule removes the outline
      const removesOutline = /outline(?:-style|-width)?\s*:\s*(none|0|transparent)/i.test(ruleContent);

      if (removesOutline) {
        // Check for alternative focus indicator in the same rule
        const hasBoxShadow = /box-shadow\s*:/i.test(ruleContent) && !/box-shadow\s*:\s*none/i.test(ruleContent);
        const hasBorder = /border(?:-color)?\s*:/i.test(ruleContent) && !/border\s*:\s*(none|0)/i.test(ruleContent);
        const hasBackground = /background(?:-color)?\s*:/i.test(ruleContent);
        const hasTextDecoration = /text-decoration\s*:/i.test(ruleContent);

        if (!hasBoxShadow && !hasBorder && !hasBackground && !hasTextDecoration) {
          // Extract selector for better error message
          const selectorMatch = match[0].match(/([^{]+)\{/);
          const selector = selectorMatch ? selectorMatch[1].trim() : ':focus rule';

          issues.push(format('FOCUS_OUTLINE_REMOVED', { element: selector, line: lineNumber }));
        }
      }
    }

    return {
      pass: issues.length === 0,
      issues
    };
  }
};
