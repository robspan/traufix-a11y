const { format } = require('../core/errors');

// Pre-compiled regex patterns (avoid recreation per call)
const EARLY_EXIT_BUTTON = /<button\b/i;
const EARLY_EXIT_INPUT = /<input[^>]*type\s*=\s*["']?(?:button|submit|reset|image)/i;
const BUTTON_REGEX = /<button\b[^>]*>[\s\S]*?<\/button>/gi;
const INPUT_BUTTON_REGEX = /<input\b[^>]*type\s*=\s*["']?(button|submit|reset|image)["']?[^>]*\/?>/gi;

// Accessibility attribute patterns
const ARIA_LABEL = /\baria-label\s*=|attr\.aria-label\]|\[aria-label\]/i;
const ARIA_LABELLEDBY = /\baria-labelledby\s*=|attr\.aria-labelledby\]|\[aria-labelledby\]/i;
const TITLE_ATTR = /\btitle\s*=|attr\.title\]|\[title\]/i;
const VALUE_ATTR = /\bvalue\s*=\s*["'][^"']+["']|\[value\]/i;
const ALT_ATTR = /\balt\s*=\s*["'][^"']+["']|attr\.alt\]/i;

// Content extraction patterns
const STRIP_ICONS = /<(?:mat-icon|svg|i[^>]*class\s*=\s*["'][^"']*\b(?:icon|fa|material-icons)\b)[^>]*>[\s\S]*?<\/(?:mat-icon|svg|i)>|<span[^>]*class\s*=\s*["'][^"']*\b(?:icon|fa|material-icons)\b[^"']*["'][^>]*>[\s\S]*?<\/span>/gi;
const STRIP_TAGS = /<[^>]+>/g;
const ANGULAR_INTERPOLATION = /\{\{[^}]+\}\}/g;

module.exports = {
  name: 'buttonNames',
  description: 'Buttons have accessible names',
  tier: 'basic',
  type: 'html',
  weight: 10,

  check(content) {
    // Early exit: no buttons, no issues
    if (!EARLY_EXIT_BUTTON.test(content) && !EARLY_EXIT_INPUT.test(content)) {
      return { pass: true, issues: [], elementsFound: 0 };
    }

    const issues = [];
    let elementsFound = 0;

    // Build line index for O(log n) line lookups instead of O(n) substring splits
    let lineStarts = null;
    const getLineNumber = (pos) => {
      if (!lineStarts) {
        lineStarts = [0];
        for (let i = 0; i < content.length; i++) {
          if (content[i] === '\n') lineStarts.push(i + 1);
        }
      }
      // Binary search for line number
      let lo = 0, hi = lineStarts.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (lineStarts[mid] <= pos) lo = mid;
        else hi = mid - 1;
      }
      return lo + 1;
    };

    // Reset regex state
    BUTTON_REGEX.lastIndex = 0;
    INPUT_BUTTON_REGEX.lastIndex = 0;

    // Check <button> elements
    let match;
    while ((match = BUTTON_REGEX.exec(content)) !== null) {
      elementsFound++;
      const button = match[0];

      if (!hasAccessibleName(button)) {
        const lineNumber = getLineNumber(match.index);
        const snippet = getSnippet(button);
        issues.push(format('BTN_MISSING_NAME', { element: snippet, line: lineNumber }));
      }
    }

    // Check <input type="button|submit|reset|image"> elements
    while ((match = INPUT_BUTTON_REGEX.exec(content)) !== null) {
      elementsFound++;
      const input = match[0];
      const inputType = match[1].toLowerCase();

      if (!hasInputAccessibleName(input, inputType)) {
        const lineNumber = getLineNumber(match.index);
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
  // Check accessibility attributes first (fastest path)
  if (ARIA_LABEL.test(button) || ARIA_LABELLEDBY.test(button) || TITLE_ATTR.test(button)) {
    return true;
  }

  // Extract and check text content
  return extractTextContent(button).length > 0;
}

/**
 * Extract visible text content from a button, excluding decorative elements
 */
function extractTextContent(button) {
  // Reset regex state for global patterns
  STRIP_ICONS.lastIndex = 0;

  return button
    .replace(STRIP_ICONS, '')
    .replace(STRIP_TAGS, ' ')
    .replace(ANGULAR_INTERPOLATION, ' TEXT ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if an input button has an accessible name
 */
function hasInputAccessibleName(input, inputType) {
  // Check accessibility attributes first
  if (ARIA_LABEL.test(input) || ARIA_LABELLEDBY.test(input) || TITLE_ATTR.test(input)) {
    return true;
  }

  // type="submit" and type="reset" have implicit labels
  if (inputType === 'submit' || inputType === 'reset') {
    return true;
  }

  // type="image" needs alt or value
  if (inputType === 'image') {
    return ALT_ATTR.test(input) || VALUE_ATTR.test(input);
  }

  // type="button" needs explicit value
  return VALUE_ATTR.test(input);
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
