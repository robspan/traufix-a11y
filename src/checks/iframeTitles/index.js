const { format } = require('../../core/errors');

module.exports = {
  name: 'iframeTitles',
  description: 'Iframes have title or aria-label',
  tier: 'basic',
  type: 'html',
  weight: 7,
  wcag: '2.4.1',

  check(content) {
    const issues = [];
    let elementsFound = 0;
    const iframeRegex = /<iframe[^>]*>/gi;
    let match;

    while ((match = iframeRegex.exec(content)) !== null) {
      elementsFound++;
      const iframe = match[0];
      const hasTitle = /\btitle=/i.test(iframe) || /\[title\]=/i.test(iframe);
      const hasAriaLabel = /aria-label=/i.test(iframe);
      const hasAriaLabelledBy = /aria-labelledby=/i.test(iframe);

      if (!hasTitle && !hasAriaLabel && !hasAriaLabelledBy) {
        issues.push(format('IFRAME_MISSING_TITLE', { element: iframe }));
      }
    }

    return { pass: issues.length === 0, issues, elementsFound };
  }
};
