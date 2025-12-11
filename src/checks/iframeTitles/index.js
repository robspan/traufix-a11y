module.exports = {
  name: 'iframeTitles',
  description: 'Iframes have title or aria-label',
  tier: 'basic',
  type: 'html',
  weight: 7,
  wcag: '2.4.1',

  check(content) {
    const issues = [];
    const iframeRegex = /<iframe[^>]*>/gi;
    let match;

    while ((match = iframeRegex.exec(content)) !== null) {
      const iframe = match[0];
      const hasTitle = /\btitle=/i.test(iframe) || /\[title\]=/i.test(iframe);
      const hasAriaLabel = /aria-label=/i.test(iframe);
      const hasAriaLabelledBy = /aria-labelledby=/i.test(iframe);

      if (!hasTitle && !hasAriaLabel && !hasAriaLabelledBy) {
        issues.push(
          `[Error] Iframe missing title attribute. Screen readers need title to describe iframe content\n` +
          `  How to fix:\n` +
          `    - Add title="Description of iframe content"\n` +
          `  WCAG 2.4.1: Bypass Blocks | See: https://www.w3.org/WAI/WCAG21/Techniques/html/H64\n` +
          `  Found: ${iframe}`
        );
      }
    }

    return { pass: issues.length === 0, issues };
  }
};
