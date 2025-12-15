const { format } = require('../core/errors');

/**
 * Gets the line number for a given index in the HTML string
 */
function getLineNumber(html, index) {
  const upToIndex = html.substring(0, index);
  const lines = upToIndex.split('\n');
  return lines.length;
}

/**
 * Checks if a given position in HTML is within an aria-live region
 */
function checkIfInAriaLiveRegion(html, index) {
  const beforeContent = html.substring(0, index);

  // Find the most recent aria-live attribute
  const ariaLiveMatches = [...beforeContent.matchAll(/aria-live\s*=\s*["'](?:polite|assertive|off)["']/gi)];

  if (ariaLiveMatches.length === 0) {
    return false;
  }

  // Get the last match (most recent)
  const lastMatch = ariaLiveMatches[ariaLiveMatches.length - 1];

  // Find what element this aria-live belongs to
  const beforeAriaLive = html.substring(0, lastMatch.index);
  const openingTagMatch = beforeAriaLive.match(/<(\w+)[^>]*$/);

  if (!openingTagMatch) {
    return false;
  }

  const tagName = openingTagMatch[1];

  // Check if the closing tag for this element is after our index
  const afterAriaLive = html.substring(lastMatch.index);
  const closingTagPattern = new RegExp(`</${tagName}\\s*>`, 'i');
  const closingMatch = afterAriaLive.match(closingTagPattern);

  if (!closingMatch) {
    return true;
  }

  const closingTagAbsoluteIndex = lastMatch.index + closingMatch.index;

  return index < closingTagAbsoluteIndex;
}

/**
 * Checks if a given position is within an element with a live role
 */
function checkIfInLiveRole(html, index) {
  const beforeContent = html.substring(0, index);

  // Find elements with live roles
  const liveRoleMatches = [...beforeContent.matchAll(/role\s*=\s*["'](status|alert|log|marquee|timer)["']/gi)];

  if (liveRoleMatches.length === 0) {
    return false;
  }

  const lastMatch = liveRoleMatches[liveRoleMatches.length - 1];
  const beforeRole = html.substring(0, lastMatch.index);
  const openingTagMatch = beforeRole.match(/<(\w+)[^>]*$/);

  if (!openingTagMatch) {
    return false;
  }

  const tagName = openingTagMatch[1];
  const afterRole = html.substring(lastMatch.index);
  const closingTagPattern = new RegExp(`</${tagName}\\s*>`, 'i');
  const closingMatch = afterRole.match(closingTagPattern);

  if (!closingMatch) {
    return true;
  }

  const closingTagAbsoluteIndex = lastMatch.index + closingMatch.index;

  return index < closingTagAbsoluteIndex;
}

/**
 * Checks if a given position has cdkAriaLive directive nearby
 */
function checkIfHasCdkAriaLive(html, index) {
  const beforeContent = html.substring(0, index);

  // Check for cdkAriaLive directive
  const cdkLiveMatches = [...beforeContent.matchAll(/cdkAriaLive|cdk-aria-live|\[cdkAriaLive\]/gi)];

  if (cdkLiveMatches.length === 0) {
    return false;
  }

  const lastMatch = cdkLiveMatches[cdkLiveMatches.length - 1];
  const beforeDirective = html.substring(0, lastMatch.index);
  const openingTagMatch = beforeDirective.match(/<(\w+)[^>]*$/);

  if (!openingTagMatch) {
    return false;
  }

  const tagName = openingTagMatch[1];
  const afterDirective = html.substring(lastMatch.index);
  const closingTagPattern = new RegExp(`</${tagName}\\s*>`, 'i');
  const closingMatch = afterDirective.match(closingTagPattern);

  if (!closingMatch) {
    return true;
  }

  const closingTagAbsoluteIndex = lastMatch.index + closingMatch.index;

  return index < closingTagAbsoluteIndex;
}

module.exports = {
  name: 'asyncPipeAria',
  description: 'Async pipe content changes should be in aria-live regions',
  tier: 'full',
  type: 'html',
  weight: 7,

  check(content) {
    // Early exit: no relevant elements, no issues
    if (!/\| async/i.test(content)) {
      return { pass: true, issues: [], elementsFound: 0 };
    }

    const issues = [];
    let elementsFound = 0;

    // Match async pipe usage in interpolations
    const asyncPipePattern = /\{\{\s*([^}|]+)\s*\|\s*async\s*\}\}/gi;

    let match;
    while ((match = asyncPipePattern.exec(content)) !== null) {
      elementsFound++;
      const asyncExpression = match[1].trim();
      const matchIndex = match.index;
      const lineNumber = getLineNumber(content, matchIndex);

      // Check if this async content is within an aria-live region
      const isInAriaLiveRegion = checkIfInAriaLiveRegion(content, matchIndex);

      // Also check for role="status", role="alert", etc. which have implicit aria-live
      const isInLiveRole = checkIfInLiveRole(content, matchIndex);

      // Check for Angular CDK live announcer usage
      const hasCdkAriaLive = checkIfHasCdkAriaLive(content, matchIndex);

      if (!isInAriaLiveRegion && !isInLiveRole && !hasCdkAriaLive) {
        issues.push(format('CDK_LIVE_ANNOUNCER_MISSING', {
          element: `{{ ${asyncExpression} | async }}`,
          line: lineNumber
        }));
      }
    }

    return { pass: issues.length === 0, issues, elementsFound };
  }
};
