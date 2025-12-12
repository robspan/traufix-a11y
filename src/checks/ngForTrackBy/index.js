const { format } = require('../../core/errors');

/**
 * Gets the line number for a given index in the HTML string
 */
function getLineNumber(html, index) {
  const upToIndex = html.substring(0, index);
  const lines = upToIndex.split('\n');
  return lines.length;
}

module.exports = {
  name: 'ngForTrackBy',
  description: '*ngFor and @for should use trackBy/track for element identity',
  tier: 'material',
  type: 'html',
  weight: 7,

  check(content) {
    const issues = [];
    let elementsFound = 0;

    // Check for *ngFor without trackBy
    // We need to handle nested quotes properly, e.g.:
    // *ngFor="let item of getItemsByPriority('essential'); trackBy: trackByItemId"
    // The regex [^"']+ would stop at the inner single quote, so we use separate patterns
    // for double-quoted and single-quoted attributes

    // Pattern for double-quoted *ngFor (can contain single quotes inside)
    const ngForDoubleQuotePattern = /\*ngFor\s*=\s*"([^"]*)"/gi;
    // Pattern for single-quoted *ngFor (can contain double quotes inside)
    const ngForSingleQuotePattern = /\*ngFor\s*=\s*'([^']*)'/gi;

    let match;

    // Check double-quoted ngFor expressions
    while ((match = ngForDoubleQuotePattern.exec(content)) !== null) {
      elementsFound++;
      const ngForExpression = match[1];

      // Check if trackBy is present in the expression
      const hasTrackBy = /trackBy\s*:/i.test(ngForExpression);

      if (!hasTrackBy) {
        const lineNumber = getLineNumber(content, match.index);
        issues.push(format('NG_FOR_TRACK_BY', { element: ngForExpression, line: lineNumber }));
      }
    }

    // Check single-quoted ngFor expressions
    while ((match = ngForSingleQuotePattern.exec(content)) !== null) {
      elementsFound++;
      const ngForExpression = match[1];

      // Check if trackBy is present in the expression
      const hasTrackBy = /trackBy\s*:/i.test(ngForExpression);

      if (!hasTrackBy) {
        const lineNumber = getLineNumber(content, match.index);
        issues.push(format('NG_FOR_TRACK_BY', { element: ngForExpression, line: lineNumber }));
      }
    }

    // Check for @for without track (Angular 17+ control flow)
    // Match @for (item of items) but ensure track is present
    const atForPattern = /@for\s*\(([^)]+)\)\s*\{/gi;

    while ((match = atForPattern.exec(content)) !== null) {
      elementsFound++;
      const forExpression = match[1];

      // Check if track is present in the expression
      // @for (item of items; track item.id)
      const hasTrack = /;\s*track\s+/i.test(forExpression);

      if (!hasTrack) {
        const lineNumber = getLineNumber(content, match.index);
        issues.push(format('NG_FOR_TRACK_BY', { element: forExpression, line: lineNumber }));
      }
    }

    return { pass: issues.length === 0, issues, elementsFound };
  }
};
