const { format } = require('../../core/errors');

module.exports = {
  name: 'emptyTableHeader',
  description: 'Table header elements must have accessible text content',
  tier: 'full',
  type: 'html',
  weight: 7,

  check(content) {
    const issues = [];
    let elementsFound = 0;

    // Pattern to match <th> elements and capture their content
    // Handles attributes and nested content
    const thPattern = /<th(\s[^>]*)?>([^<]*(?:<(?!\/th>)[^<]*)*)<\/th>/gi;
    let match;

    while ((match = thPattern.exec(content)) !== null) {
      elementsFound++;
      const attributes = match[1] || '';
      const thContent = match[2] || '';

      // Check if th has aria-label attribute (acceptable alternative)
      const hasAriaLabel = /aria-label\s*=\s*["'][^"']+["']/i.test(attributes);

      // Check if th has aria-labelledby attribute
      const hasAriaLabelledby = /aria-labelledby\s*=\s*["'][^"']+["']/i.test(attributes);

      // Check if content is empty or only whitespace
      const trimmedContent = thContent.replace(/<[^>]*>/g, '').trim();
      const hasVisibleContent = trimmedContent.length > 0;

      // Check for visually hidden text (common pattern)
      const hasScreenReaderText = /<span[^>]*class\s*=\s*["'][^"']*(?:sr-only|visually-hidden|screen-reader)[^"']*["'][^>]*>[^<]+<\/span>/i.test(thContent);

      if (!hasVisibleContent && !hasAriaLabel && !hasAriaLabelledby && !hasScreenReaderText) {
        issues.push(format('TABLE_EMPTY_HEADER', { element: '<th>' }));
      }
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
