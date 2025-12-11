module.exports = {
  name: 'matButtonType',
  description: 'Check that Material button directives are only applied to <button> or <a> elements',
  tier: 'enhanced',
  type: 'html',
  weight: 7,
  wcag: '4.1.2',

  check(content) {
    const issues = [];

    // List of mat-button directive variants
    const buttonDirectives = [
      'mat-button',
      'mat-raised-button',
      'mat-flat-button',
      'mat-stroked-button',
      'mat-icon-button',
      'mat-fab',
      'mat-mini-fab'
    ];

    // Create regex pattern to match any element with mat-button directives
    // This matches the opening tag of any element
    const elementRegex = /<([a-z][a-z0-9-]*)\s([^>]*?)>/gi;

    let match;

    while ((match = elementRegex.exec(content)) !== null) {
      const tagName = match[1].toLowerCase();
      const attributes = match[2] || '';
      const fullMatch = match[0];

      // Check if any mat-button directive is present
      let foundDirective = null;
      for (const directive of buttonDirectives) {
        // Match directive as attribute (with or without value)
        const directiveRegex = new RegExp(`\\b${directive}\\b`, 'i');
        if (directiveRegex.test(attributes)) {
          foundDirective = directive;
          break;
        }
      }

      // If a button directive was found, verify it's on a valid element
      if (foundDirective) {
        const validElements = ['button', 'a'];
        if (!validElements.includes(tagName)) {
          const snippet = fullMatch.length > 80 ? fullMatch.substring(0, 80) + '...' : fullMatch;
          issues.push(
            `[Error] mat-button directive on non-button element. Semantic role is lost when mat-button is on div/span\n` +
            `  How to fix:\n` +
            `    - Use mat-button only on <button> or <a> elements\n` +
            `  WCAG 4.1.2: Name, Role, Value | See: https://material.angular.io/components/button/overview#accessibility\n` +
            `  Found: ${snippet}`
          );
        }
      }
    }

    return {
      pass: issues.length === 0,
      issues
    };
  }
};
