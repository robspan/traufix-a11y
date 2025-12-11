/**
 * Standard Issue Format for traufix-a11y
 *
 * All checks should use this format for consistent, parseable output.
 *
 * Format:
 * {
 *   check: string,        // Check name (e.g., 'buttonNames')
 *   severity: string,     // 'error' | 'warning' | 'info'
 *   message: string,      // Human-readable description
 *   why: string,          // Why this matters for accessibility
 *   fix: string[],        // Array of fix suggestions
 *   wcag: string | null,  // WCAG criterion (e.g., '4.1.2')
 *   link: string | null,  // Documentation URL
 *   element: string       // The offending code snippet
 * }
 *
 * String format (for backwards compatibility):
 * "[severity] message. why\n  How to fix:\n    - fix1\n    - fix2\n  WCAG: criterion | See: link\n  Found: element"
 */

'use strict';

/**
 * WCAG 2.1 Success Criteria references
 * Maps common accessibility issues to their WCAG criteria
 */
const WCAG = {
  // Perceivable
  '1.1.1': 'Non-text Content',
  '1.2.1': 'Audio-only and Video-only (Prerecorded)',
  '1.2.2': 'Captions (Prerecorded)',
  '1.2.3': 'Audio Description or Media Alternative',
  '1.3.1': 'Info and Relationships',
  '1.3.2': 'Meaningful Sequence',
  '1.3.3': 'Sensory Characteristics',
  '1.3.4': 'Orientation',
  '1.3.5': 'Identify Input Purpose',
  '1.4.1': 'Use of Color',
  '1.4.2': 'Audio Control',
  '1.4.3': 'Contrast (Minimum)',
  '1.4.4': 'Resize Text',
  '1.4.5': 'Images of Text',
  '1.4.10': 'Reflow',
  '1.4.11': 'Non-text Contrast',
  '1.4.12': 'Text Spacing',
  '1.4.13': 'Content on Hover or Focus',

  // Operable
  '2.1.1': 'Keyboard',
  '2.1.2': 'No Keyboard Trap',
  '2.1.4': 'Character Key Shortcuts',
  '2.2.1': 'Timing Adjustable',
  '2.2.2': 'Pause, Stop, Hide',
  '2.3.1': 'Three Flashes or Below Threshold',
  '2.4.1': 'Bypass Blocks',
  '2.4.2': 'Page Titled',
  '2.4.3': 'Focus Order',
  '2.4.4': 'Link Purpose (In Context)',
  '2.4.5': 'Multiple Ways',
  '2.4.6': 'Headings and Labels',
  '2.4.7': 'Focus Visible',
  '2.5.1': 'Pointer Gestures',
  '2.5.2': 'Pointer Cancellation',
  '2.5.3': 'Label in Name',
  '2.5.4': 'Motion Actuation',

  // Understandable
  '3.1.1': 'Language of Page',
  '3.1.2': 'Language of Parts',
  '3.2.1': 'On Focus',
  '3.2.2': 'On Input',
  '3.2.3': 'Consistent Navigation',
  '3.2.4': 'Consistent Identification',
  '3.3.1': 'Error Identification',
  '3.3.2': 'Labels or Instructions',
  '3.3.3': 'Error Suggestion',
  '3.3.4': 'Error Prevention',

  // Robust
  '4.1.1': 'Parsing',
  '4.1.2': 'Name, Role, Value',
  '4.1.3': 'Status Messages'
};

/**
 * Format an issue in the standard string format
 *
 * @param {Object} opts - Issue options
 * @param {string} opts.message - Main issue description
 * @param {string} opts.why - Why this matters
 * @param {string|string[]} opts.fix - Fix suggestion(s)
 * @param {string} [opts.wcag] - WCAG criterion
 * @param {string} [opts.link] - Documentation URL
 * @param {string} [opts.element] - Offending code
 * @param {'error'|'warning'|'info'} [opts.severity='error'] - Severity level
 * @returns {string} Formatted issue string
 *
 * @example
 * formatIssue({
 *   message: 'Button missing accessible name',
 *   why: 'Screen readers cannot announce this button\'s purpose',
 *   fix: ['Add text content', 'Add aria-label attribute'],
 *   wcag: '4.1.2',
 *   element: '<button></button>'
 * });
 */
function formatIssue(opts) {
  const {
    message,
    why,
    fix,
    wcag = null,
    link = null,
    element = null,
    severity = 'error'
  } = opts;

  const lines = [];

  // Severity prefix for parsing
  const prefix = severity === 'error' ? '[Error]' :
                 severity === 'warning' ? '[Warning]' : '[Info]';

  // Main message with why
  lines.push(`${prefix} ${message}. ${why}`);

  // Fix suggestions
  const fixes = Array.isArray(fix) ? fix : [fix];
  if (fixes.length > 0) {
    lines.push('  How to fix:');
    for (const f of fixes) {
      lines.push(`    - ${f}`);
    }
  }

  // WCAG and link on same line if both present
  const refs = [];
  if (wcag) {
    const criterion = WCAG[wcag] || wcag;
    refs.push(`WCAG ${wcag}: ${criterion}`);
  }
  if (link) {
    refs.push(`See: ${link}`);
  }
  if (refs.length > 0) {
    lines.push(`  ${refs.join(' | ')}`);
  }

  // Element snippet
  if (element) {
    const snippet = element.length > 100 ? element.substring(0, 100) + '...' : element;
    lines.push(`  Found: ${snippet}`);
  }

  return lines.join('\n');
}

/**
 * Parse an issue string back to structured format
 * Useful for programmatic processing of results
 *
 * @param {string} issueStr - Issue string in standard format
 * @returns {Object} Parsed issue object
 */
function parseIssue(issueStr) {
  const result = {
    severity: 'error',
    message: '',
    why: '',
    fix: [],
    wcag: null,
    link: null,
    element: null
  };

  const lines = issueStr.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // First line: [Severity] message. why
    if (i === 0) {
      const match = line.match(/^\[(Error|Warning|Info)\]\s*(.+?)\.\s*(.+)$/i);
      if (match) {
        result.severity = match[1].toLowerCase();
        result.message = match[2].trim();
        result.why = match[3].trim();
      } else {
        result.message = line;
      }
      continue;
    }

    // Fix suggestions
    if (line.trim().startsWith('- ')) {
      result.fix.push(line.trim().substring(2));
      continue;
    }

    // WCAG reference
    const wcagMatch = line.match(/WCAG\s+([\d.]+)/i);
    if (wcagMatch) {
      result.wcag = wcagMatch[1];
    }

    // Link
    const linkMatch = line.match(/See:\s*(https?:\/\/[^\s|]+)/i);
    if (linkMatch) {
      result.link = linkMatch[1];
    }

    // Element
    const elementMatch = line.match(/Found:\s*(.+)$/);
    if (elementMatch) {
      result.element = elementMatch[1];
    }
  }

  return result;
}

/**
 * Quick issue formatter for simple cases
 *
 * @param {string} message - What's wrong
 * @param {string} fix - How to fix it
 * @param {string} [element] - The code
 * @returns {string} Formatted issue
 */
function quickIssue(message, fix, element = null) {
  let result = `${message}. FIX: ${fix}`;
  if (element) {
    const snippet = element.length > 80 ? element.substring(0, 80) + '...' : element;
    result += ` Found: ${snippet}`;
  }
  return result;
}

module.exports = {
  formatIssue,
  parseIssue,
  quickIssue,
  WCAG
};
