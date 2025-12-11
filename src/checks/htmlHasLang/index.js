module.exports = {
  name: 'htmlHasLang',
  description: 'HTML element must have a valid lang attribute for screen readers and translation tools',
  tier: 'enhanced',
  type: 'html',
  weight: 7,
  wcag: '3.1.1',

  check(content) {
    const issues = [];

    // Match the <html> opening tag
    const htmlTagRegex = /<html\b([^>]*)>/i;
    const htmlMatch = content.match(htmlTagRegex);

    if (!htmlMatch) {
      // No <html> tag found - might be a fragment, skip check
      return { pass: true, issues: [] };
    }

    const htmlAttributes = htmlMatch[1];
    const htmlTag = htmlMatch[0];

    // Check for lang attribute with a value
    const langRegex = /\blang\s*=\s*["']([^"']*)["']/i;
    const langMatch = htmlAttributes.match(langRegex);

    if (!langMatch) {
      issues.push(
        `[Error] HTML element missing lang attribute. Screen readers use lang to select correct pronunciation\n` +
        `  How to fix:\n` +
        `    - Add lang="en" (or appropriate language code) to <html>\n` +
        `    - Use valid BCP 47 language tags (e.g., "en", "de", "fr", "en-US")\n` +
        `  WCAG 3.1.1: Language of Page | See: https://www.w3.org/WAI/WCAG21/Understanding/language-of-page\n` +
        `  Found: ${htmlTag}`
      );
      return { pass: false, issues };
    }

    const langValue = langMatch[1].trim();

    if (!langValue) {
      issues.push(
        `[Error] HTML element has empty lang attribute. Screen readers use lang to select correct pronunciation\n` +
        `  How to fix:\n` +
        `    - Add a valid language code (e.g., "en", "de", "fr")\n` +
        `    - Use valid BCP 47 language tags\n` +
        `  WCAG 3.1.1: Language of Page | See: https://www.w3.org/WAI/WCAG21/Understanding/language-of-page\n` +
        `  Found: ${htmlTag}`
      );
      return { pass: false, issues };
    }

    // Validate lang value format (basic check for BCP 47 format)
    // Examples: en, en-US, de, fr-CA, zh-Hans
    const validLangRegex = /^[a-z]{2,3}(-[A-Za-z]{2,4})?(-[A-Za-z]{2})?$/;
    if (!validLangRegex.test(langValue)) {
      issues.push(
        `[Error] HTML element has invalid lang value "${langValue}". Screen readers use lang to select correct pronunciation\n` +
        `  How to fix:\n` +
        `    - Use a valid BCP 47 language tag (e.g., "en", "en-US", "de")\n` +
        `    - Check the language code format\n` +
        `  WCAG 3.1.1: Language of Page | See: https://www.w3.org/WAI/WCAG21/Understanding/language-of-page\n` +
        `  Found: ${htmlTag}`
      );
      return { pass: false, issues };
    }

    return { pass: true, issues: [] };
  }
};
