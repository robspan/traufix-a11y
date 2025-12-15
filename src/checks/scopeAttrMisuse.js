module.exports = {
  name: 'scopeAttrMisuse',
  description: 'The scope attribute is only valid on <th> elements',
  tier: 'full',
  type: 'html',
  weight: 7,

  check(content) {
    // Early exit: no relevant elements, no issues
    if (!/scope=/i.test(content)) {
      return { pass: true, issues: [], elementsFound: 0 };
    }

    const issues = [];
    let elementsFound = 0;
    const seenElements = new Set();

    // Pattern to find any opening tag with scope attribute
    // Handles: <tag scope="value">, <tag attr scope="value">, <tag\n  scope="value">
    const tagWithScopePattern = /<(\w+)(?:\s[^>]*)?\s+scope\s*=\s*["']([^"']*)["'][^>]*>/gi;
    let match;

    while ((match = tagWithScopePattern.exec(content)) !== null) {
      elementsFound++;
      const fullMatch = match[0];
      const tagName = match[1].toLowerCase();
      const scopeValue = match[2];

      // scope is only valid on <th> elements
      if (tagName !== 'th') {
        // Create unique key to avoid duplicates
        const key = `${tagName}:${match.index}`;
        if (!seenElements.has(key)) {
          seenElements.add(key);

          // Determine the context for better error message
          const validValues = ['row', 'col', 'rowgroup', 'colgroup'];
          const valueInfo = validValues.includes(scopeValue)
            ? ` with value "${scopeValue}"`
            : scopeValue
              ? ` with invalid value "${scopeValue}"`
              : '';

          issues.push(
            `[Error] Invalid "scope" attribute on <${tagName}> element${valueInfo}. ` +
            `The scope attribute is only valid on <th> elements and helps screen readers understand table structure.\n` +
            `  How to fix:\n` +
            `    - Remove the scope attribute from <${tagName}> element\n` +
            `    - If this should be a header cell, change <${tagName}> to <th> and use scope="row" or scope="col"\n` +
            `    - Use scope="rowgroup" or scope="colgroup" for headers spanning multiple rows/columns\n` +
            `  WCAG 1.3.1: Info and Relationships (Level A)\n` +
            `  Found: <${tagName}> with scope attribute`
          );
        }
      }
    }

    // Also check for scope as first attribute (edge case)
    const scopeFirstPattern = /<(\w+)\s+scope\s*=\s*["']([^"']*)["']/gi;

    while ((match = scopeFirstPattern.exec(content)) !== null) {
      elementsFound++;
      const tagName = match[1].toLowerCase();
      const scopeValue = match[2];

      if (tagName !== 'th') {
        const key = `${tagName}:${match.index}`;
        if (!seenElements.has(key)) {
          seenElements.add(key);

          issues.push(
            `[Error] Invalid "scope" attribute on <${tagName}> element. ` +
            `The scope attribute is only valid on <th> elements and helps screen readers understand table structure.\n` +
            `  How to fix:\n` +
            `    - Remove the scope attribute from <${tagName}> element\n` +
            `    - If this should be a header cell, change <${tagName}> to <th> and use scope="row" or scope="col"\n` +
            `    - Use scope="rowgroup" or scope="colgroup" for headers spanning multiple rows/columns\n` +
            `  WCAG 1.3.1: Info and Relationships (Level A)\n` +
            `  Found: <${tagName}> with scope attribute`
          );
        }
      }
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
