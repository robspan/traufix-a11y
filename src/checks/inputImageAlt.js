const { format } = require('../core/errors');

/**
 * Gets the line number for a given index in the content string
 */
function getLineNumber(content, index) {
  const upToIndex = content.substring(0, index);
  const lines = upToIndex.split('\n');
  return lines.length;
}

module.exports = {
  name: 'inputImageAlt',
  description: 'Input type="image" elements must have alt text describing their purpose',
  tier: 'material',
  type: 'html',
  weight: 7,

  check(content) {
    const issues = [];
    let elementsFound = 0;

    // Match input elements with type="image" (including Angular binding [type]="'image'")
    const inputImageRegex = /<input\s+[^>]*(?:type\s*=\s*["']image["']|\[type\]\s*=\s*["']'image'["'])[^>]*>/gi;
    let inputMatch;

    while ((inputMatch = inputImageRegex.exec(content)) !== null) {
      elementsFound++;
      const inputTag = inputMatch[0];
      const lineNumber = getLineNumber(content, inputMatch.index);

      // Check for alt attribute (including Angular binding [alt])
      // For [alt]="expression", we consider it valid if the binding exists
      const altRegex = /\balt\s*=\s*["']([^"']*)["']/i;
      const altBindingRegex = /\[alt\]\s*=\s*["'][^"']+["']/i;
      const altMatch = inputTag.match(altRegex);
      const hasAltBinding = altBindingRegex.test(inputTag);

      // Check for aria-label as an alternative
      const ariaLabelRegex = /\baria-label\s*=\s*["']([^"']*)["']/i;
      const ariaLabelMatch = inputTag.match(ariaLabelRegex);

      // Try to get src for better error message
      const srcRegex = /\bsrc\s*=\s*["']([^"']*)["']/i;
      const srcMatch = inputTag.match(srcRegex);
      const srcInfo = srcMatch ? ` (src="${srcMatch[1]}")` : '';

      if (!altMatch && !hasAltBinding && !ariaLabelMatch) {
        issues.push(format('INPUT_IMAGE_MISSING_ALT', { element: `<input type="image">${srcInfo}`, line: lineNumber }));
      } else if (altMatch && !altMatch[1].trim() && !hasAltBinding) {
        issues.push(format('INPUT_IMAGE_MISSING_ALT', { element: `<input type="image">${srcInfo}`, line: lineNumber }));
      } else if (ariaLabelMatch && !ariaLabelMatch[1].trim()) {
        issues.push(format('INPUT_IMAGE_MISSING_ALT', { element: `<input type="image">${srcInfo}`, line: lineNumber }));
      }
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
