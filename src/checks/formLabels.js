const { format } = require('../core/errors');

module.exports = {
  name: 'formLabels',
  description: 'Form elements have labels',
  tier: 'basic',
  type: 'html',
  weight: 10,
  wcag: '1.3.1',

  check(content) {
    const issues = [];
    let elementsFound = 0;

    // Find all form elements with their positions
    const inputRegex = /<(input|select|textarea)([^>]*)>/gi;
    let match;

    while ((match = inputRegex.exec(content)) !== null) {
      elementsFound++;
      const tagName = match[1].toLowerCase();
      const attributes = match[2];
      const position = match.index;
      const fullMatch = match[0];

      // Skip inputs that don't need labels
      if (tagName === 'input') {
        if (/type\s*=\s*["'](hidden|submit|button|reset|image)["']/i.test(attributes)) continue;
      }

      // Check for aria-label (static or Angular binding)
      const hasAriaLabel = /aria-label\s*=/i.test(attributes) ||
                          /\[attr\.aria-label\]\s*=/i.test(attributes) ||
                          /\[aria-label\]\s*=/i.test(attributes);

      // Check for aria-labelledby
      const hasAriaLabelledBy = /aria-labelledby\s*=/i.test(attributes) ||
                                /\[attr\.aria-labelledby\]\s*=/i.test(attributes);

      // Check for title attribute
      const hasTitle = /\btitle\s*=/i.test(attributes) ||
                       /\[title\]\s*=/i.test(attributes);

      // Check for placeholder as fallback (not ideal but provides some context)
      const hasPlaceholder = /placeholder\s*=/i.test(attributes);

      // Check for id and corresponding label
      const idMatch = attributes.match(/\bid\s*=\s*["']([^"']+)["']/i);
      let hasLabelFor = false;
      if (idMatch) {
        // Escape special regex characters in id
        const escapedId = idMatch[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const labelRegex = new RegExp(`<label[^>]*\\bfor\\s*=\\s*["']${escapedId}["']`, 'i');
        hasLabelFor = labelRegex.test(content);
      }

      // Check for wrapping label (look backwards from input position)
      const contextBefore = content.substring(Math.max(0, position - 200), position);
      const contextAfter = content.substring(position, Math.min(content.length, position + 200));

      // Check if there's an unclosed <label> before this input
      const lastLabelOpen = contextBefore.lastIndexOf('<label');
      const lastLabelClose = contextBefore.lastIndexOf('</label');
      const hasWrappingLabel = lastLabelOpen > -1 && lastLabelOpen > lastLabelClose;

      // Check for Angular Material mat-form-field context
      // Look for mat-form-field wrapper or mat-label sibling
      const matContext = content.substring(Math.max(0, position - 500), Math.min(content.length, position + 100));
      const hasMatFormField = /<mat-form-field[^>]*>[\s\S]*$/i.test(matContext.substring(0, matContext.length - fullMatch.length)) &&
                              !/<\/mat-form-field>/i.test(matContext.substring(0, matContext.length - fullMatch.length));
      const hasMatLabel = /<mat-label[^>]*>[\s\S]*<\/mat-label>/i.test(matContext);

      // Check for formControlName with associated mat-label
      const hasFormControlWithMatLabel = /formControlName/i.test(attributes) && hasMatLabel;

      // Determine if element has a valid label
      const hasValidLabel = hasAriaLabel ||
                            hasAriaLabelledBy ||
                            hasLabelFor ||
                            hasWrappingLabel ||
                            hasTitle ||
                            hasMatFormField ||
                            hasMatLabel ||
                            hasFormControlWithMatLabel;

      if (!hasValidLabel) {
        // Create a more informative snippet
        const snippet = fullMatch.substring(0, 80).replace(/\s+/g, ' ').trim();
        const truncated = fullMatch.length > 80 ? '...' : '';

        issues.push(format('FORM_MISSING_LABEL', {
          type: tagName,
          element: `${snippet}${truncated}`
        }));
      }
    }

    return { pass: issues.length === 0, issues, elementsFound };
  }
};
