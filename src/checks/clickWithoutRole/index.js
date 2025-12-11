/**
 * List of non-interactive elements that commonly get (click) handlers
 * but need keyboard support and proper roles
 */
const NON_INTERACTIVE_ELEMENTS = [
  'div', 'span', 'p', 'section', 'article', 'header', 'footer', 'main',
  'aside', 'nav', 'figure', 'figcaption', 'li', 'ul', 'ol', 'dl', 'dt', 'dd',
  'table', 'tr', 'td', 'th', 'tbody', 'thead', 'tfoot', 'img', 'label'
];

/**
 * Gets the line number for a given index in the HTML string
 */
function getLineNumber(html, index) {
  const upToIndex = html.substring(0, index);
  const lines = upToIndex.split('\n');
  return lines.length;
}

module.exports = {
  name: 'clickWithoutRole',
  description: 'Non-interactive elements with (click) need role and tabindex',
  tier: 'enhanced',
  type: 'html',
  weight: 7,
  wcag: '4.1.2',

  check(content) {
    const issues = [];

    // Regex to match opening tags of non-interactive elements
    const tagPattern = new RegExp(
      `<(${NON_INTERACTIVE_ELEMENTS.join('|')})\\b([^>]*)>`,
      'gi'
    );

    let match;
    while ((match = tagPattern.exec(content)) !== null) {
      const elementName = match[1].toLowerCase();
      const attributes = match[2];

      // Check if this element has a (click) handler
      const hasClick = /\(click\)\s*=/.test(attributes);

      if (hasClick) {
        // Check for role attribute (static or bound)
        const hasRole = /\brole\s*=/.test(attributes) || /\[attr\.role\]\s*=/.test(attributes);

        // Check for tabindex attribute (static or bound)
        const hasTabindex = /\btabindex\s*=/.test(attributes) ||
                            /\[attr\.tabindex\]\s*=/.test(attributes) ||
                            /\[tabindex\]\s*=/.test(attributes);

        const missingAttributes = [];
        if (!hasRole) missingAttributes.push('role="button"');
        if (!hasTabindex) missingAttributes.push('tabindex="0"');

        if (missingAttributes.length > 0) {
          const lineNumber = getLineNumber(content, match.index);
          issues.push(
            `[Error] Non-interactive element with (click) missing role and tabindex. Screen readers don't announce clickable divs/spans as interactive\n` +
            `  How to fix:\n` +
            `    - Add role="button" tabindex="0"\n` +
            `    - Use <button> element instead\n` +
            `  WCAG 4.1.2: Name, Role, Value | See: https://www.w3.org/WAI/ARIA/apg/patterns/button/\n` +
            `  Found: <${elementName}> at line ${lineNumber}`
          );
        }
      }
    }

    return { pass: issues.length === 0, issues };
  }
};
