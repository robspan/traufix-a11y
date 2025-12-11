module.exports = {
  name: 'dlStructure',
  description: 'Definition lists contain only valid children (dt, dd, div)',
  tier: 'basic',
  type: 'html',
  weight: 7,
  wcag: '1.3.1',

  check(content) {
    const issues = [];
    const dlMatch = content.match(/<dl[^>]*>([\s\S]*?)<\/dl>/gi);

    if (dlMatch) {
      for (const dl of dlMatch) {
        // Get inner content of dl
        const inner = dl.replace(/<\/?dl[^>]*>/gi, '');

        // Remove valid elements completely (including their content)
        let stripped = inner
          .replace(/<dt[^>]*>[\s\S]*?<\/dt>/gi, '')
          .replace(/<dd[^>]*>[\s\S]*?<\/dd>/gi, '')
          .replace(/<div[^>]*>[\s\S]*?<\/div>/gi, '')
          .replace(/<!--[\s\S]*?-->/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        // Check for any remaining tags (invalid children)
        const invalidTags = stripped.match(/<[a-z][^>]*>/gi);
        if (invalidTags) {
          const message = `[Error] Invalid definition list structure. dl elements must have proper dt/dd pairs for accessibility
  How to fix:
    - Use dt (term) followed by dd (definition) inside dl
    - Only dt, dd, and div elements are allowed as direct children
  WCAG 1.3.1: Info and Relationships | See: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dl
  Found: <dl>`;
          issues.push(message);
        }
      }
    }

    return { pass: issues.length === 0, issues };
  }
};
