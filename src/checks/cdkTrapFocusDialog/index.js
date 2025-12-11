module.exports = {
  name: 'cdkTrapFocusDialog',
  description: 'Dialogs use CDK focus trap for keyboard accessibility',
  tier: 'full',
  type: 'html',
  weight: 3,

  check(content) {
    const issues = [];

    // Pattern to find elements with role="dialog"
    // Matches: <div role="dialog" ...> or <any-element role="dialog" ...>
    const roleDialogPattern = /<(\w+[-\w]*)[^>]*\brole\s*=\s*["']dialog["'][^>]*>/gi;

    // Pattern to find mat-dialog-container elements
    const matDialogPattern = /<mat-dialog-container[^>]*>/gi;

    // Pattern to find cdk-dialog-container elements
    const cdkDialogPattern = /<cdk-dialog-container[^>]*>/gi;

    // Pattern to check for focus trap directives
    const hasFocusTrap = (elementString) => {
      return /\bcdkTrapFocus\b/i.test(elementString) ||
             /\bcdkTrapFocusAutoCapture\b/i.test(elementString);
    };

    // Helper to extract a snippet for reporting
    const getSnippet = (match) => {
      const snippet = match.length > 80 ? match.substring(0, 80) + '...' : match;
      return snippet.replace(/\s+/g, ' ').trim();
    };

    // Check role="dialog" elements
    let match;
    while ((match = roleDialogPattern.exec(content)) !== null) {
      const elementString = match[0];
      if (!hasFocusTrap(elementString)) {
        issues.push(
          `[Error] Dialog element missing focus trap. Keyboard users may become trapped or unable to navigate the dialog properly.\n` +
          `  How to fix:\n` +
          `    - Add cdkTrapFocus directive to the dialog element\n` +
          `    - Or use cdkTrapFocusAutoCapture to automatically capture focus\n` +
          `    - Ensure focus returns to the triggering element when dialog closes\n` +
          `  WCAG 2.1.2: No Keyboard Trap | WCAG 2.4.3: Focus Order\n` +
          `  Found: "${getSnippet(elementString)}"`
        );
      }
    }

    // Check mat-dialog-container elements
    while ((match = matDialogPattern.exec(content)) !== null) {
      const elementString = match[0];
      if (!hasFocusTrap(elementString)) {
        issues.push(
          `[Warning] mat-dialog-container missing focus trap. Modal dialogs should trap focus for proper keyboard navigation.\n` +
          `  How to fix:\n` +
          `    - Add cdkTrapFocus directive to the mat-dialog-container element\n` +
          `    - Or use cdkTrapFocusAutoCapture to automatically capture focus\n` +
          `    - Ensure focus returns to the triggering element when dialog closes\n` +
          `  WCAG 2.1.2: No Keyboard Trap | WCAG 2.4.3: Focus Order\n` +
          `  Found: "${getSnippet(elementString)}"`
        );
      }
    }

    // Check cdk-dialog-container elements
    while ((match = cdkDialogPattern.exec(content)) !== null) {
      const elementString = match[0];
      if (!hasFocusTrap(elementString)) {
        issues.push(
          `[Warning] cdk-dialog-container missing focus trap. Modal dialogs should trap focus for proper keyboard navigation.\n` +
          `  How to fix:\n` +
          `    - Add cdkTrapFocus directive to the cdk-dialog-container element\n` +
          `    - Or use cdkTrapFocusAutoCapture to automatically capture focus\n` +
          `    - Ensure focus returns to the triggering element when dialog closes\n` +
          `  WCAG 2.1.2: No Keyboard Trap | WCAG 2.4.3: Focus Order\n` +
          `  Found: "${getSnippet(elementString)}"`
        );
      }
    }

    return {
      pass: issues.length === 0,
      issues
    };
  }
};
