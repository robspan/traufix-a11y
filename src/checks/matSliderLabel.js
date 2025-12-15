const { format } = require('../core/errors');

module.exports = {
  name: 'matSliderLabel',
  description: 'Check that mat-slider has proper labeling via aria-label or aria-labelledby',
  tier: 'full',
  type: 'html',
  weight: 3,

  check(content) {
    // Early exit: no relevant elements, no issues
    if (!/mat-slider/i.test(content)) {
      return { pass: true, issues: [], elementsFound: 0 };
    }

    const issues = [];
    let elementsFound = 0;

    // Match mat-slider elements (both self-closing and with content)
    // Angular Material slider can be <mat-slider> with <input matSliderThumb> inside
    const matSliderRegex = /<mat-slider(?![a-z-])([^>]*)(?:\/>|>([\s\S]*?)<\/mat-slider>)/gi;

    let match;
    let sliderIndex = 0;
    while ((match = matSliderRegex.exec(content)) !== null) {
      sliderIndex++;
      elementsFound++;
      const fullMatch = match[0];
      const sliderAttrs = match[1] || '';
      const sliderContent = match[2] || '';

      // Check if the mat-slider itself has aria-label or aria-labelledby
      const sliderHasAriaLabel = /\[?aria-label\]?\s*=\s*["'][^"']+["']/i.test(sliderAttrs);
      const sliderHasAriaLabelledby = /\[?aria-labelledby\]?\s*=\s*["'][^"']+["']/i.test(sliderAttrs);

      // Check for input with matSliderThumb inside (Angular Material 15+ pattern)
      // Also check for matSliderStartThumb and matSliderEndThumb for range sliders
      const thumbInputs = sliderContent.match(/<input[^>]*matSlider(?:Thumb|StartThumb|EndThumb)[^>]*>/gi) || [];

      if (thumbInputs.length > 0) {
        // Angular Material 15+ with explicit thumb inputs
        thumbInputs.forEach((inputElement, idx) => {
          const inputHasAriaLabel = /\[?aria-label\]?\s*=\s*["'][^"']+["']/i.test(inputElement);
          const inputHasAriaLabelledby = /\[?aria-labelledby\]?\s*=\s*["'][^"']+["']/i.test(inputElement);

          // Also check for formControlName which often comes with proper labeling
          const hasFormControl = /formControlName\s*=\s*["'][^"']+["']/i.test(inputElement);

          if (!inputHasAriaLabel && !inputHasAriaLabelledby) {
            const snippet = inputElement.substring(0, 80).replace(/\s+/g, ' ').trim() + '...';
            issues.push(format('MAT_SLIDER_MISSING_LABEL', { element: snippet }));
          }
        });
      } else {
        // Legacy mat-slider (pre-v15) or slider without explicit input
        // Check the mat-slider element itself
        if (!sliderHasAriaLabel && !sliderHasAriaLabelledby) {
          const snippet = fullMatch.substring(0, 80).replace(/\s+/g, ' ').trim() + '...';
          issues.push(format('MAT_SLIDER_MISSING_LABEL', { element: snippet }));
        }
      }
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
