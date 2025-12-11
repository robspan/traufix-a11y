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
  tier: 'enhanced',
  type: 'html',
  weight: 7,

  check(content) {
    const issues = [];

    // Check for *ngFor without trackBy
    // Match *ngFor="let item of items" but not *ngFor="let item of items; trackBy: ..."
    const ngForPattern = /\*ngFor\s*=\s*["']([^"']+)["']/gi;

    let match;
    while ((match = ngForPattern.exec(content)) !== null) {
      const ngForExpression = match[1];

      // Check if trackBy is present in the expression
      const hasTrackBy = /trackBy\s*:/i.test(ngForExpression);

      if (!hasTrackBy) {
        const lineNumber = getLineNumber(content, match.index);
        issues.push(
          `[Warning] Line ${lineNumber}: *ngFor without trackBy function. Without tracking element identity, DOM re-renders can confuse screen readers and users with disabilities who may need more time to interact with dynamic content.\n` +
          `  How to fix:\n` +
          `    - Add trackBy function: *ngFor="let item of items; trackBy: trackById"\n` +
          `    - In component: trackById(index: number, item: any) { return item.id; }\n` +
          `    - This maintains element identity for assistive technologies and improves performance\n` +
          `  WCAG 2.2.1: Timing Adjustable (users with disabilities may need more time)\n` +
          `  Found: ${ngForExpression}`
        );
      }
    }

    // Check for @for without track (Angular 17+ control flow)
    // Match @for (item of items) but ensure track is present
    const atForPattern = /@for\s*\(([^)]+)\)\s*\{/gi;

    while ((match = atForPattern.exec(content)) !== null) {
      const forExpression = match[1];

      // Check if track is present in the expression
      // @for (item of items; track item.id)
      const hasTrack = /;\s*track\s+/i.test(forExpression);

      if (!hasTrack) {
        const lineNumber = getLineNumber(content, match.index);
        issues.push(
          `[Warning] Line ${lineNumber}: @for without track expression. Without tracking element identity, DOM re-renders can confuse screen readers and users with disabilities who may need more time to interact with dynamic content.\n` +
          `  How to fix:\n` +
          `    - Add track expression: @for (item of items; track item.id) { ... }\n` +
          `    - For simple cases: @for (item of items; track $index) { ... }\n` +
          `    - This maintains element identity for assistive technologies and improves performance\n` +
          `  WCAG 2.2.1: Timing Adjustable (users with disabilities may need more time)\n` +
          `  Found: ${forExpression}`
        );
      }
    }

    return { pass: issues.length === 0, issues };
  }
};
