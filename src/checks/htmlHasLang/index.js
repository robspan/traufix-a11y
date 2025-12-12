const { format } = require('../../core/errors');

module.exports = {
  name: 'htmlHasLang',
  description: 'HTML element must have a valid lang attribute for screen readers and translation tools',
  tier: 'material',
  type: 'html',
  weight: 7,
  wcag: '3.1.1',

  check(content) {
    const issues = [];
    let elementsFound = 0;

    // Match the <html> opening tag
    const htmlTagRegex = /<html\b([^>]*)>/i;
    const htmlMatch = content.match(htmlTagRegex);

    if (!htmlMatch) {
      // No <html> tag found - might be a fragment, skip check
      return { pass: true, issues: [], elementsFound };
    }

    elementsFound++;

    const htmlAttributes = htmlMatch[1];
    const htmlTag = htmlMatch[0];

    // Check for lang attribute with a value
    const langRegex = /\blang\s*=\s*["']([^"']*)["']/i;
    const langMatch = htmlAttributes.match(langRegex);

    if (!langMatch) {
      issues.push(format('HTML_MISSING_LANG', { element: htmlTag }));
      return { pass: false, issues, elementsFound };
    }

    const langValue = langMatch[1].trim();

    if (!langValue) {
      issues.push(format('HTML_MISSING_LANG', { element: htmlTag }));
      return { pass: false, issues, elementsFound };
    }

    // Validate lang value format (basic check for BCP 47 format)
    // Examples: en, en-US, de, fr-CA, zh-Hans
    const validLangRegex = /^[a-z]{2,3}(-[A-Za-z]{2,4})?(-[A-Za-z]{2})?$/;
    if (!validLangRegex.test(langValue)) {
      issues.push(format('HTML_MISSING_LANG', { element: htmlTag }));
      return { pass: false, issues, elementsFound };
    }

    return { pass: true, issues: [], elementsFound };
  }
};
