module.exports = {
  name: 'emptyTableHeader',
  description: 'Table header elements must have accessible text content',
  tier: 'full',
  type: 'html',
  weight: 7,

  check(content) {
    const issues = [];

    // Pattern to match <th> elements and capture their content
    // Handles attributes and nested content
    const thPattern = /<th(\s[^>]*)?>([^<]*(?:<(?!\/th>)[^<]*)*)<\/th>/gi;
    let match;

    while ((match = thPattern.exec(content)) !== null) {
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
        issues.push(
          `[Error] Empty table header found. Screen readers cannot convey the meaning of table columns/rows without header text.\n` +
          `  How to fix:\n` +
          `    - Add descriptive text content to the <th> element\n` +
          `    - Or add an aria-label attribute with descriptive text\n` +
          `    - Or use aria-labelledby to reference another element with the header text\n` +
          `    - Or add visually hidden text using sr-only/visually-hidden classes\n` +
          `  WCAG 1.3.1: Info and Relationships\n` +
          `  Found: Empty <th> element`
        );
      }
    }

    return {
      pass: issues.length === 0,
      issues
    };
  }
};
