module.exports = {
  name: 'tableHeaders',
  description: 'Data tables have header cells (th elements)',
  tier: 'basic',
  type: 'html',
  weight: 7,
  wcag: '1.3.1',

  check(content) {
    const issues = [];

    if (/<table[^>]*>/i.test(content)) {
      // Skip layout tables
      if (/role=["'](presentation|none)["']/i.test(content)) {
        return { pass: true, issues: [] };
      }

      const hasTh = /<th[^>]*>/i.test(content);
      const hasMatTable = /mat-table|matColumnDef/i.test(content);

      if (!hasTh && !hasMatTable) {
        const message = `[Error] Table missing header cells. Screen readers need headers to associate data with labels
  How to fix:
    - Add th elements in thead or first row
    - Use scope attribute to clarify header relationships
  WCAG 1.3.1: Info and Relationships | See: https://www.w3.org/WAI/tutorials/tables/
  Found: <table>`;
        issues.push(message);
      }
    }

    return { pass: issues.length === 0, issues };
  }
};
