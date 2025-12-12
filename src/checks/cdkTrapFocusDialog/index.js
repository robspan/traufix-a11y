const { format } = require('../../core/errors');

module.exports = {
  name: 'cdkTrapFocusDialog',
  description: 'Dialogs use CDK focus trap for keyboard accessibility',
  tier: 'full',
  type: 'html',
  weight: 3,

  check(content) {
    const issues = [];
    let elementsFound = 0;

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
      elementsFound++;
      const elementString = match[0];
      if (!hasFocusTrap(elementString)) {
        const snippet = getSnippet(elementString);
        issues.push(format('FOCUS_TRAP_MISSING', { element: snippet }));
      }
    }

    // Check mat-dialog-container elements
    while ((match = matDialogPattern.exec(content)) !== null) {
      elementsFound++;
      const elementString = match[0];
      if (!hasFocusTrap(elementString)) {
        const snippet = getSnippet(elementString);
        issues.push(format('CDK_FOCUS_TRAP_MISSING', { element: snippet }));
      }
    }

    // Check cdk-dialog-container elements
    while ((match = cdkDialogPattern.exec(content)) !== null) {
      elementsFound++;
      const elementString = match[0];
      if (!hasFocusTrap(elementString)) {
        const snippet = getSnippet(elementString);
        issues.push(format('CDK_FOCUS_TRAP_MISSING', { element: snippet }));
      }
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
