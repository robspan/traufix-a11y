const { format } = require('../../core/errors');

module.exports = {
  name: 'matFormFieldLabel',
  description: 'Check that mat-form-field contains a mat-label element for proper accessibility',
  tier: 'material',
  type: 'html',
  weight: 7,
  wcag: '1.3.1',

  check(content) {
    const issues = [];

    // Pattern to match mat-form-field elements with their content
    // Uses a non-greedy match to capture content between opening and closing tags
    const matFormFieldRegex = /<mat-form-field([^>]*)>([\s\S]*?)<\/mat-form-field>/gi;

    let match;

    while ((match = matFormFieldRegex.exec(content)) !== null) {
      const fullMatch = match[0];
      const fieldContent = match[2] || '';

      // Check if mat-label exists within the form field content
      const hasMatLabel = /<mat-label[^>]*>/i.test(fieldContent);

      if (!hasMatLabel) {
        issues.push(format('MAT_FORM_FIELD_MISSING_LABEL', { element: fullMatch }));
      }
    }

    return {
      pass: issues.length === 0,
      issues
    };
  }
};
