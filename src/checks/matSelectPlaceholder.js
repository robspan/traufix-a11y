const { format } = require('../core/errors');

module.exports = {
  name: 'matSelectPlaceholder',
  description: 'Check that mat-select uses mat-label instead of relying solely on placeholder attribute',
  tier: 'full',
  type: 'html',
  weight: 7,
  wcag: '1.3.1',

  check(content) {
    // Early exit: no relevant elements, no issues
    if (!/mat-select/i.test(content)) {
      return { pass: true, issues: [], elementsFound: 0 };
    }

    const issues = [];
    let elementsFound = 0;

    // Find all mat-form-field elements containing mat-select
    const matFormFieldRegex = /<mat-form-field([^>]*)>([\s\S]*?)<\/mat-form-field>/gi;

    // Standalone mat-select (not in form-field)
    const standaloneSelectRegex = /<mat-select([^>]*)>/gi;

    let match;

    // Check mat-select within mat-form-field
    while ((match = matFormFieldRegex.exec(content)) !== null) {
      const fieldContent = match[2] || '';

      // Check if this form-field contains a mat-select
      const selectMatch = /<mat-select([^>]*)>/i.exec(fieldContent);
      if (selectMatch) {
        elementsFound++;
        const selectAttributes = selectMatch[1] || '';
        const hasPlaceholder = /\bplaceholder\s*=\s*["'][^"']+["']/i.test(selectAttributes);
        const hasMatLabel = /<mat-label[^>]*>/i.test(fieldContent);

        // Issue: has placeholder but no mat-label
        if (hasPlaceholder && !hasMatLabel) {
          const snippet = selectMatch[0].length > 80
            ? selectMatch[0].substring(0, 80) + '...'
            : selectMatch[0];
          issues.push(format('MAT_SELECT_MISSING_LABEL', { element: snippet }));
        }
      }
    }

    // Check for standalone mat-select with placeholder (outside mat-form-field)
    // Reset regex state
    standaloneSelectRegex.lastIndex = 0;

    while ((match = standaloneSelectRegex.exec(content)) !== null) {
      const fullMatch = match[0];
      const attributes = match[1] || '';

      // Check if this select is inside a mat-form-field (skip if so, handled above)
      const beforeSelect = content.substring(0, match.index);
      const lastFormFieldOpen = beforeSelect.lastIndexOf('<mat-form-field');
      const lastFormFieldClose = beforeSelect.lastIndexOf('</mat-form-field');

      // If inside a mat-form-field, skip (already handled)
      if (lastFormFieldOpen > lastFormFieldClose) {
        continue;
      }

      elementsFound++;
      const hasPlaceholder = /\bplaceholder\s*=\s*["'][^"']+["']/i.test(attributes);
      const hasAriaLabel = /aria-label\s*=\s*["'][^"']+["']/i.test(attributes);
      const hasAriaLabelledby = /aria-labelledby\s*=\s*["'][^"']+["']/i.test(attributes);

      if (hasPlaceholder && !hasAriaLabel && !hasAriaLabelledby) {
        const snippet = fullMatch.length > 80 ? fullMatch.substring(0, 80) + '...' : fullMatch;
        issues.push(format('MAT_SELECT_MISSING_LABEL', { element: snippet }));
      }
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
