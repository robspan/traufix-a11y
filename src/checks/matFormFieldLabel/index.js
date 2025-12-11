module.exports = {
  name: 'matFormFieldLabel',
  description: 'Check that mat-form-field contains a mat-label element for proper accessibility',
  tier: 'enhanced',
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
        // Create a truncated snippet for the error message
        const snippet = fullMatch.length > 100
          ? fullMatch.substring(0, 100) + '...'
          : fullMatch;
        issues.push(
          `[Error] mat-form-field missing mat-label. Form fields need visible labels for accessibility\n` +
          `  How to fix:\n` +
          `    - Add <mat-label>Label text</mat-label> inside mat-form-field\n` +
          `  WCAG 1.3.1: Info and Relationships | See: https://material.angular.io/components/form-field/overview#accessibility\n` +
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
