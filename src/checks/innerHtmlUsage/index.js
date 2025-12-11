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

    // Match [innerHTML] bindings
    const innerHtmlPattern = /\[innerHTML\]\s*=\s*["']([^"']+)["']/gi;

    let match;
    while ((match = innerHtmlPattern.exec(content)) !== null) {
      const boundExpression = match[1];
      const lineNumber = getLineNumber(content, match.index);
      const isSanitized = isSanitizedExpression(boundExpression);
      const isUserContent = isUserFacingContent(boundExpression);

      if (isSanitized) {
        // Sanitized content - lower severity warning
        issues.push(
          `[Info] Line ${lineNumber}: [innerHTML] binding with apparent sanitization. ` +
          `While sanitized, dynamically injected HTML may bypass Angular's accessibility features.\n` +
          `  How to fix:\n` +
          `    - Ensure injected HTML includes alt text for images\n` +
          `    - Verify proper heading structure (h1-h6) is maintained\n` +
          `    - Add ARIA labels for interactive elements\n` +
          `    - Consider using Angular templates (*ngFor, *ngIf) for better control\n` +
          `  WCAG 4.1.2: Name, Role, Value\n` +
          `  Found: [innerHTML]="${boundExpression}"`
        );
      } else if (isUserContent) {
        // User content without apparent sanitization - high severity
        issues.push(
          `[Warning] Line ${lineNumber}: [innerHTML] binding with user-generated content. ` +
          `User-generated HTML may lack accessibility features and poses XSS security risk.\n` +
          `  How to fix:\n` +
          `    - Use DomSanitizer.sanitize() to sanitize untrusted content\n` +
          `    - Validate HTML structure before injection\n` +
          `    - Ensure all images have alt text and interactive elements have labels\n` +
          `    - Prefer Angular templates over innerHTML for dynamic content\n` +
          `  WCAG 4.1.2: Name, Role, Value\n` +
          `  Security: https://angular.io/guide/security#sanitization-and-security-contexts\n` +
          `  Found: [innerHTML]="${boundExpression}"`
        );
      } else {
        // General innerHTML usage
        issues.push(
          `[Warning] Line ${lineNumber}: [innerHTML] binding may bypass accessibility features. ` +
          `Dynamic HTML content injected via innerHTML can lack proper semantic structure and labels.\n` +
          `  How to fix:\n` +
          `    - Ensure injected content has proper headings, alt text, and ARIA attributes\n` +
          `    - Use Angular's DomSanitizer if content comes from untrusted sources\n` +
          `    - Consider using structural directives (*ngFor, *ngIf) instead\n` +
          `    - Test injected content with screen readers\n` +
          `  WCAG 4.1.2: Name, Role, Value\n` +
          `  Found: [innerHTML]="${boundExpression}"`
        );
      }
    }

    // Also check for [outerHTML] which has similar concerns
    const outerHtmlPattern = /\[outerHTML\]\s*=\s*["']([^"']+)["']/gi;

    while ((match = outerHtmlPattern.exec(content)) !== null) {
      const boundExpression = match[1];
      const lineNumber = getLineNumber(content, match.index);

      issues.push(
        `[Warning] Line ${lineNumber}: [outerHTML] binding replaces entire element. ` +
        `Replacing the outer element destroys semantic structure and may break accessibility.\n` +
        `  How to fix:\n` +
        `    - Use [innerHTML] instead to preserve the container element\n` +
        `    - Use Angular templates (*ngIf, *ngFor, *ngSwitch) for dynamic content\n` +
        `    - Ensure replacement maintains proper document structure\n` +
        `  WCAG 4.1.2: Name, Role, Value\n` +
        `  Found: [outerHTML]="${boundExpression}"`
      );
    }

    return { pass: issues.length === 0, issues };
  }
};
