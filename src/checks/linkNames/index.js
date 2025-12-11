module.exports = {
  name: 'linkNames',
  description: 'Links have accessible names',
  tier: 'basic',
  type: 'html',
  weight: 10,
  wcag: '2.4.4',

  check(content) {
    const issues = [];
    const linkRegex = /<a[^>]*>[\s\S]*?<\/a>/gi;
    const links = content.match(linkRegex) || [];

    for (const link of links) {
      const hasAriaLabel = /aria-label=/i.test(link);
      const hasAriaLabelledBy = /aria-labelledby=/i.test(link);
      const hasTitle = /\btitle=/i.test(link);

      const textContent = link
        .replace(/<mat-icon[^>]*>[\s\S]*?<\/mat-icon>/gi, '')
        .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/\{\{[^}]+\}\}/g, 'TEXT')
        .trim();

      if (!textContent && !hasAriaLabel && !hasAriaLabelledBy && !hasTitle) {
        const snippet = link.substring(0, 80).replace(/\s+/g, ' ').trim();
        const truncated = link.length > 80 ? '...' : '';
        issues.push(
          `[Error] Link missing accessible name. Screen readers announce "link" without context\n` +
          `  How to fix:\n` +
          `    - Add descriptive link text\n` +
          `    - Add aria-label attribute\n` +
          `    - Use aria-labelledby to reference existing text\n` +
          `  WCAG 2.4.4: Link Purpose (In Context) | See: https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context\n` +
          `  Found: <${snippet}${truncated}>`
        );
      }
    }

    return { pass: issues.length === 0, issues };
  }
};
