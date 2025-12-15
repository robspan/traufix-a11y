const { format } = require('../core/errors');

// ARIA attributes that accept only true/false
const ARIA_BOOLEAN_ATTRS = [
  'atomic', 'busy', 'disabled', 'expanded', 'hidden', 'modal', 'multiline',
  'multiselectable', 'readonly', 'required', 'selected'
];

// ARIA attributes that accept true/false/mixed
const ARIA_TRISTATE_ATTRS = ['checked', 'pressed'];

module.exports = {
  name: 'ariaAttributes',
  description: 'ARIA attributes have valid values',
  tier: 'basic',
  type: 'html',
  weight: 10,
  wcag: '4.1.2',

  check(content) {
    // Early exit: no relevant elements, no issues
    if (!/aria-/i.test(content)) {
      return { pass: true, issues: [], elementsFound: 0 };
    }

    const issues = [];
    let elementsFound = 0;
    const ariaRegex = /aria-([a-z]+)=["']([^"']*)["']/gi;
    let match;

    while ((match = ariaRegex.exec(content)) !== null) {
      elementsFound++;
      const attr = match[1].toLowerCase();
      const value = match[2].toLowerCase();

      // Skip dynamic bindings
      if (value.startsWith('{{') || value.includes('()') || value.startsWith('${')) continue;

      // Boolean attributes
      if (ARIA_BOOLEAN_ATTRS.includes(attr)) {
        if (!['true', 'false'].includes(value)) {
          issues.push(format('ARIA_INVALID_ATTRIBUTE', { attr, element: `aria-${attr}="${value}"` }));
        }
      }

      // Tristate attributes
      if (ARIA_TRISTATE_ATTRS.includes(attr)) {
        if (!['true', 'false', 'mixed'].includes(value)) {
          issues.push(format('ARIA_INVALID_ATTRIBUTE', { attr, element: `aria-${attr}="${value}"` }));
        }
      }

      // aria-live
      if (attr === 'live' && !['off', 'polite', 'assertive'].includes(value)) {
        issues.push(format('ARIA_INVALID_ATTRIBUTE', { attr, element: `aria-${attr}="${value}"` }));
      }

      // aria-current
      if (attr === 'current' && !['page', 'step', 'location', 'date', 'time', 'true', 'false'].includes(value)) {
        issues.push(format('ARIA_INVALID_ATTRIBUTE', { attr, element: `aria-${attr}="${value}"` }));
      }

      // aria-haspopup
      if (attr === 'haspopup' && !['true', 'false', 'menu', 'listbox', 'tree', 'grid', 'dialog'].includes(value)) {
        issues.push(format('ARIA_INVALID_ATTRIBUTE', { attr, element: `aria-${attr}="${value}"` }));
      }

      // aria-autocomplete
      if (attr === 'autocomplete' && !['none', 'inline', 'list', 'both'].includes(value)) {
        issues.push(format('ARIA_INVALID_ATTRIBUTE', { attr, element: `aria-${attr}="${value}"` }));
      }

      // aria-sort
      if (attr === 'sort' && !['none', 'ascending', 'descending', 'other'].includes(value)) {
        issues.push(format('ARIA_INVALID_ATTRIBUTE', { attr, element: `aria-${attr}="${value}"` }));
      }

      // aria-invalid
      if (attr === 'invalid' && !['true', 'false', 'grammar', 'spelling'].includes(value)) {
        issues.push(format('ARIA_INVALID_ATTRIBUTE', { attr, element: `aria-${attr}="${value}"` }));
      }
    }

    return { pass: issues.length === 0, issues, elementsFound };
  },

  ARIA_BOOLEAN_ATTRS,
  ARIA_TRISTATE_ATTRS
};
