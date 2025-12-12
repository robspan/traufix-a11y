const { format } = require('../../core/errors');

module.exports = {
  name: 'matBadgeDescription',
  description: 'Check that matBadge has matBadgeDescription for screen reader accessibility',
  tier: 'full',
  type: 'html',
  weight: 3,

  check(content) {
    const issues = [];
    let elementsFound = 0;

    // Pattern to match elements with matBadge attribute (both static and bound)
    // Matches: matBadge="5", [matBadge]="count", matBadge (boolean)
    const matBadgeRegex = /<[a-z][a-z0-9-]*[^>]*\[?matBadge\]?[^>]*>/gi;

    let match;
    while ((match = matBadgeRegex.exec(content)) !== null) {
      elementsFound++;
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
        issues.push(format('MAT_BADGE_MISSING_DESCRIPTION', { element: fullMatch }));
      }
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
