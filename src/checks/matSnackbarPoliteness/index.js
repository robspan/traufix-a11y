module.exports = {
  name: 'matSnackbarPoliteness',
  description: 'Check that MatSnackBar.open() calls explicitly set politeness for screen reader announcements',
  tier: 'full',
  type: 'html',
  weight: 3,

  check(content) {
    const issues = [];

    // Also check for injection of MatSnackBar to confirm it's being used
    const hasMatSnackBarImport = /import\s*\{[^}]*MatSnackBar[^}]*\}\s*from\s*['"]@angular\/material\/snack-bar['"]/i.test(content);
    const hasMatSnackBarInjection = /:\s*MatSnackBar\b/i.test(content);

    if (!hasMatSnackBarImport && !hasMatSnackBarInjection) {
      // No MatSnackBar usage detected
      return { pass: true, issues: [] };
    }

    const callsWithoutExplicitPoliteness = [];

    // Look for snackbar-like open() calls with common naming patterns
    // Matches: this.snackBar.open, snackBar.open, _snackBar.open, this._snackBar.open
    const openCallRegex = /(?:this\.)?_?(?:snackBar|snack|matSnackBar)\.open\s*\(/gi;

    let match;
    while ((match = openCallRegex.exec(content)) !== null) {
      // Get the full call by finding the matching closing parenthesis
      const startIndex = match.index;
      let parenCount = 0;
      let endIndex = startIndex;
      let inString = false;
      let stringChar = '';

      for (let i = match.index; i < content.length; i++) {
        const char = content[i];

        // Track string boundaries
        if ((char === '"' || char === "'" || char === '`') && content[i - 1] !== '\\') {
          if (!inString) {
            inString = true;
            stringChar = char;
          } else if (char === stringChar) {
            inString = false;
          }
        }

        if (!inString) {
          if (char === '(') parenCount++;
          if (char === ')') {
            parenCount--;
            if (parenCount === 0) {
              endIndex = i;
              break;
            }
          }
        }
      }

      const fullCall = content.substring(startIndex, endIndex + 1);

      // Check if the call includes politeness configuration
      const hasPolitenessConfig = /politeness\s*:/i.test(fullCall);

      if (!hasPolitenessConfig) {
        // Extract line number for better reporting
        const linesBeforeMatch = content.substring(0, startIndex).split('\n');
        const lineNumber = linesBeforeMatch.length;
        callsWithoutExplicitPoliteness.push(lineNumber);
      }
    }

    // Only report issues for calls that don't have explicit politeness settings
    if (callsWithoutExplicitPoliteness.length > 0) {
      issues.push(
        `[Warning] Found ${callsWithoutExplicitPoliteness.length} MatSnackBar.open() call(s) without explicit politeness setting. Screen reader users may not receive appropriate status message announcements.\n` +
        `  How to fix:\n` +
        `    - Add politeness configuration to control screen reader announcements\n` +
        `    - Use 'polite' for non-urgent messages (waits for user to finish current task)\n` +
        `    - Use 'assertive' for important alerts (interrupts current announcement)\n` +
        `    - Use 'off' for visual-only messages (not announced to screen readers)\n` +
        `  WCAG 4.1.3: Status Messages | See: https://material.angular.io/components/snack-bar/overview#accessibility\n` +
        `  Found on line${callsWithoutExplicitPoliteness.length > 1 ? 's' : ''}: ${callsWithoutExplicitPoliteness.join(', ')}`
      );
    }

    return {
      pass: issues.length === 0,
      issues
    };
  }
};
