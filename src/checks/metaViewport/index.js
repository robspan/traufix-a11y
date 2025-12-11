module.exports = {
  name: 'metaViewport',
  description: 'Meta viewport must allow user zooming for accessibility',
  tier: 'enhanced',
  type: 'html',
  weight: 7,
  wcag: '1.4.4',

  check(content) {
    const issues = [];

    // Match meta viewport tag - handle both name="viewport" and name='viewport'
    // Also handle cases where name attribute comes after content
    const viewportRegex = /<meta\s+[^>]*name\s*=\s*["']viewport["'][^>]*>/gi;
    const viewportMatches = content.match(viewportRegex);

    if (!viewportMatches) {
      // No viewport meta tag - not necessarily an error for this check
      return { pass: true, issues: [] };
    }

    for (const viewportTag of viewportMatches) {
      // Extract content attribute value
      const contentRegex = /content\s*=\s*["']([^"']*)["']/i;
      const contentMatch = viewportTag.match(contentRegex);

      if (!contentMatch) {
        continue;
      }

      const viewportContent = contentMatch[1].toLowerCase();

      // Check for user-scalable=no, user-scalable=0, or user-scalable=false
      const userScalableNoRegex = /user-scalable\s*=\s*(no|0|false)/i;
      if (userScalableNoRegex.test(viewportContent)) {
        issues.push(
          `[Error] Viewport meta prevents user scaling. Users with low vision need to zoom content\n` +
          `  How to fix:\n` +
          `    - Remove user-scalable=no from the viewport meta tag\n` +
          `    - Set user-scalable=yes if explicitly needed\n` +
          `  WCAG 1.4.4: Resize Text | See: https://www.w3.org/WAI/WCAG21/Understanding/resize-text\n` +
          `  Found: ${viewportTag}`
        );
      }

      // Check for maximum-scale=1 or less (including 1.0)
      const maxScaleRegex = /maximum-scale\s*=\s*([0-9.]+)/i;
      const maxScaleMatch = viewportContent.match(maxScaleRegex);
      if (maxScaleMatch) {
        const maxScale = parseFloat(maxScaleMatch[1]);
        if (maxScale <= 1) {
          issues.push(
            `[Error] Viewport meta prevents user scaling with maximum-scale=${maxScaleMatch[1]}. Users with low vision need to zoom content\n` +
            `  How to fix:\n` +
            `    - Remove maximum-scale restriction entirely\n` +
            `    - Set maximum-scale to at least 5.0 if needed\n` +
            `  WCAG 1.4.4: Resize Text | See: https://www.w3.org/WAI/WCAG21/Understanding/resize-text\n` +
            `  Found: ${viewportTag}`
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
