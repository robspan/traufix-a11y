const { format } = require('../../core/errors');

module.exports = {
  name: 'linkNames',
  description: 'Links have accessible names',
  tier: 'basic',
  type: 'html',
  weight: 10,
  wcag: '2.4.4',

  check(content) {
    const issues = [];
    let elementsFound = 0;
    const linkRegex = /<a[^>]*>[\s\S]*?<\/a>/gi;
    const links = content.match(linkRegex) || [];

    elementsFound = links.length;

    // Generic text patterns to check for
    const genericTexts = [
      /^click\s+here$/i,
      /^here$/i,
      /^link$/i,
      /^read\s+more$/i,
      /^more$/i,
      /^continue$/i,
    ];

    for (const link of links) {
      const hasAriaLabel = /aria-label=/i.test(link);
      const hasAriaLabelledBy = /aria-labelledby=/i.test(link);
      const hasTitle = /\btitle=/i.test(link);

      const textContent = link
        .replace(/<mat-icon[^>]*>[\s\S]*?<\/mat-icon>/gi, '')
        .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/\{\{[^}]+\}\}/g, 'TEXT')
        .trim();

      if (!textContent && !hasAriaLabel && !hasAriaLabelledBy && !hasTitle) {
        const snippet = link.substring(0, 80).replace(/\s+/g, ' ').trim();
        const truncated = link.length > 80 ? '...' : '';
        issues.push(format('LINK_MISSING_NAME', { element: `${snippet}${truncated}` }));
      } else if (textContent && genericTexts.some(pattern => pattern.test(textContent))) {
        // Check for generic text
        const snippet = link.substring(0, 80).replace(/\s+/g, ' ').trim();
        const truncated = link.length > 80 ? '...' : '';
        issues.push(format('LINK_GENERIC_TEXT', { text: textContent, element: `${snippet}${truncated}` }));
      }
    }

    return { pass: issues.length === 0, issues, elementsFound };
  }
};
