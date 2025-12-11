module.exports = {
  name: 'listStructure',
  description: 'List items are inside proper list containers (ul, ol, menu)',
  tier: 'basic',
  type: 'html',
  weight: 7,
  wcag: '1.3.1',

  check(content) {
    const issues = [];

    // Check for <li> elements
    if (/<li[^>]*>/i.test(content)) {
      const hasProperList = /<(ul|ol|menu)[^>]*>[\s\S]*<li/i.test(content);
      const hasRoleList = /role=["']list["'][\s\S]*<li|role=["']listitem["']/i.test(content);

      if (!hasProperList && !hasRoleList) {
        const message = `[Error] Invalid list structure. Improper list markup breaks screen reader list navigation
  How to fix:
    - Use ul/ol with li children only
    - Don't nest list items improperly
  WCAG 1.3.1: Info and Relationships | See: https://www.w3.org/WAI/tutorials/page-structure/content/#lists
  Found: <li>`;
        issues.push(message);
      }
    }

    return { pass: issues.length === 0, issues };
  }
};
