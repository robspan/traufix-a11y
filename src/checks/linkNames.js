const { format } = require('../core/errors');

// Pre-compiled regex patterns
const EARLY_EXIT = /<a\b/i;
const LINK_REGEX = /<a[^>]*>[\s\S]*?<\/a>/gi;
const ARIA_LABEL = /aria-label=/i;
const ARIA_LABELLEDBY = /aria-labelledby=/i;
const TITLE_ATTR = /\btitle=/i;
const STRIP_ICONS = /<(?:mat-icon|svg)[^>]*>[\s\S]*?<\/(?:mat-icon|svg)>/gi;
const STRIP_TAGS = /<[^>]+>/g;
const ANGULAR_BINDING = /\{\{[^}]+\}\}/g;

// Generic text patterns - pre-compiled once
const GENERIC_TEXTS = /^(?:click\s+here|here|link|read\s+more|more|continue)$/i;

module.exports = {
  name: 'linkNames',
  description: 'Links have accessible names',
  tier: 'basic',
  type: 'html',
  weight: 10,
  wcag: '2.4.4',

  check(content) {
    // Early exit: no anchor elements, no issues
    if (!EARLY_EXIT.test(content)) {
      return { pass: true, issues: [], elementsFound: 0 };
    }

    const issues = [];

    // Reset regex state
    LINK_REGEX.lastIndex = 0;

    const links = content.match(LINK_REGEX) || [];
    const elementsFound = links.length;

    for (const link of links) {
      const hasAriaLabel = ARIA_LABEL.test(link);
      const hasAriaLabelledBy = ARIA_LABELLEDBY.test(link);
      const hasTitle = TITLE_ATTR.test(link);

      // Reset global regex state before each use
      STRIP_ICONS.lastIndex = 0;

      const textContent = link
        .replace(STRIP_ICONS, '')
        .replace(STRIP_TAGS, '')
        .replace(ANGULAR_BINDING, 'TEXT')
        .trim();

      if (!textContent && !hasAriaLabel && !hasAriaLabelledBy && !hasTitle) {
        const snippet = link.substring(0, 80).replace(/\s+/g, ' ').trim();
        const truncated = link.length > 80 ? '...' : '';
        issues.push(format('LINK_MISSING_NAME', { element: `${snippet}${truncated}` }));
      } else if (textContent && GENERIC_TEXTS.test(textContent)) {
        const snippet = link.substring(0, 80).replace(/\s+/g, ' ').trim();
        const truncated = link.length > 80 ? '...' : '';
        issues.push(format('LINK_GENERIC_TEXT', { text: textContent, element: `${snippet}${truncated}` }));
      }
    }

    return { pass: issues.length === 0, issues, elementsFound };
  }
};
