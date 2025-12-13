'use strict';

/**
 * AI/LLM-Optimized Formatter
 * 
 * Simple TODO checklist for AI assistants to work through.
 * One line per issue, grouped by file, checkboxes for tracking.
 */

/**
 * Format results as simple TODO checklist
 */
function format(results, options = {}) {
  const lines = [];

  // Combine sitemap URLs + internal routes
  const urls = results.urls || [];
  const internalRoutes = (results.internal && results.internal.routes) || [];
  const allUrls = [...urls, ...internalRoutes];

  // Group all issues by file
  const issuesByFile = new Map();

  for (const url of allUrls) {
    for (const issue of (url.issues || [])) {
      const filePath = issue.file || 'unknown';
      
      if (!issuesByFile.has(filePath)) {
        issuesByFile.set(filePath, []);
      }

      // Extract the code snippet and create a simple fix hint
      const parsed = parseIssue(issue.message);
      const element = parsed.element || issue.element || '';
      const fix = getQuickFix(issue.check, parsed);

      issuesByFile.get(filePath).push({
        check: issue.check,
        element: element,
        fix: fix
      });
    }
  }

  // Sort files by number of issues
  const sortedFiles = [...issuesByFile.entries()]
    .filter(([_, issues]) => issues.length > 0)
    .sort((a, b) => b[1].length - a[1].length);

  if (sortedFiles.length === 0) {
    lines.push('✓ No accessibility issues found!');
    return lines.join('\n');
  }

  // Header
  const totalIssues = sortedFiles.reduce((sum, [_, issues]) => sum + issues.length, 0);
  lines.push(`ACCESSIBILITY TODO: ${totalIssues} issues in ${sortedFiles.length} files`);
  lines.push('Mark [x] when fixed. Re-run linter to verify.');
  lines.push('');

  // Output by file
  for (const [filePath, issues] of sortedFiles) {
    const shortPath = filePath.replace(/\\/g, '/').split('/').slice(-4).join('/');
    
    lines.push(`────────────────────────────────────────`);
    lines.push(`FILE: ${shortPath}`);
    lines.push(`────────────────────────────────────────`);

    // Deduplicate identical issues
    const seen = new Map();
    for (const issue of issues) {
      const key = `${issue.check}|${issue.element}`;
      if (!seen.has(key)) {
        seen.set(key, { ...issue, count: 1 });
      } else {
        seen.get(key).count++;
      }
    }

    for (const [_, issue] of seen) {
      const countStr = issue.count > 1 ? ` (×${issue.count})` : '';
      const elementStr = issue.element ? `: ${issue.element.substring(0, 60)}${issue.element.length > 60 ? '...' : ''}` : '';
      lines.push(`[ ] ${issue.check}${elementStr}${countStr}`);
      if (issue.fix) {
        lines.push(`    → ${issue.fix}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Get a quick one-line fix suggestion
 */
function getQuickFix(check, parsed) {
  const fixes = {
    'matIconAccessibility': 'Add aria-hidden="true" OR aria-label="description"',
    'clickWithoutKeyboard': 'Add (keydown.enter) and (keydown.space) OR use <button>',
    'clickWithoutRole': 'Add role="button" tabindex="0" OR use <button>',
    'imageAlt': 'Add alt="description" OR alt="" if decorative',
    'buttonNames': 'Add aria-label OR visible text',
    'linkNames': 'Add aria-label OR visible text',
    'formLabels': 'Add <label> OR aria-label',
    'headingOrder': parsed.fixes[0] || 'Fix heading hierarchy (h1→h2→h3)',
    'iframeTitles': 'Add title="description"',
    'htmlHasLang': 'Add lang="en" to <html>',
    'metaViewport': 'Ensure user-scalable=yes',
    'focusStyles': 'Add :focus-visible styles',
    'hoverWithoutFocus': 'Add :focus styles matching :hover',
    'colorContrast': 'Increase color contrast ratio',
    'matFormFieldLabel': 'Add <mat-label> inside mat-form-field',
    'matCheckboxLabel': 'Add aria-label OR text content',
    'matRadioGroupLabel': 'Add aria-label to mat-radio-group',
    'matSelectPlaceholder': 'Add placeholder OR mat-label',
    'matDialogFocus': 'Add cdkFocusInitial to first focusable element',
    'matMenuTrigger': 'Add aria-label to trigger button',
    'matTabLabel': 'Add aria-label to mat-tab',
    'matExpansionHeader': 'Add aria-label if no text',
    'ariaHiddenBody': 'Remove aria-hidden from <body>',
    'duplicateIdAria': 'Use unique IDs for ARIA references'
  };

  return fixes[check] || (parsed.fixes[0] ? parsed.fixes[0] : null);
}

/**
 * Parse issue message for element and fixes
 */
function parseIssue(issueStr) {
  const result = { fixes: [], element: null };
  if (!issueStr) return result;

  const lines = issueStr.split('\n');
  let inFixes = false;

  for (const line of lines) {
    if (line.includes('How to fix:')) {
      inFixes = true;
      continue;
    }
    if (inFixes && line.trim().startsWith('-')) {
      result.fixes.push(line.trim().substring(1).trim());
      continue;
    }
    const foundMatch = line.match(/Found:\s*(.+?)(?:\s*\(line\s*\d+\))?$/);
    if (foundMatch) {
      result.element = foundMatch[1].trim();
      inFixes = false;
    }
  }
  return result;
}

module.exports = {
  name: 'ai',
  description: 'Simple TODO checklist for AI/LLM to fix issues',
  category: 'docs',
  output: 'text',
  fileExtension: '.todo.txt',
  mimeType: 'text/plain',
  format
};
