module.exports = {
  name: 'matDialogFocus',
  description: 'Check that dialogs have explicit focus management for keyboard navigation',
  tier: 'full',
  type: 'html',
  weight: 5, // Reduced weight as MatDialog has reasonable defaults

  check(content) {
    const issues = [];

    /**
     * Check if the dialog content or surrounding context has focus management.
     * MatDialog automatically focuses the first tabbable element, but explicit
     * cdkFocusInitial provides better control and is recommended for complex dialogs.
     */
    function hasFocusManagement(dialogArea) {
      // cdkFocusInitial - explicit focus target
      const hasFocusInitial = /cdkFocusInitial/i.test(dialogArea);
      // cdkTrapFocusAutoCapture - auto-focus with trap
      const hasAutoCapture = /cdkTrapFocusAutoCapture/i.test(dialogArea);
      // [cdkFocusInitial]="expression" - Angular bound
      const hasBoundFocusInitial = /\[cdkFocusInitial\]/i.test(dialogArea);
      // autofocus attribute (native HTML, less recommended but valid)
      const hasAutofocus = /\bautofocus\b/i.test(dialogArea);

      return hasFocusInitial || hasAutoCapture || hasBoundFocusInitial || hasAutofocus;
    }

    /**
     * Check if dialog has interactive elements that would benefit from explicit focus
     */
    function hasInteractiveElements(content) {
      return /<(input|select|textarea|button|a\s)/i.test(content) ||
             /mat-button|mat-raised-button|mat-flat-button|mat-stroked-button|mat-icon-button|mat-fab|mat-mini-fab/i.test(content) ||
             /matInput/i.test(content);
    }

    /**
     * Try to get broader dialog context by looking for complete dialog structure
     */
    function getDialogContext(content, startIndex, endIndex) {
      // Look backwards for mat-dialog-title or dialog container
      const beforeContent = content.substring(Math.max(0, startIndex - 500), startIndex);
      const afterContent = content.substring(endIndex, Math.min(content.length, endIndex + 500));

      // Combine for context - title might have cdkFocusInitial
      return beforeContent + content.substring(startIndex, endIndex) + afterContent;
    }

    // Match mat-dialog-content element (includes content for context)
    const dialogContentRegex = /<mat-dialog-content([^>]*)>([\s\S]*?)<\/mat-dialog-content>/gi;

    // Match div[mat-dialog-content] attribute pattern
    const divDialogContentRegex = /<div[^>]*\bmat-dialog-content\b[^>]*>([\s\S]*?)<\/div>/gi;

    let match;

    // Check <mat-dialog-content> elements
    while ((match = dialogContentRegex.exec(content)) !== null) {
      const fullMatch = match[0];
      const dialogContent = match[2] || '';

      // Get broader context to check for focus management in title/actions areas
      const dialogContext = getDialogContext(content, match.index, match.index + fullMatch.length);

      // Only flag if:
      // 1. No focus management found in entire dialog context
      // 2. There are interactive elements that need focus
      if (!hasFocusManagement(dialogContext) && hasInteractiveElements(dialogContent)) {
        const snippet = fullMatch.length > 100 ? fullMatch.substring(0, 100) + '...' : fullMatch;
        issues.push(
          `[Warning] Dialog content has interactive elements but no explicit focus management. Screen reader users and keyboard navigators need predictable focus when dialogs open.\n` +
          `  How to fix:\n` +
          `    - Add cdkFocusInitial to the element that should receive focus: <input cdkFocusInitial>\n` +
          `    - For dialogs with a primary action, focus that button: <button cdkFocusInitial mat-raised-button>Submit</button>\n` +
          `    - For form dialogs, focus the first input field\n` +
          `  Note: MatDialog auto-focuses the first tabbable element by default, but explicit focus is more reliable.\n` +
          `  WCAG 2.4.3: Focus Order | See: https://material.angular.io/cdk/a11y/overview#cdkFocusInitial\n` +
          `  Found: ${snippet}`
        );
      }
    }

    // Check elements with [mat-dialog-content] attribute
    while ((match = divDialogContentRegex.exec(content)) !== null) {
      const fullMatch = match[0];
      const dialogContent = match[1] || fullMatch;

      const dialogContext = getDialogContext(content, match.index, match.index + fullMatch.length);

      if (!hasFocusManagement(dialogContext) && hasInteractiveElements(dialogContent)) {
        const snippet = fullMatch.length > 100 ? fullMatch.substring(0, 100) + '...' : fullMatch;
        issues.push(
          `[Warning] Dialog content (div with mat-dialog-content) has interactive elements but no explicit focus management. Screen reader users and keyboard navigators need predictable focus when dialogs open.\n` +
          `  How to fix:\n` +
          `    - Add cdkFocusInitial to the element that should receive focus when the dialog opens\n` +
          `    - Example: <input cdkFocusInitial> or <button cdkFocusInitial>\n` +
          `  WCAG 2.4.3: Focus Order | See: https://material.angular.io/cdk/a11y/overview#cdkFocusInitial\n` +
          `  Found: ${snippet}`
        );
      }
    }

    return {
      pass: issues.length === 0,
      issues
    };
  }
};
