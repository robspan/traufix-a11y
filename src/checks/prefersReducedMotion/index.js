module.exports = {
  name: 'prefersReducedMotion',
  description: 'Ensures animations and transitions include a prefers-reduced-motion media query to respect user preferences',
  tier: 'full',
  type: 'scss',
  weight: 3,

  check(content) {
    const issues = [];

    // Patterns to detect animation/transition usage
    const animationPattern = /animation\s*:/gi;
    const animationNamePattern = /animation-name\s*:/gi;
    const transitionPattern = /transition\s*:/gi;
    const keyframesPattern = /@keyframes\s+/gi;

    // Pattern to detect prefers-reduced-motion media query
    const reducedMotionPattern = /@media\s*\([^)]*prefers-reduced-motion[^)]*\)/gi;

    // Check for animation usage
    const hasAnimation = animationPattern.test(content) ||
                         animationNamePattern.test(content) ||
                         keyframesPattern.test(content);

    // Reset regex lastIndex
    animationPattern.lastIndex = 0;
    animationNamePattern.lastIndex = 0;
    keyframesPattern.lastIndex = 0;

    // Check for transition usage (excluding transition: none)
    const transitionMatches = content.match(transitionPattern);
    const hasTransition = transitionMatches &&
                          transitionMatches.some(match => {
                            // Get the value after the match
                            const idx = content.indexOf(match);
                            const valueStart = idx + match.length;
                            const valueEnd = content.indexOf(';', valueStart);
                            const value = content.substring(valueStart, valueEnd);
                            return !/none/i.test(value);
                          });

    // Check for prefers-reduced-motion
    const hasReducedMotionQuery = reducedMotionPattern.test(content);

    if ((hasAnimation || hasTransition) && !hasReducedMotionQuery) {
      const motionTypes = [];
      if (hasAnimation) motionTypes.push('animations');
      if (hasTransition) motionTypes.push('transitions');

      issues.push(
        `[Warning] File uses ${motionTypes.join(' and ')} without respecting user motion preferences. ` +
        `Users with vestibular disorders or motion sensitivity may experience nausea, dizziness, or discomfort.\n` +
        `  How to fix:\n` +
        `    - Wrap animations/transitions in @media (prefers-reduced-motion: reduce) { /* reduce or disable motion */ }\n` +
        `    - Provide alternative non-animated experiences for users who prefer reduced motion\n` +
        `    - Consider using prefers-reduced-motion: no-preference for motion-heavy features\n` +
        `  WCAG 2.3.3: Animation from Interactions (Level AAA)\n` +
        `  Found: ${motionTypes.join(' and ')} in file`
      );
    }

    return {
      pass: issues.length === 0,
      issues
    };
  }
};
