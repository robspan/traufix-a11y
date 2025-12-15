const { format } = require('../core/errors');

module.exports = {
  name: 'pointerEventsNone',
  description: 'Detects pointer-events: none on interactive elements which makes them unusable for mouse/touch users',
  tier: 'full',
  type: 'scss',
  weight: 3,

  check(content) {
    // Early exit: no relevant elements, no issues
    if (!/pointer-events/i.test(content)) {
      return { pass: true, issues: [], elementsFound: 0 };
    }

    const issues = [];
    let elementsFound = 0;

    // Interactive elements that should not have pointer-events: none
    const interactiveElements = [
      '(?:^|[\\s,>+~])button(?![a-z-])',
      '(?:^|[\\s,>+~])a(?![a-z-])',  // 'a' tag only, not words containing 'a'
      '(?:^|[\\s,>+~])input(?![a-z-])',
      '(?:^|[\\s,>+~])select(?![a-z-])',
      '(?:^|[\\s,>+~])textarea(?![a-z-])',
      '\\.btn(?![a-z])',
      '\\.button(?![a-z])',
      '\\.link(?![a-z])',
      '\\[role=["\']?button["\']?\\]',
      '\\[role=["\']?link["\']?\\]',
      '\\[tabindex\\]'
    ];

    // Check each interactive element for pointer-events: none
    interactiveElements.forEach((element) => {
      const pattern = new RegExp(
        `${element}[^{]*\\{[^}]*pointer-events\\s*:\\s*none[^}]*\\}`,
        'gi'
      );

      const matches = content.match(pattern);
      if (matches) {
        elementsFound += matches.length;
        matches.forEach((match) => {
          // Extract selector
          const selectorMatch = match.match(/^([^{]+)\{/);
          const selector = selectorMatch ? selectorMatch[1].trim() : element;

          issues.push(format('POINTER_EVENTS_NONE', { element: selector }));
        });
      }
    });

    // Also check for pointer-events: none on elements with :hover or :focus (indicates interactivity expected)
    const interactiveStatePattern = /[^{]+:(hover|focus|active)[^{]*\{[^}]*pointer-events\s*:\s*none[^}]*\}/gi;
    const stateMatches = content.match(interactiveStatePattern);

    if (stateMatches) {
      elementsFound += stateMatches.length;
      stateMatches.forEach((match) => {
        const selectorMatch = match.match(/^([^{]+)\{/);
        const selector = selectorMatch ? selectorMatch[1].trim() : 'element with interactive state';

        // Avoid duplicate issues
        const alreadyReported = issues.some(issue => issue.includes(selector.split(':')[0].trim()));
        if (!alreadyReported) {
          issues.push(format('POINTER_EVENTS_NONE', { element: selector }));
        }
      });
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
