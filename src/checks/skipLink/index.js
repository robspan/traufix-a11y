module.exports = {
  name: 'skipLink',
  description: 'Pages with navigation should have skip links for keyboard users',
  tier: 'enhanced',
  type: 'html',
  weight: 7,
  wcag: '2.4.1',

  check(content) {
    const issues = [];

    // Common skip link href patterns (targeting main content)
    const skipLinkPatterns = [
      /#main\b/i,
      /#content\b/i,
      /#main-content\b/i,
      /#maincontent\b/i,
      /#main_content\b/i,
      /#skip\b/i,
      /#skip-nav\b/i,
      /#skip-navigation\b/i,
      /#skip-to-content\b/i,
      /#skip-to-main\b/i,
      /#skip-link\b/i,
      /#skiplink\b/i,
      /#page-content\b/i,
      /#primary\b/i,
      /#article\b/i
    ];

    // Common skip link text patterns (case insensitive)
    const skipLinkTextPatterns = [
      /skip\s*(to\s*)?(main\s*)?(content|navigation)/i,
      /go\s*to\s*(main\s*)?content/i,
      /jump\s*to\s*(main\s*)?content/i,
      /zum\s*(haupt)?inhalt/i,           // German: "to main content"
      /navigation\s*überspringen/i        // German: "skip navigation"
    ];

    // Find all anchor links with their full tag content
    const linkRegex = /<a\s+[^>]*href\s*=\s*["']([^"']*)["'][^>]*>([^<]*)</gi;
    let linkMatch;
    let foundSkipLink = false;
    let skipLinkPosition = -1;
    let skipLinkHref = '';
    let skipLinkTag = '';
    let firstFocusableCount = 0;

    // Count focusable elements before skip link
    const focusablePattern = /<(a\s+[^>]*href|button|input|select|textarea|[^>]*tabindex\s*=\s*["'][^-][^"']*["'])[^>]*>/gi;
    let focusableMatch;
    const focusablePositions = [];

    while ((focusableMatch = focusablePattern.exec(content)) !== null) {
      focusablePositions.push(focusableMatch.index);
    }

    // Reset regex
    linkRegex.lastIndex = 0;

    while ((linkMatch = linkRegex.exec(content)) !== null) {
      const href = linkMatch[1];
      const linkText = linkMatch[2].trim();

      // Check if this link matches skip link patterns (by href or text)
      let isSkipLink = false;

      for (const pattern of skipLinkPatterns) {
        if (pattern.test(href)) {
          isSkipLink = true;
          break;
        }
      }

      if (!isSkipLink) {
        for (const pattern of skipLinkTextPatterns) {
          if (pattern.test(linkText)) {
            isSkipLink = true;
            break;
          }
        }
      }

      if (isSkipLink) {
        foundSkipLink = true;
        skipLinkHref = href;
        skipLinkTag = linkMatch[0];

        // Determine position among focusable elements
        const linkPosition = linkMatch.index;
        skipLinkPosition = focusablePositions.filter(pos => pos < linkPosition).length + 1;

        // Skip links should be within first 3 focusable elements ideally
        if (skipLinkPosition > 5) {
          issues.push(
            `[Error] Skip link not positioned as first focusable element (found at position #${skipLinkPosition}). Keyboard users need to bypass repetitive navigation\n` +
            `  How to fix:\n` +
            `    - Move the skip link to the beginning of <body>\n` +
            `    - Place it before header/navigation elements\n` +
            `  WCAG 2.4.1: Bypass Blocks | See: https://www.w3.org/WAI/WCAG21/Techniques/general/G1\n` +
            `  Found: ${skipLinkTag}`
          );
        }
        break;
      }
    }

    // Check if page has substantial navigation that would benefit from skip link
    const hasNavigation = /<nav\b/i.test(content);
    const hasHeader = /<header\b/i.test(content);
    const hasMultipleNavLinks = (content.match(/<a\s+[^>]*href/gi) || []).length >= 5;

    // Only flag if no skip link found and there's substantial navigation
    if (!foundSkipLink && (hasNavigation || (hasHeader && hasMultipleNavLinks))) {
      issues.push(
        `[Error] Skip navigation link not found. Keyboard users need to bypass repetitive navigation\n` +
        `  How to fix:\n` +
        `    - Add <a href="#main">Skip to content</a> as first focusable element\n` +
        `    - Ensure <main id="main"> exists as the target\n` +
        `  WCAG 2.4.1: Bypass Blocks | See: https://www.w3.org/WAI/WCAG21/Techniques/general/G1\n` +
        `  Found: <nav> or <header> without skip link`
      );
    }

    // Check if skip link target exists (if we found a skip link with internal anchor)
    if (foundSkipLink && skipLinkHref.startsWith('#') && skipLinkHref.length > 1) {
      const targetId = skipLinkHref.substring(1);
      const targetPattern = new RegExp(`id\\s*=\\s*["']${targetId}["']`, 'i');
      if (!targetPattern.test(content)) {
        issues.push(
          `[Error] Skip link target "${skipLinkHref}" not found in document. Keyboard users need to bypass repetitive navigation\n` +
          `  How to fix:\n` +
          `    - Add id="${targetId}" to the main content element\n` +
          `    - Typically add to <main id="${targetId}">\n` +
          `  WCAG 2.4.1: Bypass Blocks | See: https://www.w3.org/WAI/WCAG21/Techniques/general/G1\n` +
          `  Found: ${skipLinkTag}`
        );
      }
    }

    return {
      pass: issues.length === 0,
      issues
    };
  }
};
