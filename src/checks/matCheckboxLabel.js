const { format } = require('../core/errors');

module.exports = {
  name: 'matCheckboxLabel',
  description: 'Check that mat-checkbox has an accessible label',
  tier: 'full',
  type: 'html',
  weight: 3,

  check(content) {
    const issues = [];
    let elementsFound = 0;

    // Find line number for a match position
    const getLineNumber = (pos) => {
      return content.substring(0, pos).split('\n').length;
    };

    // Match mat-checkbox elements (both self-closing and with content)
    // Self-closing: <mat-checkbox ... />
    // With content: <mat-checkbox ...>...</mat-checkbox>
    const matCheckboxRegex = /<mat-checkbox\b([^>]*)(?:\/>|>([\s\S]*?)<\/mat-checkbox>)/gi;

    let match;
    while ((match = matCheckboxRegex.exec(content)) !== null) {
      elementsFound++;
      const fullMatch = match[0];
      const attrs = match[1] || '';
      const innerContent = match[2] || '';
      const lineNumber = getLineNumber(match.index);

      // Check for aria-label (standard and Angular binding)
      const hasAriaLabel = /\baria-label\s*=\s*["'][^"']+["']/i.test(attrs) ||
                           /\[aria-label\]\s*=/i.test(attrs) ||
                           /\[attr\.aria-label\]\s*=/i.test(attrs);

      // Check for aria-labelledby (standard and Angular binding)
      const hasAriaLabelledby = /\baria-labelledby\s*=\s*["'][^"']+["']/i.test(attrs) ||
                                /\[aria-labelledby\]\s*=/i.test(attrs) ||
                                /\[attr\.aria-labelledby\]\s*=/i.test(attrs);

      // If aria-label or aria-labelledby is present, it's accessible
      if (hasAriaLabel || hasAriaLabelledby) {
        continue;
      }

      // Check inner content for text or Angular interpolation
      // First, check if it's a self-closing tag (no inner content)
      const isSelfClosing = fullMatch.endsWith('/>');

      if (!isSelfClosing && innerContent) {
        // Check for Angular interpolation {{ ... }} which indicates dynamic label
        if (/\{\{[^}]+\}\}/.test(innerContent)) {
          continue; // Has dynamic content, assume it provides a label
        }

        // Extract text content by removing HTML tags and checking for non-whitespace
        const textContent = innerContent
          .replace(/<[^>]+>/g, '') // Remove HTML tags
          .replace(/\s+/g, ' ')    // Normalize whitespace
          .trim();

        if (textContent.length > 0) {
          continue; // Has text content as label
        }
      }

      // No accessible label found - report issue
      issues.push(format('MAT_CHECKBOX_MISSING_LABEL', { element: fullMatch, line: lineNumber }));
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
