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
  tier: 'full',  // Changed from material - often false positives with modern focus patterns
  type: 'scss',
  weight: 2,  // Lower weight

  check(content) {
    const issues = [];
    let elementsFound = 0;

    // VALID PATTERN: :focus:not(:focus-visible) with outline:none
    // This is the progressive enhancement approach:
    // - Remove outline for mouse users (:focus:not(:focus-visible))
    // - Keep/add focus indicator for keyboard users (:focus-visible)
    // We should NOT flag this pattern as a violation

    // Check if the file uses the :focus-visible progressive enhancement pattern
    const usesFocusVisiblePattern = /:focus-visible[^{]*\{/i.test(content);
    const usesFocusNotFocusVisible = /:focus:not\(:focus-visible\)/i.test(content);

    // If using the modern focus-visible pattern, this file is likely handling focus correctly
    if (usesFocusVisiblePattern && usesFocusNotFocusVisible) {
      // Check that :focus-visible has a visible indicator
      const focusVisiblePattern = /:focus-visible[^{]*\{([^}]*)\}/gi;
      let hasVisibleFocusIndicator = false;

      let visibleMatch;
      while ((visibleMatch = focusVisiblePattern.exec(content)) !== null) {
        const ruleContent = visibleMatch[1];
        const hasOutline = /outline\s*:/i.test(ruleContent) && !/outline\s*:\s*(none|0|transparent)/i.test(ruleContent);
        const hasBoxShadow = /box-shadow\s*:/i.test(ruleContent) && !/box-shadow\s*:\s*none/i.test(ruleContent);
        const hasBorder = /border(?:-color)?\s*:/i.test(ruleContent) && !/border\s*:\s*(none|0)/i.test(ruleContent);

        if (hasOutline || hasBoxShadow || hasBorder) {
          hasVisibleFocusIndicator = true;
          break;
        }
      }

      // If using :focus-visible pattern with visible indicator, file is compliant
      if (hasVisibleFocusIndicator) {
        return { pass: true, issues: [], elementsFound };
      }
    }

    // Only flag plain :focus rules that remove outline without alternative
    // Skip :focus:not(:focus-visible) rules as they're part of the valid pattern
    const plainFocusRulePattern = /:focus(?!-visible)(?!:not\(:focus-visible\))[^{]*\{([^}]*)\}/gi;

    let match;
    while ((match = plainFocusRulePattern.exec(content)) !== null) {
      elementsFound++;
      const fullMatch = match[0];
      const ruleContent = match[1];
      const lineNumber = getLineNumber(content, match.index);

      // Skip if this is part of :focus:not(:focus-visible) pattern
      if (/:focus:not\(:focus-visible\)/i.test(fullMatch)) {
        continue;
      }

      // Check if this focus rule removes the outline
      const removesOutline = /outline(?:-style|-width)?\s*:\s*(none|0|transparent)/i.test(ruleContent);

      if (removesOutline) {
        // Check for alternative focus indicator in the same rule
        const hasBoxShadow = /box-shadow\s*:/i.test(ruleContent) && !/box-shadow\s*:\s*none/i.test(ruleContent);
        const hasBorder = /border(?:-color)?\s*:/i.test(ruleContent) && !/border\s*:\s*(none|0)/i.test(ruleContent);
        const hasBackground = /background(?:-color)?\s*:/i.test(ruleContent);
        const hasTextDecoration = /text-decoration\s*:/i.test(ruleContent);
        const hasRingOrShadow = /ring|shadow/i.test(ruleContent);

        if (!hasBoxShadow && !hasBorder && !hasBackground && !hasTextDecoration && !hasRingOrShadow) {
          // Extract selector for better error message
          const selectorMatch = fullMatch.match(/([^{]+)\{/);
          const selector = selectorMatch ? selectorMatch[1].trim() : ':focus rule';

          issues.push(format('FOCUS_OUTLINE_REMOVED', { element: selector, line: lineNumber }));
        }
      }
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
