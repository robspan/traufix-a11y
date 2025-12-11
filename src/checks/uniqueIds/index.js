module.exports = {
  name: 'uniqueIds',
  description: 'IDs must be unique within the document (WCAG 4.1.1 Parsing)',
  tier: 'basic',
  type: 'html',
  weight: 10,
  wcag: '4.1.1',

  check(content) {
    const issues = [];

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

        issues.push(
          `[Error] Duplicate ID found. IDs must be unique for labels, ARIA references, and focus management\n` +
          `  How to fix:\n` +
          `    - Ensure each ID is unique in the document\n` +
          `  WCAG 4.1.1: Parsing | See: https://www.w3.org/TR/WCAG21/#parsing\n` +
          `  Found: <${elementTypes} id="${id}"> (${occurrences.length} occurrences)`
        );
      }
    }

    // Also check for empty id attributes
    const emptyIdPattern = /\bid=["'][\s]*["']/gi;
    const emptyMatches = content.match(emptyIdPattern);
    if (emptyMatches && emptyMatches.length > 0) {
      issues.push(
        `[Error] Empty ID attribute found. IDs must be unique for labels, ARIA references, and focus management\n` +
        `  How to fix:\n` +
        `    - Provide a meaningful ID value\n` +
        `    - Remove the id attribute entirely if not needed\n` +
        `  WCAG 4.1.1: Parsing | See: https://www.w3.org/TR/WCAG21/#parsing\n` +
        `  Found: id="" (${emptyMatches.length} occurrences)`
      );
    }

    // Check for IDs starting with numbers (invalid in CSS selectors, problematic)
    for (const [id] of idOccurrences) {
      if (/^\d/.test(id)) {
        issues.push(
          `[Error] ID starts with a number. IDs starting with numbers cannot be used in CSS selectors without escaping\n` +
          `  How to fix:\n` +
          `    - Prefix numeric IDs with a letter (e.g., "item-${id}" instead of "${id}")\n` +
          `  WCAG 4.1.1: Parsing | See: https://www.w3.org/TR/WCAG21/#parsing\n` +
          `  Found: id="${id}"`
        );
      }
    }

    return { pass: issues.length === 0, issues };
  }
};
