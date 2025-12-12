const { format } = require('../../core/errors');

// Valid ARIA roles per WAI-ARIA 1.2 spec
const VALID_ARIA_ROLES = [
  'alert', 'alertdialog', 'application', 'article', 'banner', 'blockquote',
  'button', 'caption', 'cell', 'checkbox', 'code', 'columnheader', 'combobox',
  'complementary', 'contentinfo', 'definition', 'deletion', 'dialog',
  'directory', 'document', 'emphasis', 'feed', 'figure', 'form', 'generic',
  'grid', 'gridcell', 'group', 'heading', 'img', 'insertion', 'link', 'list',
  'listbox', 'listitem', 'log', 'main', 'marquee', 'math', 'menu', 'menubar',
  'menuitem', 'menuitemcheckbox', 'menuitemradio', 'meter', 'navigation',
  'none', 'note', 'option', 'paragraph', 'presentation', 'progressbar',
  'radio', 'radiogroup', 'region', 'row', 'rowgroup', 'rowheader', 'scrollbar',
  'search', 'searchbox', 'separator', 'slider', 'spinbutton', 'status',
  'strong', 'subscript', 'superscript', 'switch', 'tab', 'table', 'tablist',
  'tabpanel', 'term', 'textbox', 'time', 'timer', 'toolbar', 'tooltip', 'tree',
  'treegrid', 'treeitem'
];

module.exports = {
  name: 'ariaRoles',
  description: 'ARIA roles are valid',
  tier: 'basic',
  type: 'html',
  weight: 10,
  wcag: '4.1.2',

  check(content) {
    const issues = [];
    let elementsFound = 0;
    const roleRegex = /role=["']([^"']+)["']/gi;
    let match;

    while ((match = roleRegex.exec(content)) !== null) {
      elementsFound++;
      const role = match[1].toLowerCase();
      if (!VALID_ARIA_ROLES.includes(role)) {
        issues.push(format('ARIA_INVALID_ROLE', { role, element: `role="${role}"` }));
      }
    }

    return { pass: issues.length === 0, issues, elementsFound };
  },

  VALID_ARIA_ROLES
};
