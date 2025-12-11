module.exports = {
  name: 'objectAlt',
  description: 'Object elements have accessible name or fallback content',
  tier: 'basic',
  type: 'html',
  weight: 7,
  wcag: '1.1.1',

  check(content) {
    const issues = [];
    const objectRegex = /<object[^>]*>[\s\S]*?<\/object>/gi;

    let match;
    while ((match = objectRegex.exec(content)) !== null) {
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
        issues.push(
          `[Error] Object element missing alternative text. Screen readers cannot describe embedded content without alternatives\n` +
          `  How to fix:\n` +
          `    - Add text content inside object as fallback\n` +
          `    - Use aria-label\n` +
          `  WCAG 1.1.1: Non-text Content | See: https://www.w3.org/TR/WCAG21/#non-text-content\n` +
          `  Found: ${openingTag}`
        );
      }
    }

    return { pass: issues.length === 0, issues };
  }
};
