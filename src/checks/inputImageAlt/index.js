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
  tier: 'enhanced',
  type: 'html',
  weight: 7,

  check(content) {
    const issues = [];

    // Match input elements with type="image" (including Angular binding [type]="'image'")
    const inputImageRegex = /<input\s+[^>]*(?:type\s*=\s*["']image["']|\[type\]\s*=\s*["']'image'["'])[^>]*>/gi;
    let inputMatch;

    while ((inputMatch = inputImageRegex.exec(content)) !== null) {
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
        issues.push(
          `[Error] Line ${lineNumber}: <input type="image"> is missing accessible name. ` +
          `Image buttons must have text alternatives describing their purpose for screen reader users.\n` +
          `  How to fix:\n` +
          `    - Add alt="Description of action" (e.g., alt="Submit form", alt="Search")\n` +
          `    - Or use aria-label="Description of action" as an alternative\n` +
          `    - Describe what happens when clicked, not the image appearance\n` +
          `    - Avoid generic text like "button" or "image"\n` +
          `  WCAG 1.1.1: Non-text Content\n` +
          `  Found: <input type="image">${srcInfo}`
        );
      } else if (altMatch && !altMatch[1].trim() && !hasAltBinding) {
        issues.push(
          `[Error] Line ${lineNumber}: <input type="image"> has empty alt attribute. ` +
          `Empty alt text provides no information to screen reader users about the button's purpose.\n` +
          `  How to fix:\n` +
          `    - Provide descriptive alt text: alt="Submit", alt="Search", alt="Go to next page"\n` +
          `    - Describe the action performed, not the image appearance\n` +
          `    - Keep it concise but meaningful (e.g., "Add to cart" not "button")\n` +
          `  WCAG 1.1.1: Non-text Content\n` +
          `  Found: <input type="image">${srcInfo}`
        );
      } else if (ariaLabelMatch && !ariaLabelMatch[1].trim()) {
        issues.push(
          `[Error] Line ${lineNumber}: <input type="image"> has empty aria-label. ` +
          `Empty aria-label provides no information to screen reader users about the button's purpose.\n` +
          `  How to fix:\n` +
          `    - Provide descriptive text in aria-label attribute\n` +
          `    - Example: aria-label="Submit form" or aria-label="Search"\n` +
          `  WCAG 1.1.1: Non-text Content\n` +
          `  Found: <input type="image">${srcInfo}`
        );
      }
    }

    return {
      pass: issues.length === 0,
      issues
    };
  }
};
