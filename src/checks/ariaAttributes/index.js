// ARIA attributes that accept only true/false
const ARIA_BOOLEAN_ATTRS = [
  'atomic', 'busy', 'disabled', 'expanded', 'hidden', 'modal', 'multiline',
  'multiselectable', 'readonly', 'required', 'selected'
];

// ARIA attributes that accept true/false/mixed
const ARIA_TRISTATE_ATTRS = ['checked', 'pressed'];

/**
 * Generates a standardized error message for invalid ARIA attribute values
 */
function formatAriaError(attr, value, validValues) {
  return (
    `[Error] Invalid ARIA attribute value. Incorrect ARIA values cause unpredictable behavior\n` +
    `  How to fix:\n` +
    `    - Use valid values: ${validValues}\n` +
    `    - For booleans use true/false, for references use valid IDs\n` +
    `  WCAG 4.1.2: Name, Role, Value | See: https://www.w3.org/TR/wai-aria/#states_and_properties\n` +
    `  Found: aria-${attr}="${value}"`
  );
}

module.exports = {
  name: 'ariaAttributes',
  description: 'ARIA attributes have valid values',
  tier: 'basic',
  type: 'html',
  weight: 10,
  wcag: '4.1.2',

  check(content) {
    const issues = [];
    const ariaRegex = /aria-([a-z]+)=["']([^"']*)["']/gi;
    let match;

    while ((match = ariaRegex.exec(content)) !== null) {
      const attr = match[1].toLowerCase();
      const value = match[2].toLowerCase();

      // Skip dynamic bindings
      if (value.startsWith('{{') || value.includes('()') || value.startsWith('${')) continue;

      // Boolean attributes
      if (ARIA_BOOLEAN_ATTRS.includes(attr)) {
        if (!['true', 'false'].includes(value)) {
          issues.push(formatAriaError(attr, value, 'true, false'));
        }
      }

      // Tristate attributes
      if (ARIA_TRISTATE_ATTRS.includes(attr)) {
        if (!['true', 'false', 'mixed'].includes(value)) {
          issues.push(formatAriaError(attr, value, 'true, false, mixed'));
        }
      }

      // aria-live
      if (attr === 'live' && !['off', 'polite', 'assertive'].includes(value)) {
        issues.push(formatAriaError(attr, value, 'off, polite, assertive'));
      }

      // aria-current
      if (attr === 'current' && !['page', 'step', 'location', 'date', 'time', 'true', 'false'].includes(value)) {
        issues.push(formatAriaError(attr, value, 'page, step, location, date, time, true, false'));
      }

      // aria-haspopup
      if (attr === 'haspopup' && !['true', 'false', 'menu', 'listbox', 'tree', 'grid', 'dialog'].includes(value)) {
        issues.push(formatAriaError(attr, value, 'true, false, menu, listbox, tree, grid, dialog'));
      }

      // aria-autocomplete
      if (attr === 'autocomplete' && !['none', 'inline', 'list', 'both'].includes(value)) {
        issues.push(formatAriaError(attr, value, 'none, inline, list, both'));
      }

      // aria-sort
      if (attr === 'sort' && !['none', 'ascending', 'descending', 'other'].includes(value)) {
        issues.push(formatAriaError(attr, value, 'none, ascending, descending, other'));
      }

      // aria-invalid
      if (attr === 'invalid' && !['true', 'false', 'grammar', 'spelling'].includes(value)) {
        issues.push(formatAriaError(attr, value, 'true, false, grammar, spelling'));
      }
    }

    return { pass: issues.length === 0, issues };
  },

  ARIA_BOOLEAN_ATTRS,
  ARIA_TRISTATE_ATTRS
};
