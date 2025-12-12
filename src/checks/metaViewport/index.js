const { format } = require('../../core/errors');

module.exports = {
  name: 'metaViewport',
  description: 'Meta viewport must allow user zooming for accessibility',
  tier: 'material',
  type: 'html',
  weight: 7,
  wcag: '1.4.4',

  check(content) {
    const issues = [];
    let elementsFound = 0;

    // Match meta viewport tag - handle both name="viewport" and name='viewport'
    // Also handle cases where name attribute comes after content
    const viewportRegex = /<meta\s+[^>]*name\s*=\s*["']viewport["'][^>]*>/gi;
    const viewportMatches = content.match(viewportRegex);

    if (!viewportMatches) {
      // No viewport meta tag - not necessarily an error for this check
      return { pass: true, issues: [], elementsFound };
    }

    for (const viewportTag of viewportMatches) {
      elementsFound++;
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
        issues.push(format('META_VIEWPORT_SCALABLE', { element: viewportTag }));
      }

      // Check for maximum-scale=1 or less (including 1.0)
      const maxScaleRegex = /maximum-scale\s*=\s*([0-9.]+)/i;
      const maxScaleMatch = viewportContent.match(maxScaleRegex);
      if (maxScaleMatch) {
        const maxScale = parseFloat(maxScaleMatch[1]);
        if (maxScale <= 1) {
          issues.push(format('META_VIEWPORT_SCALABLE', { element: viewportTag }));
        }
      }
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
