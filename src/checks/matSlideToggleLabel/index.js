module.exports = {
  name: 'matSlideToggleLabel',
  description: 'Check that mat-slide-toggle has an accessible label',
  tier: 'full',
  type: 'html',
  weight: 3,

  check(content) {
    const issues = [];

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
        issues.push(
          `[Error] Line ${lineNumber}: mat-slide-toggle #${toggleIndex} is missing an accessible name. Screen readers cannot identify the toggle's purpose without a label.\n` +
          `  How to fix:\n` +
          `    - Add text content inside the element: <mat-slide-toggle>Enable notifications</mat-slide-toggle>\n` +
          `    - Or add aria-label="Description" attribute\n` +
          `    - Or use aria-labelledby="id" to reference an existing label element\n` +
          `  WCAG 4.1.2: Name, Role, Value | See: https://material.angular.io/components/slide-toggle/overview#accessibility\n` +
          `  Found: ${snippet}`
        );
      }
    }

    return {
      pass: issues.length === 0,
      issues
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
