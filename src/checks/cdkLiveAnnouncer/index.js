module.exports = {
  name: 'cdkLiveAnnouncer',
  description: 'Dynamic content uses live regions for screen reader announcements',
  tier: 'full',
  type: 'html',
  weight: 3,

  check(content) {
    const issues = [];

    // Find line number for a match position
    const getLineNumber = (pos) => {
      return content.substring(0, pos).split('\n').length;
    };

    // Keywords that suggest dynamic status/notification content
    const statusKeywords = [
      'error', 'success', 'warning', 'info', 'alert', 'notification',
      'message', 'status', 'loading', 'saving', 'submitting', 'processing',
      'fehler', 'erfolg', 'warnung', 'meldung', 'laden' // German equivalents
    ];

    // Build pattern to find *ngIf with status-related content
    const keywordsPattern = statusKeywords.join('|');

    // Pattern 1: *ngIf on elements with status-related class names
    const ngIfWithStatusClassPattern = new RegExp(
      `<(\\w+[-\\w]*)([^>]*\\*ngIf\\s*=\\s*["'][^"']*["'][^>]*class\\s*=\\s*["'][^"']*(${keywordsPattern})[^"']*["'][^>]*)>`,
      'gi'
    );

    // Pattern 2: *ngIf condition contains status keywords
    const ngIfStatusConditionPattern = new RegExp(
      `<(\\w+[-\\w]*)([^>]*\\*ngIf\\s*=\\s*["'][^"']*(${keywordsPattern})[^"']*["'][^>]*)>`,
      'gi'
    );

    // Pattern to check for live region attributes
    const hasLiveRegion = (elementString, surroundingContext = '') => {
      const combined = elementString + ' ' + surroundingContext;
      return /\baria-live\s*=\s*["'](polite|assertive|off)["']/i.test(combined) ||
             /\brole\s*=\s*["'](alert|status|log|marquee|timer)["']/i.test(combined) ||
             /\[attr\.aria-live\]\s*=/i.test(combined) ||
             /\[aria-live\]\s*=/i.test(combined) ||
             /\[attr\.role\]\s*=\s*["'](alert|status)["']/i.test(combined) ||
             /cdkAriaLive/i.test(combined);
    };

    // Helper to get surrounding context (parent elements that might have aria-live)
    const getSurroundingContext = (html, matchIndex, windowSize = 500) => {
      const start = Math.max(0, matchIndex - windowSize);
      const end = Math.min(html.length, matchIndex);
      return html.substring(start, end);
    };

    // Helper to extract element snippet for reporting
    const getSnippet = (match) => {
      const snippet = match.length > 100 ? match.substring(0, 100) + '...' : match;
      return snippet.replace(/\s+/g, ' ').trim();
    };

    // Determine recommended fix based on content type
    const getRecommendedFix = (elementString, keyword) => {
      const lowerKeyword = keyword.toLowerCase();
      if (['error', 'fehler', 'alert'].includes(lowerKeyword)) {
        return 'For errors/alerts, add role="alert" (announces immediately) or aria-live="assertive".';
      }
      if (['loading', 'processing', 'saving', 'submitting', 'laden'].includes(lowerKeyword)) {
        return 'For loading states, add role="status" or aria-live="polite" to announce without interrupting.';
      }
      return 'Add aria-live="polite" for non-urgent updates, or role="alert" for important notifications.';
    };

    // Track already reported elements to avoid duplicates
    const reportedPositions = new Set();

    // Check pattern 1: *ngIf with status-related classes
    let match;
    while ((match = ngIfWithStatusClassPattern.exec(content)) !== null) {
      const elementString = match[0];
      const matchedKeyword = match[3];
      const lineNumber = getLineNumber(match.index);

      // Skip if already reported (use position to avoid duplicates)
      if (reportedPositions.has(match.index)) continue;

      const surroundingContext = getSurroundingContext(content, match.index);

      if (!hasLiveRegion(elementString, surroundingContext)) {
        reportedPositions.add(match.index);
        const snippet = getSnippet(elementString);
        const fix = getRecommendedFix(elementString, matchedKeyword);
        issues.push(
          `Warning: Dynamic status message lacks live region announcement. Screen reader users will not be notified when this content appears or changes.\n` +
          `  How to fix:\n` +
          `    - ${fix}\n` +
          `    - Inject CDK LiveAnnouncer service and call announce() programmatically\n` +
          `    - Wrap element in container with cdkAriaLive directive\n` +
          `    - Ensure status messages are announced without requiring user interaction\n` +
          `  WCAG 4.1.3: Status Messages\n` +
          `  Found: "${snippet}" at line ${lineNumber}`
        );
      }
    }

    // Check pattern 2: *ngIf condition contains status keywords
    while ((match = ngIfStatusConditionPattern.exec(content)) !== null) {
      const elementString = match[0];
      const matchedKeyword = match[3];
      const lineNumber = getLineNumber(match.index);

      // Skip if already reported
      if (reportedPositions.has(match.index)) continue;

      const surroundingContext = getSurroundingContext(content, match.index);

      if (!hasLiveRegion(elementString, surroundingContext)) {
        reportedPositions.add(match.index);
        const snippet = getSnippet(elementString);
        const fix = getRecommendedFix(elementString, matchedKeyword);
        issues.push(
          `Warning: Dynamic status message lacks live region announcement. Screen reader users will not be notified when this content appears or changes.\n` +
          `  How to fix:\n` +
          `    - ${fix}\n` +
          `    - Inject CDK LiveAnnouncer service and call announce() programmatically\n` +
          `    - Wrap element in container with cdkAriaLive directive\n` +
          `    - Ensure status messages are announced without requiring user interaction\n` +
          `  WCAG 4.1.3: Status Messages\n` +
          `  Found: "${snippet}" at line ${lineNumber}`
        );
      }
    }

    return {
      pass: issues.length === 0,
      issues
    };
  }
};
