module.exports = {
  name: 'textJustify',
  description: 'Detects text-align: justify which creates uneven word spacing and causes readability issues for users with dyslexia',
  tier: 'full',
  type: 'scss',
  weight: 3,

  check(content) {
    const issues = [];

    // Pattern to find text-align: justify declarations
    const justifyPattern = /([\w\s.#\[\]='"~^$*|&>:+-]+)\s*\{[^}]*text-align\s*:\s*justify/gi;

    let match;

    while ((match = justifyPattern.exec(content)) !== null) {
      const selector = match[1].trim();

      issues.push(
        `[Warning] "${selector}" uses "text-align: justify" which creates uneven word spacing. ` +
        `This causes readability issues for users with dyslexia, cognitive disabilities, or low vision due to "rivers" of white space.\n` +
        `  How to fix:\n` +
        `    - Use "text-align: left" (or "start" for RTL language support) instead\n` +
        `    - If justification is required for design reasons, ensure text can be overridden by user stylesheets\n` +
        `    - Test readability with users who have cognitive disabilities\n` +
        `  WCAG 1.4.8: Visual Presentation (Level AAA)\n` +
        `  Found: text-align: justify on "${selector}"`
      );
    }

    return {
      pass: issues.length === 0,
      issues
    };
  }
};
