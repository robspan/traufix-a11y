module.exports = {
  name: 'matDatepickerLabel',
  description: 'Check that mat-datepicker input has proper labeling for accessibility',
  tier: 'full',
  type: 'html',
  weight: 3,

  check(content) {
    const issues = [];

    // Check 1: Find input elements with [matDatepicker] binding
    // The input should have aria-label OR be inside mat-form-field with mat-label
    const datepickerInputRegex = /<input[^>]*\[matDatepicker\]\s*=\s*["'][^"']*["'][^>]*>/gi;

    let inputMatch;
    let inputIndex = 0;
    while ((inputMatch = datepickerInputRegex.exec(content)) !== null) {
      inputIndex++;
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
        const snippet = inputElement.length > 80
          ? inputElement.substring(0, 80) + '...'
          : inputElement;
        issues.push(
          `[Error] Datepicker input #${inputIndex} is missing an accessible label. Screen readers cannot describe the purpose of this date input field.\n` +
          `  How to fix:\n` +
          `    - Add aria-label: <input [matDatepicker]="picker" aria-label="Select date">\n` +
          `    - Or use aria-labelledby: <input [matDatepicker]="picker" aria-labelledby="label-id">\n` +
          `    - Or place inside <mat-form-field> with <mat-label>Date</mat-label>\n` +
          `  WCAG 4.1.2: Name, Role, Value | See: https://material.angular.io/components/datepicker/overview#accessibility\n` +
          `  Found: ${snippet}`
        );
      }
    }

    // Check 2: Find mat-datepicker-toggle elements
    // The toggle button should have aria-label for screen readers
    const toggleRegex = /<mat-datepicker-toggle[^>]*>/gi;

    let toggleMatch;
    let toggleIndex = 0;
    while ((toggleMatch = toggleRegex.exec(content)) !== null) {
      toggleIndex++;
      const toggleElement = toggleMatch[0];

      // Check if toggle has aria-label or aria-labelledby
      const hasAriaLabel = /\[?aria-label\]?\s*=\s*["'][^"']+["']/i.test(toggleElement);
      const hasAriaLabelledby = /\[?aria-labelledby\]?\s*=\s*["'][^"']+["']/i.test(toggleElement);

      if (!hasAriaLabel && !hasAriaLabelledby) {
        const snippet = toggleElement.length > 80
          ? toggleElement.substring(0, 80) + '...'
          : toggleElement;
        issues.push(
          `[Error] mat-datepicker-toggle #${toggleIndex} is missing accessible label. Screen reader users need a label to understand the toggle button's purpose.\n` +
          `  How to fix:\n` +
          `    - Add aria-label: <mat-datepicker-toggle aria-label="Open date picker">\n` +
          `    - Or use aria-labelledby: <mat-datepicker-toggle aria-labelledby="label-id">\n` +
          `  WCAG 4.1.2: Name, Role, Value | See: https://material.angular.io/components/datepicker/overview#accessibility\n` +
          `  Found: ${snippet}`
        );
      }
    }

    return {
      pass: issues.length === 0,
      issues
    };
  }
};
