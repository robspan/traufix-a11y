const { format } = require('../core/errors');

module.exports = {
  name: 'matStepLabel',
  description: 'Check that mat-step has a label (via label attribute or mat-step-label element)',
  tier: 'full',
  type: 'html',
  weight: 3,

  check(content) {
    // Early exit: no relevant elements, no issues
    if (!/mat-step/i.test(content)) {
      return { pass: true, issues: [], elementsFound: 0 };
    }

    const issues = [];
    let elementsFound = 0;

    // Match mat-step elements (use negative lookahead to not match mat-stepper, mat-step-label, etc.)
    const stepRegex = /<mat-step(?![a-z-])([^>]*)>([\s\S]*?)<\/mat-step>|<mat-step(?![a-z-])([^>]*)\/>/gi;

    let match;
    let stepIndex = 0;
    while ((match = stepRegex.exec(content)) !== null) {
      elementsFound++;
      stepIndex++;
      const attributes = match[1] || match[3] || '';
      const stepContent = match[2] || '';

      // Check for label attribute (static or interpolated)
      const hasLabel = /(?:^|\s)label\s*=\s*["'][^"']+["']/i.test(attributes);

      // Check for [label] binding (Angular property binding)
      const hasLabelBinding = /(?:^|\s)\[label\]\s*=\s*["'][^"']*["']/i.test(attributes);

      // Check for aria-label (static or binding)
      const hasAriaLabel = /(?:^|\s)\[?aria-label\]?\s*=\s*["'][^"']+["']/i.test(attributes);

      // Check for aria-labelledby (static or binding)
      const hasAriaLabelledby = /(?:^|\s)\[?aria-labelledby\]?\s*=\s*["'][^"']+["']/i.test(attributes);

      // Check for ng-template with matStepLabel directive
      // Handles both <ng-template matStepLabel> and <ng-template #ref matStepLabel>
      const hasMatStepLabel = /<ng-template[^>]*\bmatStepLabel\b[^>]*>[\s\S]*?<\/ng-template>/i.test(stepContent);

      // Check for stepControl which implies programmatic labeling
      const hasStepControl = /\[?stepControl\]?\s*=/i.test(attributes);

      if (!hasLabel && !hasLabelBinding && !hasAriaLabel && !hasAriaLabelledby && !hasMatStepLabel) {
        issues.push(format('MAT_STEPPER_MISSING_LABEL', { element: `mat-step #${stepIndex}` }));
      }
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
