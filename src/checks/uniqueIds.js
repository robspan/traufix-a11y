const { format } = require('../core/errors');

module.exports = {
  name: 'uniqueIds',
  description: 'IDs must be unique within the document (WCAG 4.1.1 Parsing)',
  tier: 'basic',
  type: 'html',
  weight: 10,
  wcag: '4.1.1',

  check(content) {
    // Early exit: no relevant elements, no issues
    if (!/\bid=/i.test(content)) {
      return { pass: true, issues: [], elementsFound: 0 };
    }

    const issues = [];
    let elementsFound = 0;

    // Match id attributes, excluding Angular/template syntax with {{ }}
    // Also handle unquoted IDs and various quote styles
    const idPatterns = [
      /\bid=["']([^"'{}]+)["']/gi,           // Standard quoted IDs
      /\bid=([^\s>"'{}]+)(?=[\s>])/gi,       // Unquoted IDs (less common but valid)
    ];

    const idOccurrences = new Map(); // Map of id -> array of context info

    for (const pattern of idPatterns) {
      let match;
      pattern.lastIndex = 0; // Reset regex state

      while ((match = pattern.exec(content)) !== null) {
        elementsFound++;
        const id = match[1].trim();

        // Skip empty IDs
        if (!id) continue;

        // Skip Angular/Vue template expressions
        if (id.includes('{{') || id.includes('}}')) continue;
        if (id.startsWith('[') || id.startsWith('(')) continue;

        // Skip IDs that look like template variables
        if (/^\$\{/.test(id) || /^<%/.test(id)) continue;

        // Get surrounding context for better error messages
        const startPos = Math.max(0, match.index - 50);
        const endPos = Math.min(content.length, match.index + match[0].length + 50);
        const context = content.substring(startPos, endPos).replace(/\s+/g, ' ').trim();

        // Extract the element tag if possible
        const tagMatch = content.substring(Math.max(0, match.index - 100), match.index + 1).match(/<(\w+)[^>]*$/);
        const elementTag = tagMatch ? tagMatch[1] : 'element';

        if (!idOccurrences.has(id)) {
          idOccurrences.set(id, []);
        }
        idOccurrences.get(id).push({ elementTag, context });
      }
    }

    // Report duplicates with helpful context
    for (const [id, occurrences] of idOccurrences) {
      if (occurrences.length > 1) {
        const elementTypes = [...new Set(occurrences.map(o => o.elementTag))].join(', ');
        const element = `<${elementTypes} id="${id}"> (${occurrences.length} occurrences)`;

        issues.push(format('ID_DUPLICATE', { id, element }));
      }
    }

    // Also check for empty id attributes
    const emptyIdPattern = /\bid=["'][\s]*["']/gi;
    const emptyMatches = content.match(emptyIdPattern);
    if (emptyMatches && emptyMatches.length > 0) {
      const element = `id="" (${emptyMatches.length} occurrences)`;
      issues.push(format('ID_DUPLICATE', { id: '(empty)', element }));
    }

    // Check for IDs starting with numbers (invalid in CSS selectors, problematic)
    for (const [id] of idOccurrences) {
      if (/^\d/.test(id)) {
        const element = `id="${id}"`;
        issues.push(format('ID_DUPLICATE', { id, element }));
      }
    }

    return { pass: issues.length === 0, issues, elementsFound };
  }
};
