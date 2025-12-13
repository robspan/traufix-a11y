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
 * Checks if an innerHTML expression appears to use sanitization
 */
function isSanitizedExpression(expression) {
  const sanitizationIndicators = [
    /sanitize/i,
    /\bsafe\b/i,
    /\bbypassSecurityTrust/i,
    /DomSanitizer/i,
    /safeHtml/i,
    /trustHtml/i,
    /purify/i,
    /\| safe\b/i,
    /\| safeHtml\b/i,
    /\| bypassSecurity/i,
  ];

  return sanitizationIndicators.some(pattern => pattern.test(expression));
}

/**
 * Checks if this is a user-facing content scenario (higher risk)
 */
function isUserFacingContent(expression) {
  const userContentIndicators = [
    /user/i,
    /comment/i,
    /input/i,
    /message/i,
    /post/i,
    /content/i,
    /html/i,
    /body/i,
    /text/i,
    /description/i,
  ];

  return userContentIndicators.some(pattern => pattern.test(expression));
}

module.exports = {
  name: 'innerHtmlUsage',
  description: 'Dynamic HTML via [innerHTML] may lack accessibility features and pose security risks if not sanitized',
  tier: 'full',
  type: 'html',
  weight: 7,

  check(content) {
    const issues = [];
    let elementsFound = 0;

    // Match [innerHTML] bindings
    const innerHtmlPattern = /\[innerHTML\]\s*=\s*["']([^"']+)["']/gi;

    let match;
    while ((match = innerHtmlPattern.exec(content)) !== null) {
      elementsFound++;
      const boundExpression = match[1];
      const lineNumber = getLineNumber(content, match.index);
      const isSanitized = isSanitizedExpression(boundExpression);
      const isUserContent = isUserFacingContent(boundExpression);

      if (isSanitized) {
        // Sanitized content - lower severity warning
        issues.push(format('INNER_HTML_USAGE', { element: `[innerHTML]="${boundExpression}"`, line: lineNumber }));
      } else if (isUserContent) {
        // User content without apparent sanitization - high severity
        issues.push(format('INNER_HTML_USAGE', { element: `[innerHTML]="${boundExpression}"`, line: lineNumber }));
      } else {
        // General innerHTML usage
        issues.push(format('INNER_HTML_USAGE', { element: `[innerHTML]="${boundExpression}"`, line: lineNumber }));
      }
    }

    // Also check for [outerHTML] which has similar concerns
    const outerHtmlPattern = /\[outerHTML\]\s*=\s*["']([^"']+)["']/gi;

    while ((match = outerHtmlPattern.exec(content)) !== null) {
      elementsFound++;
      const boundExpression = match[1];
      const lineNumber = getLineNumber(content, match.index);

      issues.push(format('INNER_HTML_USAGE', { element: `[outerHTML]="${boundExpression}"`, line: lineNumber }));
    }

    return { pass: issues.length === 0, issues, elementsFound };
  }
};
