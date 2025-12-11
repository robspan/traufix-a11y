module.exports = {
  name: 'duplicateIdAria',
  description: 'ARIA attributes must reference existing IDs in the document',
  tier: 'full',
  type: 'html',
  weight: 7,

  check(content) {
    const issues = [];

    // First, collect all IDs defined in the document
    const idPattern = /\sid\s*=\s*["']([^"']+)["']/gi;
    const definedIds = new Set();
    let idMatch;

    while ((idMatch = idPattern.exec(content)) !== null) {
      definedIds.add(idMatch[1]);
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
            issues.push(
              `[Error] ARIA attribute references non-existent ID. Screen readers cannot find the referenced element, breaking accessibility.\n` +
              `  How to fix:\n` +
              `    - Add an element with id="${refId}" to the document\n` +
              `    - Or correct the ${attr} attribute to reference an existing ID\n` +
              `    - Ensure IDs are unique and properly defined before being referenced\n` +
              `  WCAG 4.1.1: Parsing\n` +
              `  Found: ${attr}="${refId}" (ID does not exist)`
            );
          }
        });
      }
    });

    return {
      pass: issues.length === 0,
      issues
    };
  }
};
