const { format } = require('../core/errors');

// Properties that don't cause vestibular/motion issues
const SAFE_TRANSITION_PROPERTIES = [
  'opacity',
  'color',
  'background-color',
  'background',
  'border-color',
  'box-shadow',
  'fill',
  'stroke'
];

// Threshold for "imperceptible" motion (in seconds)
const SHORT_DURATION_THRESHOLD = 0.15;

/**
 * Parse a duration string (e.g., "0.3s", "150ms") and return seconds
 */
function parseDuration(durationStr) {
  if (!durationStr) return null;
  const trimmed = durationStr.trim().toLowerCase();

  // Match number followed by unit
  const match = trimmed.match(/^([\d.]+)(ms|s)?$/);
  if (!match) return null;

  const value = parseFloat(match[1]);
  const unit = match[2] || 's';

  if (isNaN(value)) return null;

  // Convert to seconds
  return unit === 'ms' ? value / 1000 : value;
}

/**
 * Check if a transition value only affects safe (non-motion) properties
 */
function isTransitionSafe(transitionValue) {
  if (!transitionValue || /none/i.test(transitionValue)) return true;

  // Split by comma for multiple transitions
  const parts = transitionValue.split(',').map(p => p.trim());

  for (const part of parts) {
    // Parse transition part: property duration timing-function delay
    const tokens = part.split(/\s+/);
    if (tokens.length === 0) continue;

    const property = tokens[0].toLowerCase();

    // Check if it's an "all" transition or a motion-causing property
    if (property === 'all') {
      // "all" transitions need reduced-motion handling
      return false;
    }

    // Check if property is NOT in the safe list
    if (!SAFE_TRANSITION_PROPERTIES.includes(property)) {
      // Check duration - if very short, it's safe
      const durationToken = tokens.find(t => /^[\d.]+(ms|s)?$/.test(t));
      const duration = parseDuration(durationToken);

      // If duration exists and is at or below threshold, it's safe
      if (duration !== null && duration <= SHORT_DURATION_THRESHOLD) {
        continue; // This part is safe due to short duration
      }

      // Property is not safe and duration is not short enough
      return false;
    }
  }

  // All transition parts are safe
  return true;
}

/**
 * Check if an animation declaration has a very short duration (imperceptible)
 */
function isAnimationShort(animationValue) {
  if (!animationValue || /none/i.test(animationValue)) return true;

  // Look for duration in the animation value
  // Animation shorthand: name duration timing-function delay iteration-count direction fill-mode play-state
  const tokens = animationValue.split(/\s+/);

  // Find duration token (first time-like value)
  for (const token of tokens) {
    const duration = parseDuration(token);
    if (duration !== null) {
      return duration <= SHORT_DURATION_THRESHOLD;
    }
  }

  // No duration found, assume default (not short)
  return false;
}

/**
 * Check if a prefers-reduced-motion media query properly disables animations
 * A valid media query must:
 * 1. Use 'reduce' value (not 'no-preference')
 * 2. Actually disable animations (animation: none, animation-play-state: paused, etc.)
 */
function hasValidReducedMotionHandling(content) {
  // Pattern for media query with 'reduce' value (the correct one)
  const reduceMediaPattern = /@media\s*\([^)]*prefers-reduced-motion\s*:\s*reduce[^)]*\)/gi;

  // Find all reduce media query blocks
  const mediaBlockRegex = /@media\s*\([^)]*prefers-reduced-motion\s*:\s*reduce[^)]*\)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/gi;

  let match;
  while ((match = mediaBlockRegex.exec(content)) !== null) {
    const mediaContent = match[1];

    // Check if the media query actually disables animations
    // Valid patterns: animation: none, animation-play-state: paused, animation-name: none
    const disablesAnimation =
      /animation\s*:\s*none/i.test(mediaContent) ||
      /animation-play-state\s*:\s*paused/i.test(mediaContent) ||
      /animation-name\s*:\s*none/i.test(mediaContent) ||
      /transition\s*:\s*none/i.test(mediaContent);

    if (disablesAnimation) {
      return true;
    }
  }

  // Also check for global patterns like * { animation: none } inside reduce media query
  const hasReduceMedia = reduceMediaPattern.test(content);
  if (hasReduceMedia) {
    // Reset regex
    reduceMediaPattern.lastIndex = 0;

    // Check for universal disable pattern in reduce media
    const universalDisablePattern = /@media\s*\([^)]*prefers-reduced-motion\s*:\s*reduce[^)]*\)\s*\{[^}]*\*[^}]*animation\s*:\s*none/gi;
    if (universalDisablePattern.test(content)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if content uses prefers-reduced-motion: no-preference incorrectly
 * Using no-preference doesn't help users who prefer reduced motion
 */
function usesNoPreferenceOnly(content) {
  const noPreferencePattern = /@media\s*\([^)]*prefers-reduced-motion\s*:\s*no-preference[^)]*\)/gi;
  const reducePattern = /@media\s*\([^)]*prefers-reduced-motion\s*:\s*reduce[^)]*\)/gi;

  const hasNoPreference = noPreferencePattern.test(content);
  const hasReduce = reducePattern.test(content);

  // If only no-preference is used (not reduce), it's a problem
  return hasNoPreference && !hasReduce;
}

module.exports = {
  name: 'prefersReducedMotion',
  description: 'Ensures animations and transitions include a prefers-reduced-motion media query to respect user preferences',
  tier: 'full',
  type: 'scss',
  weight: 3,

  check(content) {
    const issues = [];
    let elementsFound = 0;

    // Patterns to detect animation/transition usage
    const animationNamePattern = /animation-name\s*:/gi;

    // Check for animation usage that requires reduced-motion handling
    let hasProblematicAnimation = false;

    // Check animation: declarations
    let match;
    const animRegex = /animation\s*:\s*([^;]+);/gi;
    while ((match = animRegex.exec(content)) !== null) {
      elementsFound++;
      const animValue = match[1];
      if (!isAnimationShort(animValue)) {
        hasProblematicAnimation = true;
        break;
      }
    }

    // Check animation-name: declarations (these need duration check from animation-duration)
    if (!hasProblematicAnimation) {
      if (animationNamePattern.test(content)) {
        // If animation-name is used, check for animation-duration
        const durationMatch = content.match(/animation-duration\s*:\s*([^;]+);/i);
        if (durationMatch) {
          const duration = parseDuration(durationMatch[1].trim());
          if (duration === null || duration >= SHORT_DURATION_THRESHOLD) {
            hasProblematicAnimation = true;
          }
        } else {
          // No duration specified, assume default (needs handling)
          hasProblematicAnimation = true;
        }
      }
    }

    // Check for transition usage that requires reduced-motion handling
    let hasProblematicTransition = false;
    const transRegex = /transition\s*:\s*([^;]+);/gi;
    while ((match = transRegex.exec(content)) !== null) {
      elementsFound++;
      const transValue = match[1];
      if (!isTransitionSafe(transValue)) {
        hasProblematicTransition = true;
        break;
      }
    }

    // Skip if no problematic animations or transitions
    if (!hasProblematicAnimation && !hasProblematicTransition) {
      return { pass: true, issues: [], elementsFound };
    }

    // Check for proper reduced-motion handling
    const hasValidHandling = hasValidReducedMotionHandling(content);
    const usesOnlyNoPreference = usesNoPreferenceOnly(content);

    if (usesOnlyNoPreference) {
      // Using no-preference instead of reduce is wrong
      issues.push(format('MOTION_NO_REDUCED_MOTION', {
        element: 'File uses prefers-reduced-motion: no-preference instead of reduce'
      }));
    } else if (!hasValidHandling) {
      // Either no media query at all, or it doesn't actually disable animations
      const motionTypes = [];
      if (hasProblematicAnimation) motionTypes.push('animations');
      if (hasProblematicTransition) motionTypes.push('transitions');

      issues.push(format('MOTION_NO_REDUCED_MOTION', {
        element: `File uses ${motionTypes.join(' and ')} without properly disabling them in prefers-reduced-motion: reduce`
      }));
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
