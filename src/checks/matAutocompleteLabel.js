const { format } = require('../core/errors');

module.exports = {
  name: 'matAutocompleteLabel',
  description: 'Check that mat-autocomplete has proper labeling via aria-label or aria-labelledby on the input',
  tier: 'full',
  type: 'html',
  weight: 3,

  check(content) {
    // Early exit: no relevant elements, no issues
    if (!/mat-autocomplete/i.test(content)) {
      return { pass: true, issues: [], elementsFound: 0 };
    }

    const issues = [];
    let elementsFound = 0;

    /**
     * Helper to check if an input element has a valid accessible label
     * Handles both static attributes and Angular property bindings
     */
    function hasAccessibleLabel(attributes) {
      // Static aria-label with non-empty value
      const hasStaticAriaLabel = /aria-label\s*=\s*["'][^"']+["']/i.test(attributes);
      // Angular bound aria-label: [aria-label]="..." or [attr.aria-label]="..."
      const hasBoundAriaLabel = /\[aria-label\]\s*=\s*["'][^"']+["']/i.test(attributes) ||
                                /\[attr\.aria-label\]\s*=\s*["'][^"']+["']/i.test(attributes);
      // Static aria-labelledby
      const hasStaticAriaLabelledby = /aria-labelledby\s*=\s*["'][^"']+["']/i.test(attributes);
      // Angular bound aria-labelledby
      const hasBoundAriaLabelledby = /\[aria-labelledby\]\s*=\s*["'][^"']+["']/i.test(attributes) ||
                                     /\[attr\.aria-labelledby\]\s*=\s*["'][^"']+["']/i.test(attributes);

      return hasStaticAriaLabel || hasBoundAriaLabel || hasStaticAriaLabelledby || hasBoundAriaLabelledby;
    }

    /**
     * Check if an input is inside a mat-form-field that contains a mat-label
     */
    function isInsideLabeledFormField(content, inputIndex) {
      const beforeInput = content.substring(0, inputIndex);
      const afterInput = content.substring(inputIndex);

      // Find the last opening mat-form-field before this input
      const lastFormFieldOpen = beforeInput.lastIndexOf('<mat-form-field');
      const lastFormFieldClose = beforeInput.lastIndexOf('</mat-form-field');

      // If no mat-form-field or the last one was closed, input is not inside
      if (lastFormFieldOpen === -1 || lastFormFieldClose > lastFormFieldOpen) {
        return false;
      }

      // Find the closing tag of this mat-form-field
      const formFieldCloseAfterInput = afterInput.indexOf('</mat-form-field');
      if (formFieldCloseAfterInput === -1) {
        return false;
      }

      // Extract the mat-form-field content
      const formFieldContent = content.substring(lastFormFieldOpen, inputIndex + formFieldCloseAfterInput);

      // Check if this mat-form-field contains a mat-label
      return /<mat-label[^>]*>/i.test(formFieldContent);
    }

    // Pattern to match input elements with matAutocomplete binding
    // Matches both [matAutocomplete]="ref" and matAutocomplete="ref" syntaxes
    const autocompleteInputRegex = /<input([^>]*(?:\[matAutocomplete\]|matAutocomplete)\s*=\s*["'][^"']*["'][^>]*)>/gi;

    let match;

    while ((match = autocompleteInputRegex.exec(content)) !== null) {
      elementsFound++;
      const fullMatch = match[0];
      const attributes = match[1] || '';
      const inputIndex = match.index;

      // Check for accessible labeling
      const hasLabel = hasAccessibleLabel(attributes);
      const insideLabeledFormField = isInsideLabeledFormField(content, inputIndex);

      if (!hasLabel && !insideLabeledFormField) {
        issues.push(format('MAT_AUTOCOMPLETE_MISSING_LABEL', { element: fullMatch }));
      }
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
