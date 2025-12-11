module.exports = {
  name: 'autofocusUsage',
  description: 'Autofocus can disorient screen reader users (WCAG 3.2.1)',
  tier: 'full',
  type: 'html',
  weight: 7,

  check(content) {
    const issues = [];

    // Pattern to match elements with autofocus attribute
    // Handles both autofocus="autofocus", autofocus="true", and standalone autofocus
    const autofocusPattern = /<(\w+)([^>]*?\s(?:autofocus(?:\s*=\s*["']?[^"'\s>]*["']?)?))([^>]*)>/gi;
    let match;

    while ((match = autofocusPattern.exec(content)) !== null) {
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

      issues.push(
        `Warning: Autofocus attribute detected. Automatically moving focus can disorient users, especially those using screen readers or keyboard navigation.\n` +
        `  How to fix:\n` +
        `    - Remove autofocus attribute unless absolutely necessary\n` +
        `    - For modals/dialogs, manage focus programmatically with proper context\n` +
        `    - Consider manual focus management with Angular's Renderer2 or CDK FocusTrap\n` +
        `    - If autofocus is required, ensure it's part of a logical focus sequence\n` +
        `  WCAG 2.4.3: Focus Order\n` +
        `  Found: ${elementIdentifier}`
      );
    }

    // Additional pattern for standalone autofocus attribute (boolean attribute)
    const standalonePattern = /<(\w+)\s+autofocus(?:\s|>|\/)/gi;

    while ((match = standalonePattern.exec(content)) !== null) {
      const tagName = match[1].toLowerCase();

      // Check if already reported (avoid duplicates)
      const isDuplicate = issues.some(issue =>
        issue.includes(`<${tagName}>`) && issue.includes('autofocus')
      );

      if (!isDuplicate) {
        issues.push(
          `Warning: Autofocus attribute detected. Automatically moving focus can disorient users, especially those using screen readers or keyboard navigation.\n` +
          `  How to fix:\n` +
          `    - Remove autofocus attribute unless absolutely necessary\n` +
          `    - For modals/dialogs, manage focus programmatically with proper context\n` +
          `    - Consider manual focus management with Angular's Renderer2 or CDK FocusTrap\n` +
          `    - If autofocus is required, ensure it's part of a logical focus sequence\n` +
          `  WCAG 2.4.3: Focus Order\n` +
          `  Found: <${tagName}> element`
        );
      }
    }

    return {
      pass: issues.length === 0,
      issues
    };
  }
};
