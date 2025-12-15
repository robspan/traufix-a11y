const { format } = require('../core/errors');

module.exports = {
  name: 'textJustify',
  description: 'Detects text-align: justify which creates uneven word spacing and causes readability issues for users with dyslexia',
  tier: 'full',
  type: 'scss',
  weight: 3,

  check(content) {
    // Early exit: no text-align: justify, no issues
    if (!/text-align\s*:\s*justify/i.test(content)) {
      return { pass: true, issues: [], elementsFound: 0 };
    }

    const issues = [];
    let elementsFound = 0;

    // Pattern to find text-align: justify declarations
    const justifyPattern = /([\w\s.#\[\]='"~^$*|&>:+-]+)\s*\{[^}]*text-align\s*:\s*justify/gi;

    let match;

    while ((match = justifyPattern.exec(content)) !== null) {
      elementsFound++;
      const selector = match[1].trim();

      issues.push(format('TEXT_JUSTIFY', {
        element: `"${selector}"`
      }));
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
