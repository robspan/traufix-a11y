const { format } = require('../core/errors');

module.exports = {
  name: 'matBottomSheetA11y',
  description: 'Check that bottom sheet templates have proper heading and close button accessibility',
  tier: 'full',
  type: 'html',
  weight: 3,

  check(content) {
    // Early exit: no relevant elements, no issues
    if (!/mat-bottom-sheet|MatBottomSheet/i.test(content)) {
      return { pass: true, issues: [], elementsFound: 0 };
    }

    const issues = [];
    let elementsFound = 0;

    // Helper to extract a snippet for reporting
    const getSnippet = (match) => {
      const snippet = match.length > 80 ? match.substring(0, 80) + '...' : match;
      return snippet.replace(/\s+/g, ' ').trim();
    };

    // Pattern to detect bottom sheet templates
    // 1. ng-template with matBottomSheet reference
    // 2. mat-bottom-sheet-container element
    // 3. Elements with bottomSheet in template reference
    const bottomSheetTemplatePattern = /<ng-template[^>]*(?:#\w*[bB]ottom[sS]heet|matBottomSheet)[^>]*>([\s\S]*?)<\/ng-template>/gi;
    const matBottomSheetContainerPattern = /<mat-bottom-sheet-container[^>]*>([\s\S]*?)<\/mat-bottom-sheet-container>/gi;

    // Pattern for checking headings (h1-h6 or role="heading")
    const headingPattern = /<h[1-6][^>]*>|role\s*=\s*["']heading["']/i;

    // Pattern for close/dismiss buttons without aria-label
    // Matches button elements with close/dismiss related text or icons
    const closeButtonPattern = /<button[^>]*>[\s\S]*?<\/button>/gi;
    const matIconClosePattern = /mat-icon[^>]*>\s*(?:close|cancel|clear)\s*<\/mat-icon>/i;
    const closeTextPattern = /(?:close|dismiss|cancel|x)\s*$/i;
    const hasAriaLabelPattern = /aria-label\s*=\s*["'][^"']+["']/i;
    const matDialogClosePattern = /\[?mat-dialog-close\]?/i;

    /**
     * Check if a button is likely a close button
     */
    function isCloseButton(buttonHtml) {
      // Check for mat-dialog-close directive (also used for bottom sheets)
      if (matDialogClosePattern.test(buttonHtml)) {
        return true;
      }
      // Check for close icon
      if (matIconClosePattern.test(buttonHtml)) {
        return true;
      }
      // Check for close-related text content
      const textContent = buttonHtml.replace(/<[^>]*>/g, '').trim();
      if (closeTextPattern.test(textContent)) {
        return true;
      }
      // Check for close-related class names or IDs
      if (/class\s*=\s*["'][^"']*(?:close|dismiss)[^"']*["']/i.test(buttonHtml)) {
        return true;
      }
      return false;
    }

    /**
     * Check a bottom sheet content for accessibility issues
     */
    function checkBottomSheetContent(fullMatch, sheetContent, identifier) {
      const sheetIssues = [];

      // Check 1: Does it have a heading?
      if (!headingPattern.test(sheetContent)) {
        sheetIssues.push(format('MAT_BOTTOM_SHEET_MISSING_LABEL', { element: fullMatch }));
      }

      // Check 2: Find close buttons and check for aria-label
      let buttonMatch;
      const buttonRegex = /<button[^>]*>[\s\S]*?<\/button>/gi;
      while ((buttonMatch = buttonRegex.exec(sheetContent)) !== null) {
        const buttonHtml = buttonMatch[0];

        if (isCloseButton(buttonHtml)) {
          // Check if it has aria-label
          if (!hasAriaLabelPattern.test(buttonHtml)) {
            // Check if button has meaningful text content (not just an icon)
            // Remove mat-icon elements entirely before checking text content
            const withoutMatIcon = buttonHtml.replace(/<mat-icon[^>]*>[\s\S]*?<\/mat-icon>/gi, '');
            const textContent = withoutMatIcon.replace(/<[^>]*>/g, '').replace(/\s+/g, '').trim();
            const hasCloseIcon = matIconClosePattern.test(buttonHtml);

            // Flag if button has a close icon but no meaningful text content outside the icon
            if (hasCloseIcon && !textContent) {
              sheetIssues.push(format('MAT_BOTTOM_SHEET_MISSING_LABEL', { element: buttonHtml }));
            }
          }
        }
      }

      return sheetIssues;
    }

    // Check ng-template bottom sheet patterns
    let match;
    while ((match = bottomSheetTemplatePattern.exec(content)) !== null) {
      elementsFound++;
      const fullMatch = match[0];
      const sheetContent = match[1] || '';
      const templateRefMatch = fullMatch.match(/#(\w+)/);
      const identifier = templateRefMatch ? `template #${templateRefMatch[1]}` : 'template';

      const sheetIssues = checkBottomSheetContent(fullMatch, sheetContent, identifier);
      issues.push(...sheetIssues);
    }

    // Check mat-bottom-sheet-container elements
    while ((match = matBottomSheetContainerPattern.exec(content)) !== null) {
      elementsFound++;
      const fullMatch = match[0];
      const sheetContent = match[1] || '';

      const sheetIssues = checkBottomSheetContent(fullMatch, sheetContent, 'container');
      issues.push(...sheetIssues);
    }

    // Also check for component-based bottom sheets (common pattern)
    // Look for elements with matBottomSheetRef or similar patterns
    const bottomSheetComponentPattern = /<(\w+[-\w]*)[^>]*\bmat-bottom-sheet\b[^>]*>([\s\S]*?)<\/\1>/gi;
    while ((match = bottomSheetComponentPattern.exec(content)) !== null) {
      elementsFound++;
      const fullMatch = match[0];
      const sheetContent = match[2] || '';
      const tagName = match[1];

      const sheetIssues = checkBottomSheetContent(fullMatch, sheetContent, `<${tagName}>`);
      issues.push(...sheetIssues);
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
