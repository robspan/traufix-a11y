module.exports = {
  name: 'matSliderLabel',
  description: 'Check that mat-slider has proper labeling via aria-label or aria-labelledby',
  tier: 'full',
  type: 'html',
  weight: 3,

  check(content) {
    const issues = [];

    // Match mat-slider elements (both self-closing and with content)
    // Angular Material slider can be <mat-slider> with <input matSliderThumb> inside
    const matSliderRegex = /<mat-slider(?![a-z-])([^>]*)(?:\/>|>([\s\S]*?)<\/mat-slider>)/gi;

    let match;
    let sliderIndex = 0;
    while ((match = matSliderRegex.exec(content)) !== null) {
      sliderIndex++;
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
            const thumbType = /matSliderStartThumb/i.test(inputElement) ? 'start thumb' :
                              /matSliderEndThumb/i.test(inputElement) ? 'end thumb' : 'thumb';
            issues.push(
              `[Error] mat-slider #${sliderIndex} ${thumbType} input is missing an accessible name. Screen readers cannot identify the slider's purpose without a label.\n` +
              `  How to fix:\n` +
              `    - Add aria-label="Description" to the <input matSliderThumb> element\n` +
              `    - Or use aria-labelledby="id" to reference an existing label element\n` +
              `  WCAG 4.1.2: Name, Role, Value | See: https://material.angular.io/components/slider/overview#accessibility\n` +
              `  Found: ${inputElement.substring(0, 80).replace(/\s+/g, ' ').trim()}...`
            );
          }
        });
      } else {
        // Legacy mat-slider (pre-v15) or slider without explicit input
        // Check the mat-slider element itself
        if (!sliderHasAriaLabel && !sliderHasAriaLabelledby) {
          issues.push(
            `[Error] mat-slider #${sliderIndex} is missing an accessible name. Screen readers cannot identify the slider's purpose without a label.\n` +
            `  How to fix:\n` +
            `    - Add aria-label="Description" to the <mat-slider> element\n` +
            `    - Or use aria-labelledby="id" to reference an existing label element\n` +
            `  WCAG 4.1.2: Name, Role, Value | See: https://material.angular.io/components/slider/overview#accessibility\n` +
            `  Found: ${fullMatch.substring(0, 80).replace(/\s+/g, ' ').trim()}...`
          );
        }
      }
    }

    return {
      pass: issues.length === 0,
      issues
    };
  }
};
