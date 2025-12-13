const { format } = require('../core/errors');

module.exports = {
  name: 'skipLink',
  description: 'Pages with navigation should have skip links for keyboard users',
  tier: 'full',  // Changed from material - skip links are typically at app level, not component level
  type: 'html',
  weight: 2,  // Lower weight - usually handled at app level
  wcag: '2.4.1',

  check(content, filePath = '') {
    const issues = [];
    let elementsFound = 0;

    // Skip link check only applies to page-level templates, not components
    // Components have <nav> or <header> but skip links should be in the main app template
    // If filePath is empty (self-test mode), run the check based on content
    if (filePath) {
      const isComponentFile = /\.component\.html$/i.test(filePath) &&
                              !/app\.component|page|layout/i.test(filePath);

      // If this is a component file, skip the check entirely
      // Skip links are an app-level concern, not a component concern
      if (isComponentFile) {
        return { pass: true, issues: [] };
      }
    }

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
    // Extended regex to capture style attribute as well
    const linkRegex = /<a\s+([^>]*)href\s*=\s*["']([^"']*)["']([^>]*)>([^<]*)</gi;
    let linkMatch;
    const skipLinks = [];

    while ((linkMatch = linkRegex.exec(content)) !== null) {
      elementsFound++;
      const beforeHref = linkMatch[1];
      const href = linkMatch[2];
      const afterHref = linkMatch[3];
      const linkText = linkMatch[4].trim();
      const fullTag = linkMatch[0];
      const tagPosition = linkMatch.index;

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
        const attributes = beforeHref + afterHref;
        skipLinks.push({
          href,
          text: linkText,
          tag: fullTag,
          position: tagPosition,
          attributes,
          // Check if skip link has display:none in style attribute
          hasDisplayNone: /style\s*=\s*["'][^"']*display\s*:\s*none/i.test(attributes)
        });
      }
    }

    // Check if page has substantial navigation that would benefit from skip link
    // Only check for actual page templates with significant navigation
    const hasNavigation = /<nav\b/i.test(content);
    const hasHeader = /<header\b/i.test(content);
    const hasMultipleNavLinks = (content.match(/<a\s+[^>]*href/gi) || []).length >= 10;  // Increased threshold
    const hasRouterOutlet = /<router-outlet/i.test(content);  // App-level indicator

    // Find all <body> positions to establish document boundaries
    // This helps when multiple HTML documents are concatenated (like in verify files)
    const bodyRegex = /<body\b[^>]*>/gi;
    const bodyPositions = [];
    let bodyMatch;
    while ((bodyMatch = bodyRegex.exec(content)) !== null) {
      bodyPositions.push(bodyMatch.index);
    }
    // Add start of content as first boundary if no body tags
    if (bodyPositions.length === 0) {
      bodyPositions.push(0);
    }
    bodyPositions.push(content.length); // Add end as final boundary

    // Find all <nav> positions
    const navRegex = /<nav\b/gi;
    const navPositions = [];
    let navMatchResult;
    while ((navMatchResult = navRegex.exec(content)) !== null) {
      navPositions.push(navMatchResult.index);
    }

    // Collect all element IDs in the document for target validation
    const idMatches = content.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi);
    const existingIds = new Set();
    for (const match of idMatches) {
      existingIds.add(match[1]);
    }

    // Helper function to find the document boundary for a given position
    function getDocBoundary(position) {
      for (let i = 0; i < bodyPositions.length - 1; i++) {
        if (position >= bodyPositions[i] && position < bodyPositions[i + 1]) {
          return { start: bodyPositions[i], end: bodyPositions[i + 1] };
        }
      }
      return { start: 0, end: content.length };
    }

    // Helper function to find the first nav position within a document boundary
    function getFirstNavInDoc(docBoundary) {
      for (const navPos of navPositions) {
        if (navPos >= docBoundary.start && navPos < docBoundary.end) {
          return navPos;
        }
      }
      return Infinity;
    }

    // Analyze skip links for issues
    let hasValidSkipLink = false;

    for (const skipLink of skipLinks) {
      // Issue: Skip link is permanently hidden with display:none
      if (skipLink.hasDisplayNone) {
        issues.push(format('SKIP_LINK_HIDDEN', {
          element: skipLink.tag
        }));
        continue; // This skip link doesn't count as valid
      }

      // Issue: Skip link target ID doesn't exist in the document
      if (skipLink.href.startsWith('#')) {
        const targetId = skipLink.href.substring(1);
        // Only flag if we have IDs in the document and the target is missing
        // (Don't flag if the document has no IDs at all - target may be in another file)
        if (existingIds.size > 0 && targetId && !existingIds.has(targetId)) {
          issues.push(format('SKIP_LINK_BROKEN_TARGET', {
            element: skipLink.tag,
            target: targetId
          }));
          continue; // This skip link doesn't count as valid
        }
      }

      // Issue: Skip link appears after navigation (defeats the purpose)
      // Check within the same document boundary
      const docBoundary = getDocBoundary(skipLink.position);
      const firstNavInDoc = getFirstNavInDoc(docBoundary);
      if (firstNavInDoc !== Infinity && skipLink.position > firstNavInDoc) {
        issues.push(format('SKIP_LINK_AFTER_NAV', {
          element: skipLink.tag
        }));
        continue; // This skip link doesn't count as valid
      }

      // If we get here, the skip link is valid
      hasValidSkipLink = true;
    }

    // Only flag missing skip link if this looks like a main app template and has no valid skip link
    if (!hasValidSkipLink && hasRouterOutlet && (hasNavigation || (hasHeader && hasMultipleNavLinks))) {
      issues.push(format('SKIP_LINK_MISSING', {
        element: '<nav> or <header> without skip link'
      }));
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
