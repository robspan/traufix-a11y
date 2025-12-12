'use strict';

/**
 * Code Quality Tool Formatters
 *
 * Formats for: SonarQube, CodeClimate, Codacy, ESLint, Checkstyle, etc.
 */

/**
 * SonarQube Generic Issue Format
 * @see https://docs.sonarqube.org/latest/analysis/generic-issue/
 */
function sonarqube(results, options = {}) {
  const issues = [];

  for (const url of (results.urls || [])) {
    for (const issue of (url.issues || [])) {
      const severity = issue.message.startsWith('[Warning]') ? 'MINOR' :
                       issue.message.startsWith('[Info]') ? 'INFO' : 'MAJOR';

      issues.push({
        engineId: 'mat-a11y',
        ruleId: issue.check,
        severity: severity,
        type: 'CODE_SMELL',
        primaryLocation: {
          message: issue.message.replace(/^\[(Error|Warning|Info)\]\s*/, ''),
          filePath: issue.file,
          textRange: {
            startLine: issue.line || 1,
            endLine: issue.line || 1,
            startColumn: 0,
            endColumn: 0
          }
        },
        effortMinutes: severity === 'MAJOR' ? 15 : 5
      });
    }
  }

  return JSON.stringify({ issues }, null, 2);
}

/**
 * CodeClimate JSON
 * @see https://github.com/codeclimate/platform/blob/master/spec/analyzers/SPEC.md
 */
function codeclimate(results, options = {}) {
  const issues = [];

  for (const url of (results.urls || [])) {
    for (const issue of (url.issues || [])) {
      const severity = issue.message.startsWith('[Warning]') ? 'minor' : 'major';
      const fingerprint = require('crypto')
        .createHash('md5')
        .update(`${issue.file}:${issue.check}:${issue.line || 0}`)
        .digest('hex');

      issues.push({
        type: 'issue',
        check_name: issue.check,
        description: issue.message.replace(/^\[(Error|Warning|Info)\]\s*/, ''),
        content: {
          body: `**URL:** ${url.path}\n**Score:** ${url.auditScore}%\n**Check:** ${issue.check}`
        },
        categories: ['Accessibility', 'Compatibility'],
        location: {
          path: issue.file,
          lines: {
            begin: issue.line || 1,
            end: issue.line || 1
          }
        },
        remediation_points: severity === 'major' ? 50000 : 10000,
        severity: severity,
        fingerprint: fingerprint
      });
    }
  }

  // Output as newline-delimited JSON (CodeClimate format)
  return issues.map(i => JSON.stringify(i)).join('\n');
}

/**
 * Codacy JSON
 * @see https://docs.codacy.com/repositories-configure/integrations/cli/
 */
function codacy(results, options = {}) {
  const issues = [];

  for (const url of (results.urls || [])) {
    for (const issue of (url.issues || [])) {
      issues.push({
        filename: issue.file,
        message: issue.message.replace(/^\[(Error|Warning|Info)\]\s*/, ''),
        patternId: issue.check,
        line: issue.line || 1,
        level: issue.message.startsWith('[Warning]') ? 'Warning' : 'Error',
        category: 'Accessibility'
      });
    }
  }

  return JSON.stringify(issues, null, 2);
}

/**
 * ESLint-compatible JSON
 * Familiar format for JS developers
 * @see https://eslint.org/docs/latest/use/formatters/
 */
function eslint(results, options = {}) {
  const fileResults = new Map();

  for (const url of (results.urls || [])) {
    for (const issue of (url.issues || [])) {
      if (!fileResults.has(issue.file)) {
        fileResults.set(issue.file, {
          filePath: issue.file,
          messages: [],
          errorCount: 0,
          warningCount: 0,
          fixableErrorCount: 0,
          fixableWarningCount: 0,
          source: ''
        });
      }

      const file = fileResults.get(issue.file);
      const isWarning = issue.message.startsWith('[Warning]');

      file.messages.push({
        ruleId: issue.check,
        severity: isWarning ? 1 : 2,
        message: issue.message.replace(/^\[(Error|Warning|Info)\]\s*/, ''),
        line: issue.line || 1,
        column: 1,
        nodeType: null,
        endLine: issue.line || 1,
        endColumn: 1
      });

      if (isWarning) file.warningCount++;
      else file.errorCount++;
    }
  }

  return JSON.stringify(Array.from(fileResults.values()), null, 2);
}

/**
 * Checkstyle XML
 * Widely supported by IDEs and tools
 * @see https://checkstyle.org/
 */
function checkstyle(results, options = {}) {
  const fileGroups = new Map();

  for (const url of (results.urls || [])) {
    for (const issue of (url.issues || [])) {
      if (!fileGroups.has(issue.file)) {
        fileGroups.set(issue.file, []);
      }
      fileGroups.get(issue.file).push({
        ...issue,
        url: url.path,
        score: url.auditScore
      });
    }
  }

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<checkstyle version="4.3">\n';

  for (const [file, issues] of fileGroups) {
    xml += `  <file name="${escapeXml(file)}">\n`;
    for (const issue of issues) {
      const severity = issue.message.startsWith('[Warning]') ? 'warning' : 'error';
      const message = escapeXml(issue.message.replace(/^\[(Error|Warning|Info)\]\s*/, ''));
      xml += `    <error line="${issue.line || 1}" column="1" severity="${severity}" message="${message}" source="${issue.check}"/>\n`;
    }
    xml += '  </file>\n';
  }

  xml += '</checkstyle>';
  return xml;
}

/**
 * PMD XML
 * @see https://pmd.github.io/
 */
function pmd(results, options = {}) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<pmd version="6.0.0" timestamp="' + new Date().toISOString() + '">\n';

  const fileGroups = new Map();
  for (const url of (results.urls || [])) {
    for (const issue of (url.issues || [])) {
      if (!fileGroups.has(issue.file)) fileGroups.set(issue.file, []);
      fileGroups.get(issue.file).push(issue);
    }
  }

  for (const [file, issues] of fileGroups) {
    xml += `  <file name="${escapeXml(file)}">\n`;
    for (const issue of issues) {
      const priority = issue.message.startsWith('[Warning]') ? 3 : 1;
      xml += `    <violation beginline="${issue.line || 1}" endline="${issue.line || 1}" begincolumn="1" endcolumn="1" rule="${issue.check}" ruleset="mat-a11y" priority="${priority}">\n`;
      xml += `      ${escapeXml(issue.message.replace(/^\[(Error|Warning|Info)\]\s*/, ''))}\n`;
      xml += '    </violation>\n';
    }
    xml += '  </file>\n';
  }

  xml += '</pmd>';
  return xml;
}

/**
 * FindBugs/SpotBugs XML
 * @see https://spotbugs.readthedocs.io/
 */
function findbugs(results, options = {}) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<BugCollection version="4.0.0" sequence="0" timestamp="' + Date.now() + '" analysisTimestamp="' + Date.now() + '" release="">\n';

  // Categories
  xml += '  <BugCategory category="A11Y"><Description>Accessibility</Description></BugCategory>\n';

  // Patterns
  const patterns = new Set();
  for (const url of (results.urls || [])) {
    for (const issue of (url.issues || [])) {
      patterns.add(issue.check);
    }
  }
  for (const pattern of patterns) {
    xml += `  <BugPattern type="${pattern}" abbrev="A11Y" category="A11Y"><ShortDescription>${pattern}</ShortDescription></BugPattern>\n`;
  }

  // Bugs
  for (const url of (results.urls || [])) {
    for (const issue of (url.issues || [])) {
      const priority = issue.message.startsWith('[Warning]') ? 2 : 1;
      xml += `  <BugInstance type="${issue.check}" priority="${priority}" rank="15" category="A11Y">\n`;
      xml += `    <ShortMessage>${escapeXml(issue.message.replace(/^\[(Error|Warning|Info)\]\s*/, ''))}</ShortMessage>\n`;
      xml += `    <SourceLine classname="" start="${issue.line || 1}" end="${issue.line || 1}" sourcepath="${escapeXml(issue.file)}"/>\n`;
      xml += '  </BugInstance>\n';
    }
  }

  xml += '</BugCollection>';
  return xml;
}

/**
 * Cppcheck XML (for tools that support it)
 */
function cppcheck(results, options = {}) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<results version="2">\n';
  xml += '  <cppcheck version="mat-a11y"/>\n';
  xml += '  <errors>\n';

  for (const url of (results.urls || [])) {
    for (const issue of (url.issues || [])) {
      const severity = issue.message.startsWith('[Warning]') ? 'warning' : 'error';
      xml += `    <error id="${issue.check}" severity="${severity}" msg="${escapeXml(issue.message.replace(/^\[(Error|Warning|Info)\]\s*/, ''))}">\n`;
      xml += `      <location file="${escapeXml(issue.file)}" line="${issue.line || 1}"/>\n`;
      xml += '    </error>\n';
    }
  }

  xml += '  </errors>\n';
  xml += '</results>';
  return xml;
}

// Helpers
function escapeXml(s) {
  return String(s).replace(/[<>&"']/g, c => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;'
  }[c]));
}

module.exports = {
  sonarqube,
  codeclimate,
  codacy,
  eslint,
  checkstyle,
  pmd,
  findbugs,
  cppcheck
};
