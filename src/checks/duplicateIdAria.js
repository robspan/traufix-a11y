const { format } = require('../core/errors');

module.exports = {
  name: 'duplicateIdAria',
  description: 'ARIA attributes must reference existing IDs in the document',
  tier: 'full',
  type: 'html',
  weight: 7,

  check(content) {
    // Early exit: no relevant elements, no issues
    if (!/aria-/i.test(content)) {
      return { pass: true, issues: [], elementsFound: 0 };
    }

    const issues = [];
    let elementsFound = 0;

    // First, collect all IDs defined in the document
    const idPattern = /\sid\s*=\s*["']([^"']+)["']/gi;
    const definedIds = new Set();
    const idCounts = new Map();
    let idMatch;

    while ((idMatch = idPattern.exec(content)) !== null) {
      elementsFound++;
      const id = idMatch[1];
      definedIds.add(id);
      idCounts.set(id, (idCounts.get(id) || 0) + 1);
    }

    // Check for duplicate IDs
    for (const [id, count] of idCounts) {
      if (count > 1) {
        issues.push(format('ID_DUPLICATE', { id }));
      }
    }

    // ARIA attributes that reference IDs (can contain space-separated ID lists)
    const ariaRefAttributes = [
      'aria-labelledby',
      'aria-describedby',
      'aria-controls',
      'aria-owns',
      'aria-flowto',
      'aria-activedescendant',
      'aria-details',
      'aria-errormessage'
    ];

    // Check each ARIA reference attribute
    ariaRefAttributes.forEach((attr) => {
      // Pattern to match the ARIA attribute and its value
      const ariaPattern = new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, 'gi');
      let ariaMatch;

      while ((ariaMatch = ariaPattern.exec(content)) !== null) {
        // ARIA attributes can reference multiple IDs separated by spaces
        const referencedIds = ariaMatch[1].split(/\s+/).filter(id => id.length > 0);

        referencedIds.forEach((refId) => {
          if (!definedIds.has(refId)) {
            issues.push(format('ARIA_REFERENCE_MISSING', {
              attr,
              id: refId,
              element: `${attr}="${refId}"`
            }));
          }
        });
      }
    });

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
