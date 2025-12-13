const { format } = require('../core/errors');

module.exports = {
  name: 'matDialogFocus',
  description: 'Check that dialogs have explicit focus management for keyboard navigation',
  tier: 'full',
  type: 'html',
  weight: 5, // Reduced weight as MatDialog has reasonable defaults

  check(content) {
    const issues = [];
    let elementsFound = 0;

    /**
     * Check if cdkFocusInitial is on an unfocusable element
     * Returns true if cdkFocusInitial is present but on an element that can't be focused
     */
    function hasFocusOnUnfocusableElement(dialogArea) {
      // Pattern to match elements with cdkFocusInitial
      const focusInitialRegex = /<([a-z][a-z0-9-]*)\s+([^>]*cdkFocusInitial[^>]*)>/gi;
      let match;

      while ((match = focusInitialRegex.exec(dialogArea)) !== null) {
        const tagName = match[1].toLowerCase();
        const attributes = match[2];

        // Check if it's an input type="hidden"
        if (tagName === 'input' && /type=["']hidden["']/i.test(attributes)) {
          return true;
        }

        // Check if element is disabled
        if (/\bdisabled\b/i.test(attributes)) {
          return true;
        }

        // Check if element has aria-hidden="true"
        if (/aria-hidden=["']true["']/i.test(attributes)) {
          return true;
        }

        // Check if non-focusable element (span, div, etc.) with tabindex="-1"
        const nonInteractiveElements = ['span', 'div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
        if (nonInteractiveElements.includes(tagName) && /tabindex=["']-1["']/i.test(attributes)) {
          return true;
        }
      }

      return false;
    }

    /**
     * Check if the dialog content or surrounding context has focus management.
     * MatDialog automatically focuses the first tabbable element, but explicit
     * cdkFocusInitial provides better control and is recommended for complex dialogs.
     */
    function hasFocusManagement(dialogArea) {
      // First check if cdkFocusInitial is on an unfocusable element
      if (hasFocusOnUnfocusableElement(dialogArea)) {
        return false;
      }

      // cdkFocusInitial - explicit focus target
      const hasFocusInitial = /cdkFocusInitial/i.test(dialogArea);
      // cdkTrapFocusAutoCapture - auto-focus with trap
      const hasAutoCapture = /cdkTrapFocusAutoCapture/i.test(dialogArea);
      // [cdkFocusInitial]="expression" - Angular bound
      const hasBoundFocusInitial = /\[cdkFocusInitial\]/i.test(dialogArea);
      // autofocus attribute (native HTML, less recommended but valid)
      const hasAutofocus = /\bautofocus\b/i.test(dialogArea);
      // Custom focus directives (e.g., appAutoFocus, autoFocus, focusOnInit, initialFocus)
      const hasCustomFocusDirective = /app[A-Z]\w*[Ff]ocus|autoFocus|focusOnInit|initialFocus/i.test(dialogArea);
      // Dialog with role="dialog" and aria-modal="true" (native dialog behavior handles focus)
      const hasAriaModalDialog = /role=["']dialog["'][^>]*aria-modal=["']true["']|aria-modal=["']true["'][^>]*role=["']dialog["']/i.test(dialogArea);

      return hasFocusInitial || hasAutoCapture || hasBoundFocusInitial || hasAutofocus || hasCustomFocusDirective || hasAriaModalDialog;
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
      elementsFound++;
      const fullMatch = match[0];
      const dialogContent = match[2] || '';

      // Get broader context to check for focus management in title/actions areas
      const dialogContext = getDialogContext(content, match.index, match.index + fullMatch.length);

      // Only flag if:
      // 1. No focus management found in entire dialog context
      // 2. There are interactive elements that need focus
      if (!hasFocusManagement(dialogContext) && hasInteractiveElements(dialogContent)) {
        issues.push(format('MAT_DIALOG_FOCUS', { element: fullMatch }));
      }
    }

    // Check elements with [mat-dialog-content] attribute
    while ((match = divDialogContentRegex.exec(content)) !== null) {
      elementsFound++;
      const fullMatch = match[0];
      const dialogContent = match[1] || fullMatch;

      const dialogContext = getDialogContext(content, match.index, match.index + fullMatch.length);

      if (!hasFocusManagement(dialogContext) && hasInteractiveElements(dialogContent)) {
        issues.push(format('MAT_DIALOG_FOCUS', { element: fullMatch }));
      }
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
