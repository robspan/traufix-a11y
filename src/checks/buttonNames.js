const { format } = require('../core/errors');

module.exports = {
  name: 'buttonNames',
  description: 'Buttons have accessible names',
  tier: 'basic',
  type: 'html',
  weight: 10,

  check(content) {
    const issues = [];
    let elementsFound = 0;

    // Find line number for a match position
    const getLineNumber = (pos) => {
      return content.substring(0, pos).split('\n').length;
    };

    // Check <button> elements
    const buttonRegex = /<button\b[^>]*>[\s\S]*?<\/button>/gi;
    let match;

    while ((match = buttonRegex.exec(content)) !== null) {
      elementsFound++;
      const button = match[0];
      const lineNumber = getLineNumber(match.index);

      if (!hasAccessibleName(button)) {
        const snippet = getSnippet(button);
        issues.push(format('BTN_MISSING_NAME', { element: snippet, line: lineNumber }));
      }
    }

    // Check <input type="button|submit|reset|image"> elements
    const inputButtonRegex = /<input\b[^>]*type\s*=\s*["']?(button|submit|reset|image)["']?[^>]*\/?>/gi;

    while ((match = inputButtonRegex.exec(content)) !== null) {
      elementsFound++;
      const input = match[0];
      const lineNumber = getLineNumber(match.index);
      const inputType = match[1].toLowerCase();

      if (!hasInputAccessibleName(input, inputType)) {
        const snippet = getSnippet(input);
        issues.push(format('BTN_INPUT_MISSING_NAME', { element: snippet, line: lineNumber }));
      }
    }

    return { pass: issues.length === 0, issues, elementsFound };
  }
};

/**
 * Check if a button element has an accessible name
 */
function hasAccessibleName(button) {
  // Check for aria-label (standard and Angular binding)
  const hasAriaLabel = /\baria-label\s*=/i.test(button) ||
                       /\[attr\.aria-label\]\s*=/i.test(button) ||
                       /\[aria-label\]\s*=/i.test(button);

  // Check for aria-labelledby (standard and Angular binding)
  const hasAriaLabelledBy = /\baria-labelledby\s*=/i.test(button) ||
                            /\[attr\.aria-labelledby\]\s*=/i.test(button) ||
                            /\[aria-labelledby\]\s*=/i.test(button);

  // Check for title attribute (fallback accessible name)
  const hasTitle = /\btitle\s*=/i.test(button) ||
                   /\[attr\.title\]\s*=/i.test(button) ||
                   /\[title\]\s*=/i.test(button);

  if (hasAriaLabel || hasAriaLabelledBy || hasTitle) {
    return true;
  }

  // Extract and check text content
  const textContent = extractTextContent(button);

  return textContent.length > 0;
}

/**
 * Extract visible text content from a button, excluding decorative elements
 */
function extractTextContent(button) {
  let text = button
    // Remove mat-icon elements (Angular Material)
    .replace(/<mat-icon[^>]*>[\s\S]*?<\/mat-icon>/gi, '')
    // Remove SVG elements
    .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '')
    // Remove icon elements (Font Awesome, etc.)
    .replace(/<i[^>]*class\s*=\s*["'][^"']*\b(icon|fa|fas|far|fab|material-icons)\b[^"']*["'][^>]*>[\s\S]*?<\/i>/gi, '')
    // Remove span with icon classes
    .replace(/<span[^>]*class\s*=\s*["'][^"']*\b(icon|fa|fas|far|fab|material-icons)\b[^"']*["'][^>]*>[\s\S]*?<\/span>/gi, '')
    // Keep sr-only/visually-hidden text (these ARE accessible names)
    // Remove all remaining HTML tags
    .replace(/<[^>]+>/g, ' ')
    // Angular interpolation counts as text content
    .replace(/\{\{[^}]+\}\}/g, ' TEXT ')
    // Clean up whitespace
    .replace(/\s+/g, ' ')
    .trim();

  return text;
}

/**
 * Check if an input button has an accessible name
 */
function hasInputAccessibleName(input, inputType) {
  // Check for aria-label
  const hasAriaLabel = /\baria-label\s*=/i.test(input) ||
                       /\[attr\.aria-label\]\s*=/i.test(input);

  // Check for aria-labelledby
  const hasAriaLabelledBy = /\baria-labelledby\s*=/i.test(input) ||
                            /\[attr\.aria-labelledby\]\s*=/i.test(input);

  // Check for value attribute
  const hasValue = /\bvalue\s*=\s*["'][^"']+["']/i.test(input) ||
                   /\[value\]\s*=/i.test(input);

  // Check for title attribute
  const hasTitle = /\btitle\s*=/i.test(input) ||
                   /\[attr\.title\]\s*=/i.test(input);

  // Check for alt attribute (for type="image")
  const hasAlt = /\balt\s*=\s*["'][^"']+["']/i.test(input) ||
                 /\[attr\.alt\]\s*=/i.test(input);

  if (hasAriaLabel || hasAriaLabelledBy || hasTitle) {
    return true;
  }

  // type="submit" and type="reset" have implicit labels
  if (inputType === 'submit' || inputType === 'reset') {
    return true;
  }

  // type="image" needs alt or value
  if (inputType === 'image') {
    return hasAlt || hasValue;
  }

  // type="button" needs explicit value
  return hasValue;
}

/**
 * Get a clean snippet of the element for error reporting
 */
function getSnippet(element) {
  return element
    .substring(0, 100)
    .replace(/\s+/g, ' ')
    .replace(/[\n\r]/g, '')
    .trim() + (element.length > 100 ? '...' : '');
}
