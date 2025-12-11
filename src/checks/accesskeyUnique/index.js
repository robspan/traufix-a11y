module.exports = {
  name: 'accesskeyUnique',
  description: 'Accesskey values are unique',
  tier: 'basic',
  type: 'html',
  weight: 7,
  wcag: '4.1.1',

  check(content) {
    const issues = [];
    const accesskeyRegex = /accesskey=["']([^"']+)["']/gi;
    const keys = [];
    let match;

    while ((match = accesskeyRegex.exec(content)) !== null) {
      keys.push(match[1].toLowerCase());
    }

    const counts = {};
    for (const key of keys) {
      counts[key] = (counts[key] || 0) + 1;
    }

    for (const [key, count] of Object.entries(counts)) {
      if (count > 1) {
        issues.push(
          `[Error] Duplicate accesskey value. Duplicate accesskeys cause unpredictable keyboard behavior\n` +
          `  How to fix:\n` +
          `    - Use unique accesskey values\n` +
          `    - Remove duplicates\n` +
          `  WCAG 4.1.1: Parsing | See: https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/accesskey\n` +
          `  Found: accesskey="${key}" (${count} occurrences)`
        );
      }
    }

    return { pass: issues.length === 0, issues };
  }
};
