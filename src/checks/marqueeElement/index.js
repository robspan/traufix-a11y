module.exports = {
  name: 'marqueeElement',
  description: 'The deprecated <marquee> element is inaccessible and should not be used',
  tier: 'enhanced',
  type: 'html',
  weight: 7,

  check(content) {
    const issues = [];

    // Match marquee elements (opening tag)
    const marqueeRegex = /<marquee\b[^>]*>/gi;
    const marqueeMatches = content.match(marqueeRegex);

    if (marqueeMatches && marqueeMatches.length > 0) {
      issues.push(
        `[Error] Found ${marqueeMatches.length} <marquee> element(s). ` +
        `The deprecated <marquee> element creates automatically moving content that users cannot control. ` +
        `Moving text is difficult to read and causes problems for users with attention or reading disabilities.\n` +
        `  How to fix:\n` +
        `    - Remove <marquee> elements and use static text instead\n` +
        `    - If animation is necessary, use CSS animations with pause/play controls\n` +
        `    - Implement prefers-reduced-motion media query to respect user preferences\n` +
        `    - Provide controls to pause, stop, or hide moving content\n` +
        `    - Example: @media (prefers-reduced-motion: reduce) { animation: none; }\n` +
        `  WCAG 2.2.2: Pause, Stop, Hide\n` +
        `  Found: ${marqueeMatches.length} <marquee> element(s)`
      );
    }

    return {
      pass: issues.length === 0,
      issues
    };
  }
};
