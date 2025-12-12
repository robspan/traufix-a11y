const { format } = require('../../core/errors');

module.exports = {
  name: 'listStructure',
  description: 'List items are inside proper list containers (ul, ol, menu)',
  tier: 'basic',
  type: 'html',
  weight: 7,
  wcag: '1.3.1',

  check(content) {
    const issues = [];
    let elementsFound = 0;

    // Find all <li> elements
    const liRegex = /<li[^>]*>/gi;
    let match;

    while ((match = liRegex.exec(content)) !== null) {
      elementsFound++;
      const liPosition = match.index;
      const beforeLi = content.substring(0, liPosition);

      // Check if <li> is inside a proper list container (ul, ol, menu)
      // by counting open and close tags before this position
      const ulOlMenuOpens = (beforeLi.match(/<(ul|ol|menu)(?:\s[^>]*)?>/gi) || []).length;
      const ulOlMenuCloses = (beforeLi.match(/<\/(ul|ol|menu)>/gi) || []).length;
      const inProperList = ulOlMenuOpens > ulOlMenuCloses;

      // Check if <li> is inside a custom component (web components or Angular components)
      // These are tags containing a hyphen like app-*, mat-*, ng-*, or any custom-element
      const customComponentOpens = (beforeLi.match(/<[a-z]+-[a-z][a-z0-9-]*(?:\s[^>]*)?>/gi) || []).length;
      const customComponentCloses = (beforeLi.match(/<\/[a-z]+-[a-z][a-z0-9-]*>/gi) || []).length;
      const inCustomComponent = customComponentOpens > customComponentCloses;

      // Check if element has role="listitem" or is inside role="list"
      const hasListitemRole = /role=["']listitem["']/i.test(match[0]);
      const roleListOpens = (beforeLi.match(/role=["']list["']/gi) || []).length;
      const inRoleList = roleListOpens > 0;

      if (!inProperList && !inCustomComponent && !hasListitemRole && !inRoleList) {
        issues.push(format('LIST_INVALID_CHILD', { parent: 'ul/ol', element: '<li>' }));
      }
    }

    return { pass: issues.length === 0, issues, elementsFound };
  }
};
