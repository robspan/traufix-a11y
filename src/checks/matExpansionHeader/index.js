module.exports = {
  name: 'matExpansionHeader',
  description: 'Check that mat-expansion-panel has a mat-expansion-panel-header with accessible content',
  tier: 'full',
  type: 'html',
  weight: 5, // Increased weight - expansion panels are important for navigation

  check(content) {
    const issues = [];

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
      const panelAttributes = match[1] || '';
      const panelContent = match[2];

      // Check for mat-expansion-panel-header
      const headerRegex = /<mat-expansion-panel-header([^>]*)>([\s\S]*?)<\/mat-expansion-panel-header>/i;
      const headerMatch = panelContent.match(headerRegex);

      if (!headerMatch) {
        issues.push(
          `[Error] mat-expansion-panel #${panelIndex} is missing <mat-expansion-panel-header>. The header is the clickable/focusable trigger - without it, keyboard users cannot expand/collapse the panel and screen readers lack context.\n` +
          `  How to fix:\n` +
          `    <mat-expansion-panel>\n` +
          `      <mat-expansion-panel-header>\n` +
          `        <mat-panel-title>Section Title</mat-panel-title>\n` +
          `      </mat-expansion-panel-header>\n` +
          `      <!-- Panel content -->\n` +
          `    </mat-expansion-panel>\n` +
          `  WCAG 4.1.2: Name, Role, Value | See: https://material.angular.io/components/expansion/overview#accessibility`
        );
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
        // Determine what's missing to give specific advice
        const hasIconOnly = /<mat-icon[^>]*>/i.test(headerContent) && !directTextContent;

        if (hasIconOnly) {
          issues.push(
            `[Error] mat-expansion-panel #${panelIndex} header contains only an icon without accessible text. Icons alone don't provide meaning to screen reader users.\n` +
            `  How to fix (choose one):\n` +
            `    - Add aria-label to the header: <mat-expansion-panel-header aria-label="Settings">\n` +
            `    - Add mat-panel-title: <mat-panel-title>Settings</mat-panel-title>\n` +
            `    - Add visually-hidden text: <span class="cdk-visually-hidden">Settings</span>\n` +
            `  WCAG 4.1.2: Name, Role, Value | See: https://material.angular.io/components/expansion/overview#accessibility`
          );
        } else {
          issues.push(
            `[Error] mat-expansion-panel #${panelIndex} header appears to be empty or lacks accessible content. Screen readers need text content to announce the panel's purpose.\n` +
            `  How to fix:\n` +
            `    - Add text content: <mat-expansion-panel-header>Section Name</mat-expansion-panel-header>\n` +
            `    - Use mat-panel-title: <mat-panel-title>Section Name</mat-panel-title>\n` +
            `    - Add aria-label: <mat-expansion-panel-header aria-label="Section Name">\n` +
            `  WCAG 4.1.2: Name, Role, Value | See: https://material.angular.io/components/expansion/overview#accessibility`
          );
        }
      }
    }

    return {
      pass: issues.length === 0,
      issues
    };
  }
};
