const { format } = require('../core/errors');

// Get line number from character position
function getLineNumber(content, index) {
  let line = 1;
  for (let i = 0; i < index && i < content.length; i++) {
    if (content[i] === '\n') line++;
  }
  return line;
}

// Pre-compiled regex patterns
const EARLY_EXIT = /<(?:input|select|textarea)\b/i;
const INPUT_REGEX = /<(input|select|textarea)([^>]*)>/gi;
const SKIP_TYPES = /type\s*=\s*["'](?:hidden|submit|button|reset|image)["']/i;
const ARIA_LABEL = /aria-label\s*=|\[attr\.aria-label\]|\[aria-label\]/i;
const ARIA_LABELLEDBY = /aria-labelledby\s*=|\[attr\.aria-labelledby\]/i;
const TITLE_ATTR = /\btitle\s*=|\[title\]/i;
const PLACEHOLDER = /placeholder\s*=/i;
const ID_ATTR = /\bid\s*=\s*["']([^"']+)["']/i;
const FORM_CONTROL = /formControlName/i;
const MAT_FORM_FIELD_OPEN = /<mat-form-field[^>]*>/i;
const MAT_FORM_FIELD_CLOSE = /<\/mat-form-field>/i;
const MAT_LABEL = /<mat-label[^>]*>[\s\S]*<\/mat-label>/i;

module.exports = {
  name: 'formLabels',
  description: 'Form elements have labels',
  tier: 'basic',
  type: 'html',
  weight: 10,
  wcag: '1.3.1',

  check(content) {
    // Early exit: no form elements, no issues
    if (!EARLY_EXIT.test(content)) {
      return { pass: true, issues: [], elementsFound: 0 };
    }

    const issues = [];
    let elementsFound = 0;

    // Reset regex state
    INPUT_REGEX.lastIndex = 0;

    // Cache for label[for] lookups - build once
    let labelForCache = null;
    const hasLabelFor = (id) => {
      if (!labelForCache) {
        labelForCache = new Set();
        const labelRegex = /<label[^>]*\bfor\s*=\s*["']([^"']+)["']/gi;
        let m;
        while ((m = labelRegex.exec(content)) !== null) {
          labelForCache.add(m[1]);
        }
      }
      return labelForCache.has(id);
    };

    let match;
    while ((match = INPUT_REGEX.exec(content)) !== null) {
      elementsFound++;
      const tagName = match[1].toLowerCase();
      const attributes = match[2];
      const position = match.index;
      const fullMatch = match[0];

      // Skip inputs that don't need labels
      if (tagName === 'input' && SKIP_TYPES.test(attributes)) continue;

      // Fast path: check aria attributes
      if (ARIA_LABEL.test(attributes) || ARIA_LABELLEDBY.test(attributes) || TITLE_ATTR.test(attributes)) {
        continue;
      }

      // Check for id and corresponding label
      const idMatch = attributes.match(ID_ATTR);
      if (idMatch && hasLabelFor(idMatch[1])) {
        continue;
      }

      // Check for wrapping label (look backwards from input position)
      const searchStart = Math.max(0, position - 200);
      const contextBefore = content.substring(searchStart, position);
      const lastLabelOpen = contextBefore.lastIndexOf('<label');
      const lastLabelClose = contextBefore.lastIndexOf('</label');
      if (lastLabelOpen > -1 && lastLabelOpen > lastLabelClose) {
        continue; // Has wrapping label
      }

      // Check for Angular Material mat-form-field context
      const matStart = Math.max(0, position - 500);
      const matContext = content.substring(matStart, position);
      if (MAT_FORM_FIELD_OPEN.test(matContext) && !MAT_FORM_FIELD_CLOSE.test(matContext)) {
        // Inside mat-form-field, check for mat-label
        const matEnd = Math.min(content.length, position + 100);
        const matLabelContext = content.substring(matStart, matEnd);
        if (MAT_LABEL.test(matLabelContext)) {
          continue;
        }
        // Also check formControlName with mat-label
        if (FORM_CONTROL.test(attributes) && MAT_LABEL.test(matLabelContext)) {
          continue;
        }
      }

      // Create error message
      const snippet = fullMatch.substring(0, 80).replace(/\s+/g, ' ').trim();
      const truncated = fullMatch.length > 80 ? '...' : '';
      const lineNumber = getLineNumber(content, position);
      issues.push(format('FORM_MISSING_LABEL', {
        type: tagName,
        element: `${snippet}${truncated}`,
        line: lineNumber
      }));
    }

    return { pass: issues.length === 0, issues, elementsFound };
  }
};
