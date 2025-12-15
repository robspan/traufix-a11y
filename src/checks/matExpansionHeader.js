const { format } = require('../core/errors');

module.exports = {
  name: 'matExpansionHeader',
  description: 'Check that mat-expansion-panel has a mat-expansion-panel-header with accessible content',
  tier: 'full',
  type: 'html',
  weight: 5, // Increased weight - expansion panels are important for navigation

  check(content) {
    // Early exit: no relevant elements, no issues
    if (!/mat-expansion/i.test(content)) {
      return { pass: true, issues: [], elementsFound: 0 };
    }

    const issues = [];
    let elementsFound = 0;

    /**
     * Check if an element has an accessible label via aria attributes
     */
    function hasAriaLabel(elementHtml) {
      // Static aria-label
      const hasStaticAriaLabel = /aria-label\s*=\s*["'][^"']+["']/i.test(elementHtml);
      // Angular bound aria-label
      const hasBoundAriaLabel = /\[aria-label\]\s*=\s*["'][^"']+["']/i.test(elementHtml) ||
                                /\[attr\.aria-label\]\s*=\s*["'][^"']+["']/i.test(elementHtml);
      // aria-labelledby
      const hasAriaLabelledby = /aria-labelledby\s*=\s*["'][^"']+["']/i.test(elementHtml) ||
                                /\[aria-labelledby\]\s*=\s*["'][^"']+["']/i.test(elementHtml);

      return hasStaticAriaLabel || hasBoundAriaLabel || hasAriaLabelledby;
    }

    /**
     * Extract meaningful text content from HTML
     */
    function getTextContent(html) {
      return html
        .replace(/<[^>]*>/g, '')           // Remove HTML tags
        .replace(/\{\{[^}]*\}\}/g, 'placeholder')  // Treat interpolations as content
        .replace(/\s+/g, ' ')              // Normalize whitespace
        .trim();
    }

    /**
     * Check if header has proper panel title/description structure
     */
    function hasPanelStructure(headerContent) {
      // mat-panel-title with content
      const titleMatch = /<mat-panel-title[^>]*>([\s\S]*?)<\/mat-panel-title>/i.exec(headerContent);
      if (titleMatch && getTextContent(titleMatch[1])) {
        return true;
      }

      // mat-panel-description can also provide accessible name if title is empty
      const descMatch = /<mat-panel-description[^>]*>([\s\S]*?)<\/mat-panel-description>/i.exec(headerContent);
      if (descMatch && getTextContent(descMatch[1])) {
        return true;
      }

      return false;
    }

    // Match mat-expansion-panel elements with their content
    const panelRegex = /<mat-expansion-panel([^>]*)>([\s\S]*?)<\/mat-expansion-panel>/gi;

    let match;
    let panelIndex = 0;

    while ((match = panelRegex.exec(content)) !== null) {
      panelIndex++;
      elementsFound++;
      const panelAttributes = match[1] || '';
      const panelContent = match[2];

      // Check for mat-expansion-panel-header
      const headerRegex = /<mat-expansion-panel-header([^>]*)>([\s\S]*?)<\/mat-expansion-panel-header>/i;
      const headerMatch = panelContent.match(headerRegex);

      if (!headerMatch) {
        issues.push(format('MAT_EXPANSION_MISSING_HEADER', { element: match[0] }));
        continue;
      }

      const headerAttributes = headerMatch[1] || '';
      const headerContent = headerMatch[2] || '';
      const fullHeaderTag = headerMatch[0];

      // Get text content directly in the header (not in nested elements)
      const directTextContent = getTextContent(headerContent);

      // Check various ways the header can have accessible content
      const hasAccessibleContent =
        directTextContent.length > 0 ||                    // Direct text content
        hasPanelStructure(headerContent) ||                // mat-panel-title or mat-panel-description with content
        hasAriaLabel(fullHeaderTag);                       // aria-label on the header

      if (!hasAccessibleContent) {
        issues.push(format('MAT_EXPANSION_MISSING_HEADER', { element: fullHeaderTag }));
      }
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
