module.exports = {
  name: 'cdkAriaDescriber',
  description: 'Complex widgets have aria-describedby for usage instructions',
  tier: 'full',
  type: 'html',
  weight: 3,

  check(content) {
    const issues = [];

    // Find line number for a match position
    const getLineNumber = (pos) => {
      return content.substring(0, pos).split('\n').length;
    };

    // Complex widget roles that often benefit from descriptions
    const complexWidgetRoles = ['listbox', 'tree', 'grid', 'treegrid'];

    // Build pattern to match any of the complex widget roles
    const rolesPattern = complexWidgetRoles.join('|');
    const complexWidgetPattern = new RegExp(
      `<(\\w+[-\\w]*)([^>]*)\\brole\\s*=\\s*["'](${rolesPattern})["']([^>]*)>`,
      'gi'
    );

    // Pattern to check for aria-describedby (standard HTML and Angular bindings)
    const hasAriaDescribedBy = (elementString) => {
      return /\baria-describedby\s*=/i.test(elementString) ||
             /\[attr\.aria-describedby\]\s*=/i.test(elementString) ||
             /\[aria-describedby\]\s*=/i.test(elementString);
    };

    // Helper to extract element snippet for reporting
    const getSnippet = (match) => {
      const snippet = match.length > 80 ? match.substring(0, 80) + '...' : match;
      return snippet.replace(/\s+/g, ' ').trim();
    };

    // Role-specific instruction suggestions
    const instructionExamples = {
      listbox: 'Use arrow keys to navigate options, Enter to select',
      tree: 'Use arrow keys to navigate, Enter to expand/collapse nodes',
      grid: 'Use arrow keys to navigate cells, Enter to edit',
      treegrid: 'Use arrow keys to navigate, Enter to expand/collapse or edit'
    };

    let match;
    while ((match = complexWidgetPattern.exec(content)) !== null) {
      const elementString = match[0];
      const role = match[3].toLowerCase(); // The captured role value
      const lineNumber = getLineNumber(match.index);

      if (!hasAriaDescribedBy(elementString)) {
        const exampleInstruction = instructionExamples[role] || 'keyboard navigation instructions';
        issues.push(
          `Warning: Complex widget lacks usage instructions. Screen reader users may not understand how to interact with this custom widget.\n` +
          `  How to fix:\n` +
          `    - Create an element containing usage instructions (e.g., "${exampleInstruction}")\n` +
          `    - Give the instructions element a unique id (e.g., id="widget-instructions")\n` +
          `    - Link the widget to instructions with aria-describedby="widget-instructions"\n` +
          `    - Alternatively, use Angular CDK's AriaDescriber service programmatically\n` +
          `  WCAG 4.1.2: Name, Role, Value\n` +
          `  Found: role="${role}" widget at line ${lineNumber}: "${getSnippet(elementString)}"`
        );
      }
    }

    return {
      pass: issues.length === 0,
      issues
    };
  }
};
