const { format } = require('../core/errors');

module.exports = {
  name: 'matSlideToggleLabel',
  description: 'Check that mat-slide-toggle has an accessible label',
  tier: 'full',
  type: 'html',
  weight: 3,

  check(content) {
    // Early exit: no relevant elements, no issues
    if (!/mat-slide-toggle/i.test(content)) {
      return { pass: true, issues: [], elementsFound: 0 };
    }

    const issues = [];
    let elementsFound = 0;

    // Find line number for a match position
    const getLineNumber = (pos) => {
      return content.substring(0, pos).split('\n').length;
    };

    // Store all matches with their positions
    const allMatches = [];

    // Match non-self-closing mat-slide-toggle elements
    // Exclude self-closing tags by using negative lookahead before >
    const matSlideToggleRegex = /<mat-slide-toggle(?![a-z-])([^>]*?)(?<!\/)>([\s\S]*?)<\/mat-slide-toggle>/gi;
    let match;
    while ((match = matSlideToggleRegex.exec(content)) !== null) {
      allMatches.push({
        index: match.index,
        fullMatch: match[0],
        attrs: match[1] || '',
        content: match[2] || ''
      });
    }

    // Match self-closing mat-slide-toggle elements
    const selfClosingRegex = /<mat-slide-toggle(?![a-z-])([^>]*?)\/>/gi;
    while ((match = selfClosingRegex.exec(content)) !== null) {
      allMatches.push({
        index: match.index,
        fullMatch: match[0],
        attrs: match[1] || '',
        content: ''
      });
    }

    // Sort by position in file
    allMatches.sort((a, b) => a.index - b.index);

    let toggleIndex = 0;

    for (const matchInfo of allMatches) {
      toggleIndex++;
      elementsFound++;
      const fullMatch = matchInfo.fullMatch;
      const toggleAttrs = matchInfo.attrs;
      const toggleContent = matchInfo.content;
      const lineNumber = getLineNumber(matchInfo.index);

      // Check for aria-label (standard and Angular binding)
      const hasAriaLabel = /\baria-label\s*=\s*["'][^"']+["']/i.test(toggleAttrs) ||
                           /\[aria-label\]\s*=\s*["'][^"']+["']/i.test(toggleAttrs) ||
                           /\[attr\.aria-label\]\s*=\s*["'][^"']+["']/i.test(toggleAttrs);

      // Check for aria-labelledby (standard and Angular binding)
      const hasAriaLabelledby = /\baria-labelledby\s*=\s*["'][^"']+["']/i.test(toggleAttrs) ||
                                /\[aria-labelledby\]\s*=\s*["'][^"']+["']/i.test(toggleAttrs) ||
                                /\[attr\.aria-labelledby\]\s*=\s*["'][^"']+["']/i.test(toggleAttrs);

      // Check for text content inside the element
      const hasTextContent = hasNonWhitespaceTextContent(toggleContent);

      if (!hasAriaLabel && !hasAriaLabelledby && !hasTextContent) {
        const snippet = getSnippet(fullMatch);
        issues.push(format('MAT_SLIDE_TOGGLE_MISSING_LABEL', { element: snippet, line: lineNumber }));
      }
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};

/**
 * Check if content has non-whitespace text
 * This handles text content, Angular interpolations, and excludes nested tags
 */
function hasNonWhitespaceTextContent(content) {
  // Remove all HTML tags to get only text content
  let text = content
    // Remove nested HTML elements
    .replace(/<[^>]+>/g, ' ')
    // Angular interpolation counts as text content
    .replace(/\{\{[^}]+\}\}/g, ' TEXT ')
    // Clean up whitespace
    .replace(/\s+/g, ' ')
    .trim();

  return text.length > 0;
}

/**
 * Get a clean snippet of the element for error reporting
 */
function getSnippet(element) {
  return element
    .substring(0, 100)
    .replace(/\s+/g, ' ')
    .replace(/[\n\r]/g, '')
    .trim() + (element.length > 100 ? '...' : '');
}
