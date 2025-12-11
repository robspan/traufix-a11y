/**
 * Gets the line number for a given index in the HTML string
 */
function getLineNumber(html, index) {
  const upToIndex = html.substring(0, index);
  const lines = upToIndex.split('\n');
  return lines.length;
}

module.exports = {
  name: 'routerLinkNames',
  description: 'Elements with routerLink must have accessible names',
  tier: 'enhanced',
  type: 'html',
  weight: 7,
  wcag: '2.4.4',

  check(content) {
    const issues = [];

    // Match elements with routerLink attribute (static or bound)
    // Captures: element name, attributes, inner content (for self-closing detection)
    const routerLinkPattern = /<(\w+)\b([^>]*(?:routerLink|\[routerLink\])[^>]*)>([\s\S]*?)<\/\1>|<(\w+)\b([^>]*(?:routerLink|\[routerLink\])[^>]*)\/>/gi;

    let match;
    while ((match = routerLinkPattern.exec(content)) !== null) {
      const elementName = match[1] || match[4];
      const attributes = match[2] || match[5];
      const innerContent = match[3] || '';

      // Check for accessible name sources
      const hasAriaLabel = /aria-label\s*=/.test(attributes) || /\[attr\.aria-label\]\s*=/.test(attributes);
      const hasAriaLabelledby = /aria-labelledby\s*=/.test(attributes) || /\[attr\.aria-labelledby\]\s*=/.test(attributes);
      const hasTitle = /\btitle\s*=/.test(attributes) || /\[attr\.title\]\s*=/.test(attributes);

      // Check for text content (excluding whitespace-only and Angular comments)
      const strippedContent = innerContent
        .replace(/<!--[\s\S]*?-->/g, '') // Remove HTML comments
        .replace(/<[^>]+>/g, '')          // Remove HTML tags
        .replace(/\{\{[^}]+\}\}/g, 'text') // Treat interpolations as text
        .trim();

      const hasTextContent = strippedContent.length > 0;

      // Check for image with alt text inside
      const hasImageWithAlt = /<img[^>]+alt\s*=\s*["'][^"']+["'][^>]*>/i.test(innerContent);

      // Check for visually hidden text patterns
      const hasVisuallyHiddenText = /class\s*=\s*["'][^"']*(?:sr-only|visually-hidden|cdk-visually-hidden)[^"']*["']/i.test(innerContent);

      const hasAccessibleName = hasAriaLabel || hasAriaLabelledby || hasTitle ||
                                hasTextContent || hasImageWithAlt || hasVisuallyHiddenText;

      if (!hasAccessibleName) {
        const lineNumber = getLineNumber(content, match.index);
        issues.push(
          `[Error] routerLink element missing accessible text. Screen readers cannot announce link destination without text\n` +
          `  How to fix:\n` +
            `    - Add text content\n` +
            `    - Add aria-label attribute\n` +
            `    - Use meaningful link text\n` +
          `  WCAG 2.4.4: Link Purpose (In Context) | See: https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context\n` +
          `  Found: <${elementName}> at line ${lineNumber}`
        );
      }
    }

    return { pass: issues.length === 0, issues };
  }
};
