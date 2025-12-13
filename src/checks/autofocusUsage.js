const { format } = require('../core/errors');

module.exports = {
  name: 'autofocusUsage',
  description: 'Autofocus can disorient screen reader users (WCAG 3.2.1)',
  tier: 'full',
  type: 'html',
  weight: 7,

  check(content) {
    const issues = [];
    let elementsFound = 0;

    // Pattern to match elements with autofocus attribute
    // Handles both autofocus="autofocus", autofocus="true", and standalone autofocus
    const autofocusPattern = /<(\w+)([^>]*?\s(?:autofocus(?:\s*=\s*["']?[^"'\s>]*["']?)?))([^>]*)>/gi;
    let match;

    while ((match = autofocusPattern.exec(content)) !== null) {
      elementsFound++;
      const tagName = match[1].toLowerCase();

      // Try to extract identifying information about the element
      const fullAttributes = (match[2] || '') + (match[3] || '');
      const idMatch = fullAttributes.match(/\sid\s*=\s*["']([^"']+)["']/i);
      const nameMatch = fullAttributes.match(/\sname\s*=\s*["']([^"']+)["']/i);
      const typeMatch = fullAttributes.match(/\stype\s*=\s*["']([^"']+)["']/i);

      let elementIdentifier = `<${tagName}>`;
      if (idMatch) {
        elementIdentifier += ` with id="${idMatch[1]}"`;
      } else if (nameMatch) {
        elementIdentifier += ` with name="${nameMatch[1]}"`;
      } else if (typeMatch) {
        elementIdentifier += ` of type="${typeMatch[1]}"`;
      }

      issues.push(format('AUTOFOCUS_MISUSE', { element: elementIdentifier }));
    }

    // Additional pattern for standalone autofocus attribute (boolean attribute)
    const standalonePattern = /<(\w+)\s+autofocus(?:\s|>|\/)/gi;

    while ((match = standalonePattern.exec(content)) !== null) {
      elementsFound++;
      const tagName = match[1].toLowerCase();

      // Check if already reported (avoid duplicates)
      const isDuplicate = issues.some(issue =>
        issue.includes(`<${tagName}>`) && issue.includes('autofocus')
      );

      if (!isDuplicate) {
        issues.push(format('AUTOFOCUS_MISUSE', { element: `<${tagName}> element` }));
      }
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
