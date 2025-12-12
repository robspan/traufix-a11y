const { format } = require('../../core/errors');

module.exports = {
  name: 'objectAlt',
  description: 'Object elements have accessible name or fallback content',
  tier: 'basic',
  type: 'html',
  weight: 7,
  wcag: '1.1.1',

  check(content) {
    const issues = [];
    let elementsFound = 0;
    const objectRegex = /<object[^>]*>[\s\S]*?<\/object>/gi;

    let match;
    while ((match = objectRegex.exec(content)) !== null) {
      elementsFound++;
      const obj = match[0];

      const hasTitle = /\btitle\s*=\s*["'][^"']+["']/i.test(obj);
      const hasAriaLabel = /aria-label\s*=\s*["'][^"']+["']/i.test(obj);
      const hasAriaLabelledBy = /aria-labelledby\s*=\s*["'][^"']+["']/i.test(obj);

      // Check for fallback content (text content between <object> tags)
      const innerContent = obj.replace(/<object[^>]*>|<\/object>/gi, '').trim();
      // Make sure fallback is meaningful (not just whitespace/empty elements)
      const meaningfulFallback = innerContent.replace(/<[^>]*>/g, '').trim().length > 0;

      if (!hasTitle && !hasAriaLabel && !hasAriaLabelledBy && !meaningfulFallback) {
        // Extract just the opening object tag for the "Found" output
        const openingTag = obj.match(/<object[^>]*>/i)?.[0] || '<object>';
        issues.push(format('OBJECT_MISSING_ALT', { element: openingTag }));
      }
    }

    return { pass: issues.length === 0, issues, elementsFound };
  }
};
