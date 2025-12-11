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
  name: 'clickWithoutKeyboard',
  description: 'Non-interactive elements with (click) must have keyboard handlers',
  tier: 'enhanced',
  type: 'html',
  weight: 7,
  wcag: '2.1.1',

  check(content) {
    const issues = [];

    // Regex to match opening tags of non-interactive elements with attributes
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
        // Check for keyboard event handlers
        const hasKeydown = /\(keydown(?:\.[\w.]+)?\)\s*=/.test(attributes);
        const hasKeyup = /\(keyup(?:\.[\w.]+)?\)\s*=/.test(attributes);
        const hasKeypress = /\(keypress(?:\.[\w.]+)?\)\s*=/.test(attributes);

        const hasKeyboardHandler = hasKeydown || hasKeyup || hasKeypress;

        if (!hasKeyboardHandler) {
          const lineNumber = getLineNumber(content, match.index);
          issues.push(
            `[Error] (click) handler without keyboard equivalent. Keyboard users cannot activate elements with mouse-only handlers\n` +
            `  How to fix:\n` +
            `    - Add (keydown.enter) or (keydown.space) handler\n` +
            `    - Use button element instead\n` +
            `  WCAG 2.1.1: Keyboard | See: https://www.w3.org/WAI/WCAG21/Understanding/keyboard\n` +
            `  Found: <${elementName}> at line ${lineNumber}`
          );
        }
      }
    }

    return { pass: issues.length === 0, issues };
  }
};
