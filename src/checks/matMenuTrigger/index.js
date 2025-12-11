module.exports = {
  name: 'matMenuTrigger',
  description: 'Check that elements with [matMenuTriggerFor] have an accessible name',
  tier: 'full',
  type: 'html',
  weight: 3,
  wcag: '4.1.2',

  check(content) {
    const issues = [];

    // Match elements with matMenuTriggerFor or [matMenuTriggerFor]
    // This regex captures the entire element including its content
    const menuTriggerRegex = /<(\w+)[^>]*\[?matMenuTriggerFor\]?\s*=\s*["'][^"']*["'][^>]*>([\s\S]*?)<\/\1>|<(\w+)[^>]*\[?matMenuTriggerFor\]?\s*=\s*["'][^"']*["'][^>]*\/>/gi;

    let match;
    while ((match = menuTriggerRegex.exec(content)) !== null) {
      const fullMatch = match[0];
      const tagName = match[1] || match[3];
      const innerContent = match[2] || '';

      // Check for aria-label
      const hasAriaLabel = /aria-label\s*=\s*["'][^"']+["']/i.test(fullMatch);

      // Check for aria-labelledby
      const hasAriaLabelledby = /aria-labelledby\s*=\s*["'][^"']+["']/i.test(fullMatch);

      // Check for title attribute
      const hasTitle = /\stitle\s*=\s*["'][^"']+["']/i.test(fullMatch);

      // Check for meaningful text content (strip HTML tags and whitespace)
      const textContent = innerContent
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/\{\{[^}]*\}\}/g, 'placeholder') // Treat interpolations as content
        .trim();
      const hasTextContent = textContent.length > 0;

      // Check if it's a button with mat-icon-button (common pattern that still needs label)
      const isIconButton = /mat-icon-button/i.test(fullMatch);

      // For icon buttons, text content inside mat-icon doesn't count as accessible name
      if (isIconButton) {
        if (!hasAriaLabel && !hasAriaLabelledby && !hasTitle) {
          const snippet = fullMatch.length > 100 ? fullMatch.substring(0, 100) + '...' : fullMatch;
          issues.push(
            `[Error] matMenuTriggerFor missing accessible name. Screen readers need to announce menu button purpose\n` +
            `  How to fix:\n` +
            `    - Add aria-label to the trigger element\n` +
            `    - Add text content to the trigger element\n` +
            `  WCAG 4.1.2: Name, Role, Value | See: https://material.angular.io/components/menu/overview#accessibility\n` +
            `  Found: ${snippet}`
          );
        }
      } else if (!hasAriaLabel && !hasAriaLabelledby && !hasTitle && !hasTextContent) {
        const snippet = fullMatch.length > 100 ? fullMatch.substring(0, 100) + '...' : fullMatch;
        issues.push(
          `[Error] matMenuTriggerFor missing accessible name. Screen readers need to announce menu button purpose\n` +
          `  How to fix:\n` +
          `    - Add aria-label to the trigger element\n` +
          `    - Add text content to the trigger element\n` +
          `  WCAG 4.1.2: Name, Role, Value | See: https://material.angular.io/components/menu/overview#accessibility\n` +
          `  Found: ${snippet}`
        );
      }
    }

    return {
      pass: issues.length === 0,
      issues
    };
  }
};
