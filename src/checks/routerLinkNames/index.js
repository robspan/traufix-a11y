const { format } = require('../../core/errors');

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
  tier: 'material',
  type: 'html',
  weight: 7,
  wcag: '2.4.4',

  check(content) {
    const issues = [];
    let elementsFound = 0;

    // Match elements with routerLink attribute (static or bound)
    // Captures: element name, attributes, inner content (for self-closing detection)
    const routerLinkPattern = /<(\w+)\b([^>]*(?:routerLink|\[routerLink\])[^>]*)>([\s\S]*?)<\/\1>|<(\w+)\b([^>]*(?:routerLink|\[routerLink\])[^>]*)\/>/gi;

    let match;
    while ((match = routerLinkPattern.exec(content)) !== null) {
      elementsFound++;
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
        issues.push(format('ROUTER_LINK_MISSING_NAME', {
          element: `<${elementName}>`,
          line: lineNumber
        }));
      }
    }

    return { pass: issues.length === 0, issues, elementsFound };
  }
};
