module.exports = {
  name: 'imageAlt',
  description: 'Images have alt attributes',
  tier: 'basic',
  type: 'html',
  weight: 10,
  wcag: '1.1.1',

  check(content) {
    const issues = [];
    const imgRegex = /<img[^>]*>/gi;
    const images = content.match(imgRegex) || [];

    for (const img of images) {
      const hasAlt = /\balt=/i.test(img) || /\[alt\]=/i.test(img) || /\[attr\.alt\]=/i.test(img);

      if (!hasAlt) {
        const snippet = img.substring(0, 80).replace(/\s+/g, ' ').trim();
        const truncated = img.length > 80 ? '...' : '';
        issues.push(
          `[Error] Image missing alt attribute. Screen readers cannot describe images without alt text\n` +
          `  How to fix:\n` +
          `    - Add alt="description" for informative images\n` +
          `    - Add alt="" for decorative images\n` +
          `  WCAG 1.1.1: Non-text Content | See: https://www.w3.org/WAI/tutorials/images/\n` +
          `  Found: <${snippet}${truncated}>`
        );
      }
    }

    return { pass: issues.length === 0, issues };
  }
};
