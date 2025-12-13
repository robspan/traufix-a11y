const { format } = require('../core/errors');

module.exports = {
  name: 'dlStructure',
  description: 'Definition lists contain only valid children (dt, dd, div)',
  tier: 'basic',
  type: 'html',
  weight: 7,
  wcag: '1.3.1',

  check(content) {
    const issues = [];
    let elementsFound = 0;
    const dlMatch = content.match(/<dl[^>]*>([\s\S]*?)<\/dl>/gi);

    if (dlMatch) {
      for (const dl of dlMatch) {
        elementsFound++;
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
          issues.push(format('DL_STRUCTURE_INVALID', { element: '<dl>' }));
        }
      }
    }

    return { pass: issues.length === 0, issues, elementsFound };
  }
};
