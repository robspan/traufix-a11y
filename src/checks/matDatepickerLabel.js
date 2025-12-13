const { format } = require('../core/errors');

module.exports = {
  name: 'matDatepickerLabel',
  description: 'Check that mat-datepicker input has proper labeling for accessibility',
  tier: 'full',
  type: 'html',
  weight: 3,

  check(content) {
    const issues = [];
    let elementsFound = 0;

    // Check 1: Find input elements with [matDatepicker] binding
    // The input should have aria-label OR be inside mat-form-field with mat-label
    const datepickerInputRegex = /<input[^>]*\[matDatepicker\]\s*=\s*["'][^"']*["'][^>]*>/gi;

    let inputMatch;
    let inputIndex = 0;
    while ((inputMatch = datepickerInputRegex.exec(content)) !== null) {
      inputIndex++;
      elementsFound++;
      const inputElement = inputMatch[0];

      // Check if input has aria-label or aria-labelledby
      const hasAriaLabel = /\[?aria-label\]?\s*=\s*["'][^"']+["']/i.test(inputElement);
      const hasAriaLabelledby = /\[?aria-labelledby\]?\s*=\s*["'][^"']+["']/i.test(inputElement);

      // Check if input is inside a mat-form-field with mat-label
      // We need to check the surrounding context
      const inputPosition = inputMatch.index;

      // Look for the closest mat-form-field opening tag before this input
      const contentBeforeInput = content.substring(0, inputPosition);
      const contentAfterInput = content.substring(inputPosition);

      // Find if there's an unclosed mat-form-field before this input
      const formFieldOpens = (contentBeforeInput.match(/<mat-form-field[^>]*>/gi) || []).length;
      const formFieldCloses = (contentBeforeInput.match(/<\/mat-form-field>/gi) || []).length;
      const isInsideFormField = formFieldOpens > formFieldCloses;

      let hasMatLabelInFormField = false;

      if (isInsideFormField) {
        // Find the last opening mat-form-field tag
        const lastFormFieldMatch = contentBeforeInput.match(/<mat-form-field[^>]*>(?![\s\S]*<mat-form-field)/i);
        if (lastFormFieldMatch) {
          const formFieldStart = contentBeforeInput.lastIndexOf(lastFormFieldMatch[0]);
          // Find the closing tag for this form field
          const afterFormFieldStart = content.substring(formFieldStart);
          const closingMatch = afterFormFieldStart.match(/<\/mat-form-field>/i);
          if (closingMatch) {
            const formFieldContent = afterFormFieldStart.substring(0, closingMatch.index);
            hasMatLabelInFormField = /<mat-label[^>]*>/i.test(formFieldContent);
          }
        }
      }

      if (!hasAriaLabel && !hasAriaLabelledby && !hasMatLabelInFormField) {
        issues.push(format('MAT_DATEPICKER_MISSING_LABEL', { element: inputElement }));
      }
    }

    // Check 2: Find mat-datepicker-toggle elements
    // The toggle button should have aria-label for screen readers
    const toggleRegex = /<mat-datepicker-toggle[^>]*>/gi;

    let toggleMatch;
    let toggleIndex = 0;
    while ((toggleMatch = toggleRegex.exec(content)) !== null) {
      toggleIndex++;
      elementsFound++;
      const toggleElement = toggleMatch[0];

      // Check if toggle has aria-label or aria-labelledby
      const hasAriaLabel = /\[?aria-label\]?\s*=\s*["'][^"']+["']/i.test(toggleElement);
      const hasAriaLabelledby = /\[?aria-labelledby\]?\s*=\s*["'][^"']+["']/i.test(toggleElement);

      if (!hasAriaLabel && !hasAriaLabelledby) {
        issues.push(format('MAT_DATEPICKER_MISSING_LABEL', { element: toggleElement }));
      }
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
