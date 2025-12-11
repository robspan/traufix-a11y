module.exports = {
  name: 'matBadgeDescription',
  description: 'Check that matBadge has matBadgeDescription for screen reader accessibility',
  tier: 'full',
  type: 'html',
  weight: 3,

  check(content) {
    const issues = [];

    // Pattern to match elements with matBadge attribute (both static and bound)
    // Matches: matBadge="5", [matBadge]="count", matBadge (boolean)
    const matBadgeRegex = /<[a-z][a-z0-9-]*[^>]*\[?matBadge\]?[^>]*>/gi;

    let match;
    while ((match = matBadgeRegex.exec(content)) !== null) {
      const fullMatch = match[0];

      // Check if badge is hidden (matBadgeHidden="true" or [matBadgeHidden]="true" or [matBadgeHidden]="someVar")
      // If hidden, description is not required
      const hasMatBadgeHiddenTrue = /matBadgeHidden\s*=\s*["']true["']/i.test(fullMatch);
      const hasBoundMatBadgeHidden = /\[matBadgeHidden\]\s*=\s*["'][^"']+["']/i.test(fullMatch);

      // If badge is hidden (either statically true or bound to a variable), skip the check
      // Note: For bound hidden, we can't know the runtime value, but presence indicates developer awareness
      if (hasMatBadgeHiddenTrue) {
        continue;
      }

      // Check for matBadgeDescription (static or bound)
      // Matches: matBadgeDescription="5 unread", [matBadgeDescription]="description"
      // For bound values, we need to handle cases like [matBadgeDescription]="'text'" where single quotes are inside double quotes
      const hasStaticDescription = /matBadgeDescription\s*=\s*["'][^"']+["']/i.test(fullMatch);
      const hasBoundDescription = /\[matBadgeDescription\]\s*=\s*"[^"]+"/i.test(fullMatch) ||
                                  /\[matBadgeDescription\]\s*=\s*'[^']+'/i.test(fullMatch);

      if (!hasStaticDescription && !hasBoundDescription) {
        // Extract a snippet for context (truncate if too long)
        const snippet = fullMatch.length > 100 ? fullMatch.substring(0, 100) + '...' : fullMatch;
        issues.push(
          `[Error] Element with matBadge is missing matBadgeDescription. Screen readers will only announce the badge value without context.\n` +
          `  How to fix:\n` +
          `    - Add matBadgeDescription with meaningful context: matBadge="5" matBadgeDescription="5 unread messages"\n` +
          `    - Or use Angular binding: [matBadgeDescription]="descriptionVariable"\n` +
          `  WCAG 4.1.2: Name, Role, Value | See: https://material.angular.io/components/badge/overview#accessibility\n` +
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
