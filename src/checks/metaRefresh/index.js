module.exports = {
  name: 'metaRefresh',
  description: 'Meta refresh can disorient users and should be avoided (WCAG 2.2.1, 3.2.5)',
  tier: 'full',
  type: 'html',
  weight: 7,

  check(content) {
    const issues = [];

    // Pattern to match <meta http-equiv="refresh" ...>
    // Handles various quote styles and attribute ordering
    const metaRefreshPattern = /<meta\s+[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi;

    const matches = content.match(metaRefreshPattern);

    if (matches) {
      matches.forEach((match) => {
        // Extract content attribute value if present
        const contentMatch = match.match(/content\s*=\s*["']?([^"'\s>]+)["']?/i);
        const contentValue = contentMatch ? contentMatch[1] : 'unknown';

        issues.push(
          `[Error] Found <meta http-equiv="refresh"> with content="${contentValue}". Auto-refresh can disorient users, especially those using screen readers or with cognitive disabilities who need more time to read content.\n` +
          `  How to fix:\n` +
          `    - Remove the meta refresh tag\n` +
          `    - Provide user-controlled refresh options (e.g., a "Refresh" button)\n` +
          `    - If auto-refresh is essential, provide a way to disable or extend the time limit\n` +
          `  WCAG 2.2.1: Timing Adjustable\n` +
          `  WCAG 3.2.5: Change on Request\n` +
          `  Found: ${match}`
        );
      });
    }

    return {
      pass: issues.length === 0,
      issues
    };
  }
};
