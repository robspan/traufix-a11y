'use strict';

/**
 * Component-Based Analyzer
 *
 * Simple, reliable analysis that scans ALL Angular components directly.
 * No sitemap, no route parsing - just finds @Component decorators and analyzes their templates/styles.
 *
 * Supports optional parallel execution via workers for large projects.
 */

const fs = require('fs');
const path = require('path');
const { loadAllChecks, getChecksByTier } = require('./loader');
const { calculateAuditScore } = require('./weights');
const { buildContext } = require('./variableResolver');
const { CheckRunner } = require('./runner');

/**
 * Find all TypeScript files with @Component decorator
 * @param {string} dir - Directory to search
 * @param {string[]} ignore - Patterns to ignore
 * @returns {string[]} Array of component file paths
 */
function findComponentFiles(dir, ignore = ['node_modules', 'dist', '.git', '.angular', 'coverage']) {
  const componentFiles = [];

  function walk(currentDir) {
    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (e) {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      // Check ignore patterns
      let shouldIgnore = false;
      for (const pattern of ignore) {
        if (fullPath.includes(pattern) || entry.name === pattern) {
          shouldIgnore = true;
          break;
        }
      }
      if (shouldIgnore) continue;

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
        // Quick check if file contains @Component
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          if (content.includes('@Component')) {
            componentFiles.push(fullPath);
          }
        } catch (e) {
          // Skip unreadable files
        }
      }
    }
  }

  walk(dir);
  return componentFiles;
}

/**
 * Parse a component file to extract metadata
 * @param {string} filePath - Path to component .ts file
 * @returns {object|null} Component metadata or null if not a component
 */
function parseComponent(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const componentDir = path.dirname(filePath);
  const fileName = path.basename(filePath, '.ts');

  // Find @Component decorator
  const componentMatch = content.match(/@Component\s*\(\s*\{([\s\S]*?)\}\s*\)/);
  if (!componentMatch) return null;

  const decoratorContent = componentMatch[1];

  // Extract selector
  const selectorMatch = decoratorContent.match(/selector\s*:\s*['"`]([^'"`]+)['"`]/);
  const selector = selectorMatch ? selectorMatch[1] : null;

  // Extract component name from class
  const classMatch = content.match(/export\s+class\s+(\w+)/);
  const className = classMatch ? classMatch[1] : fileName;

  const result = {
    filePath,
    selector,
    className,
    templateFile: null,
    styleFiles: [],
    inlineTemplate: null,
    inlineStyles: null
  };

  // Extract templateUrl or inline template
  const templateUrlMatch = decoratorContent.match(/templateUrl\s*:\s*['"`]([^'"`]+)['"`]/);
  if (templateUrlMatch) {
    result.templateFile = path.resolve(componentDir, templateUrlMatch[1]);
  } else {
    // Check for inline template
    const inlineTemplateMatch = decoratorContent.match(/template\s*:\s*`([\s\S]*?)`/);
    if (inlineTemplateMatch) {
      result.inlineTemplate = inlineTemplateMatch[1];
    }
  }

  // Extract styleUrls or inline styles
  const styleUrlsMatch = decoratorContent.match(/styleUrls?\s*:\s*\[([^\]]+)\]/);
  if (styleUrlsMatch) {
    const urlsString = styleUrlsMatch[1];
    const urls = urlsString.match(/['"`]([^'"`]+)['"`]/g);
    if (urls) {
      result.styleFiles = urls.map(u => {
        const cleanUrl = u.replace(/['"`]/g, '');
        return path.resolve(componentDir, cleanUrl);
      });
    }
  } else {
    // Check for single styleUrl
    const styleUrlMatch = decoratorContent.match(/styleUrl\s*:\s*['"`]([^'"`]+)['"`]/);
    if (styleUrlMatch) {
      result.styleFiles = [path.resolve(componentDir, styleUrlMatch[1])];
    } else {
      // Check for inline styles
      const inlineStylesMatch = decoratorContent.match(/styles\s*:\s*\[`([\s\S]*?)`\]/);
      if (inlineStylesMatch) {
        result.inlineStyles = inlineStylesMatch[1];
      }
    }
  }

  // If no template file found, try common naming conventions
  if (!result.templateFile && !result.inlineTemplate) {
    const possibleTemplates = [
      path.join(componentDir, `${fileName}.html`),
      path.join(componentDir, `${fileName}.component.html`)
    ];
    for (const tpl of possibleTemplates) {
      if (fs.existsSync(tpl)) {
        result.templateFile = tpl;
        break;
      }
    }
  }

  // If no style files found, try common naming conventions
  if (result.styleFiles.length === 0 && !result.inlineStyles) {
    const possibleStyles = [
      path.join(componentDir, `${fileName}.scss`),
      path.join(componentDir, `${fileName}.css`),
      path.join(componentDir, `${fileName}.component.scss`),
      path.join(componentDir, `${fileName}.component.css`)
    ];
    for (const style of possibleStyles) {
      if (fs.existsSync(style)) {
        result.styleFiles.push(style);
        break;
      }
    }
  }

  return result;
}

/**
 * Get check function by name
 */
function getCheckFunction(name, registry) {
  const checkModule = registry.get(name);
  if (checkModule && typeof checkModule.check === 'function') {
    return checkModule.check;
  }
  return null;
}

/**
 * Run a single check on content
 * @param {string} name - Check name
 * @param {string} content - Content to check
 * @param {Map} registry - Check registry
 * @param {object} varContext - Variable context for SCSS variable resolution (optional)
 */
function runCheck(name, content, registry, varContext = null) {
  const checkFn = getCheckFunction(name, registry);
  if (!checkFn) {
    return { pass: true, issues: [], elementsFound: 0 };
  }

  try {
    // Pass context to checks that support it (SCSS checks)
    const result = varContext ? checkFn(content, varContext) : checkFn(content);
    return {
      pass: result.pass,
      issues: result.issues || [],
      elementsFound: result.elementsFound || 0,
      variablesResolved: result.variablesResolved || 0,
      variablesSkipped: result.variablesSkipped || 0
    };
  } catch (error) {
    return { pass: true, issues: [], elementsFound: 0 };
  }
}

/**
 * Get check names by type from registry
 */
function getCheckNamesByType(registry, type) {
  const names = [];
  for (const [name, module] of registry) {
    if (module.type === type) {
      names.push(name);
    }
  }
  return names;
}

/**
 * Analyze a single component
 * @param {object} component - Parsed component metadata
 * @param {Map} registry - Check registry
 * @param {string[]} htmlChecks - HTML check names
 * @param {string[]} scssChecks - SCSS check names
 * @param {object} varContext - Variable context for SCSS variable resolution (optional)
 * @returns {object} Analysis result for this component
 */
function analyzeComponent(component, registry, htmlChecks, scssChecks, varContext = null) {
  const result = {
    name: component.className,
    selector: component.selector,
    tsFile: component.filePath,
    files: [],
    issues: [],
    checkAggregates: {}
  };

  // Analyze template
  if (component.templateFile && fs.existsSync(component.templateFile)) {
    result.files.push(component.templateFile);
    const content = fs.readFileSync(component.templateFile, 'utf-8');

    for (const checkName of htmlChecks) {
      const checkResult = runCheck(checkName, content, registry);

      if (!result.checkAggregates[checkName]) {
        result.checkAggregates[checkName] = { elementsFound: 0, issues: 0, errors: 0, warnings: 0 };
      }
      result.checkAggregates[checkName].elementsFound += checkResult.elementsFound;
      result.checkAggregates[checkName].issues += checkResult.issues.length;

      for (const issue of checkResult.issues) {
        const msg = typeof issue === 'string' ? issue : issue.message || '';
        const isError = msg.startsWith('[Error]');
        if (isError) result.checkAggregates[checkName].errors++;
        else result.checkAggregates[checkName].warnings++;

        result.issues.push({
          message: msg,
          file: component.templateFile,
          check: checkName
        });
      }
    }
  } else if (component.inlineTemplate) {
    // Analyze inline template
    for (const checkName of htmlChecks) {
      const checkResult = runCheck(checkName, component.inlineTemplate, registry);

      if (!result.checkAggregates[checkName]) {
        result.checkAggregates[checkName] = { elementsFound: 0, issues: 0, errors: 0, warnings: 0 };
      }
      result.checkAggregates[checkName].elementsFound += checkResult.elementsFound;
      result.checkAggregates[checkName].issues += checkResult.issues.length;

      for (const issue of checkResult.issues) {
        const msg = typeof issue === 'string' ? issue : issue.message || '';
        const isError = msg.startsWith('[Error]');
        if (isError) result.checkAggregates[checkName].errors++;
        else result.checkAggregates[checkName].warnings++;

        result.issues.push({
          message: msg,
          file: `${component.className} (inline template)`,
          check: checkName
        });
      }
    }
  }

  // Analyze style files
  for (const styleFile of component.styleFiles) {
    if (!fs.existsSync(styleFile)) continue;

    result.files.push(styleFile);
    const content = fs.readFileSync(styleFile, 'utf-8');

    for (const checkName of scssChecks) {
      const checkResult = runCheck(checkName, content, registry, varContext);

      if (!result.checkAggregates[checkName]) {
        result.checkAggregates[checkName] = { elementsFound: 0, issues: 0, errors: 0, warnings: 0 };
      }
      result.checkAggregates[checkName].elementsFound += checkResult.elementsFound;
      result.checkAggregates[checkName].issues += checkResult.issues.length;

      for (const issue of checkResult.issues) {
        const msg = typeof issue === 'string' ? issue : issue.message || '';
        const isError = msg.startsWith('[Error]');
        if (isError) result.checkAggregates[checkName].errors++;
        else result.checkAggregates[checkName].warnings++;

        result.issues.push({
          message: msg,
          file: styleFile,
          check: checkName
        });
      }
    }
  }

  // Analyze inline styles
  if (component.inlineStyles) {
    for (const checkName of scssChecks) {
      const checkResult = runCheck(checkName, component.inlineStyles, registry, varContext);

      if (!result.checkAggregates[checkName]) {
        result.checkAggregates[checkName] = { elementsFound: 0, issues: 0, errors: 0, warnings: 0 };
      }
      result.checkAggregates[checkName].elementsFound += checkResult.elementsFound;
      result.checkAggregates[checkName].issues += checkResult.issues.length;

      for (const issue of checkResult.issues) {
        const msg = typeof issue === 'string' ? issue : issue.message || '';
        const isError = msg.startsWith('[Error]');
        if (isError) result.checkAggregates[checkName].errors++;
        else result.checkAggregates[checkName].warnings++;

        result.issues.push({
          message: msg,
          file: `${component.className} (inline styles)`,
          check: checkName
        });
      }
    }
  }

  return result;
}

/**
 * Analyze all components in a project
 * @param {string} projectDir - Project directory
 * @param {object} options - Options
 * @returns {object} Analysis results
 */
function analyzeByComponent(projectDir, options = {}) {
  const tier = options.tier || 'full';
  const ignore = options.ignore || ['node_modules', 'dist', '.git', '.angular', 'coverage'];

  // Load check registry
  const fullRegistry = loadAllChecks();
  const registry = getChecksByTier(fullRegistry, tier);
  const htmlChecks = getCheckNamesByType(registry, 'html');
  const scssChecks = getCheckNamesByType(registry, 'scss');

  // Build variable context for SCSS resolution
  let varContext = null;
  try {
    varContext = buildContext(projectDir);
  } catch (e) {
    // Continue without variable resolution if it fails
    console.warn('[ComponentAnalyzer] Warning: Variable context build failed:', e.message);
  }

  // Find all component files
  const componentFiles = findComponentFiles(projectDir, ignore);

  if (componentFiles.length === 0) {
    return {
      error: 'No Angular components found. Make sure you are in an Angular project.',
      components: [],
      componentCount: 0
    };
  }

  // Parse and analyze each component
  const componentResults = [];
  const globalCheckAggregates = {};
  let totalIssues = 0;
  let totalComponentsScanned = 0;

  for (const filePath of componentFiles) {
    const component = parseComponent(filePath);
    if (!component) continue;

    // Skip components with no template and no styles
    if (!component.templateFile && !component.inlineTemplate &&
        component.styleFiles.length === 0 && !component.inlineStyles) {
      continue;
    }

    const result = analyzeComponent(component, registry, htmlChecks, scssChecks, varContext);

    // Count only components we actually analyzed (i.e., have template/styles)
    totalComponentsScanned++;

    // Skip components with no issues
    if (result.issues.length === 0) continue;

    componentResults.push(result);
    totalIssues += result.issues.length;

    // Merge into global aggregates
    for (const [checkName, data] of Object.entries(result.checkAggregates)) {
      if (!globalCheckAggregates[checkName]) {
        globalCheckAggregates[checkName] = { elementsFound: 0, issues: 0, errors: 0, warnings: 0 };
      }
      globalCheckAggregates[checkName].elementsFound += data.elementsFound;
      globalCheckAggregates[checkName].issues += data.issues;
      globalCheckAggregates[checkName].errors += data.errors;
      globalCheckAggregates[checkName].warnings += data.warnings;
    }
  }

  // Sort by issue count (worst first)
  componentResults.sort((a, b) => b.issues.length - a.issues.length);

  // Calculate overall audit score
  const auditResult = calculateAuditScore(globalCheckAggregates);

  return {
    tier,
    componentCount: componentResults.length,
    totalComponentsScanned,
    totalIssues,
    auditScore: auditResult.score,
    audits: auditResult.audits,
    components: componentResults
  };
}

/**
 * Analyze all components in a project (async with optional parallelism)
 * @param {string} projectDir - Project directory
 * @param {object} options - Options
 * @param {string} options.tier - Check tier ('basic', 'material', 'full')
 * @param {string[]} options.ignore - Patterns to ignore
 * @param {number|'auto'|'sync'} options.workers - Worker mode ('sync' default, 'auto', or number)
 * @returns {Promise<object>} Analysis results
 */
async function analyzeByComponentAsync(projectDir, options = {}) {
  const tier = options.tier || 'full';
  const ignore = options.ignore || ['node_modules', 'dist', '.git', '.angular', 'coverage'];
  const workers = options.workers || 'sync';

  // For sync mode, use the synchronous implementation
  if (workers === 'sync') {
    return analyzeByComponent(projectDir, options);
  }

  // Load check registry
  const fullRegistry = loadAllChecks();
  const registry = getChecksByTier(fullRegistry, tier);

  // Build variable context for SCSS resolution (still sync - one-time cost)
  let varContext = null;
  try {
    varContext = buildContext(projectDir);
  } catch (e) {
    console.warn('[ComponentAnalyzer] Warning: Variable context build failed:', e.message);
  }

  // Find all component files
  const componentFiles = findComponentFiles(projectDir, ignore);

  if (componentFiles.length === 0) {
    return {
      error: 'No Angular components found. Make sure you are in an Angular project.',
      components: [],
      componentCount: 0
    };
  }

  // Parse components and collect all files to analyze
  const components = [];
  const filesToAnalyze = [];
  const componentFileMap = new Map(); // Map file path to component index

  for (let i = 0; i < componentFiles.length; i++) {
    const component = parseComponent(componentFiles[i]);
    if (!component) continue;

    // Skip components with no template and no styles
    if (!component.templateFile && !component.inlineTemplate &&
        component.styleFiles.length === 0 && !component.inlineStyles) {
      continue;
    }

    components.push({
      ...component,
      index: i,
      issues: [],
      checkAggregates: {}
    });

    // Collect files for batch processing
    if (component.templateFile && fs.existsSync(component.templateFile)) {
      filesToAnalyze.push({
        path: component.templateFile,
        content: fs.readFileSync(component.templateFile, 'utf-8'),
        componentIndex: components.length - 1,
        type: 'html'
      });
    } else if (component.inlineTemplate) {
      // Use .html extension so worker correctly identifies as HTML
      filesToAnalyze.push({
        path: `${component.className}-inline.html`,
        content: component.inlineTemplate,
        componentIndex: components.length - 1,
        type: 'html'
      });
    }

    for (const styleFile of component.styleFiles) {
      if (fs.existsSync(styleFile)) {
        filesToAnalyze.push({
          path: styleFile,
          content: fs.readFileSync(styleFile, 'utf-8'),
          componentIndex: components.length - 1,
          type: 'scss'
        });
      }
    }

    if (component.inlineStyles) {
      // Use .scss extension so worker correctly identifies as SCSS
      filesToAnalyze.push({
        path: `${component.className}-inline.scss`,
        content: component.inlineStyles,
        componentIndex: components.length - 1,
        type: 'scss'
      });
    }
  }

  // Create runner and process files in parallel
  const runner = new CheckRunner({ workers });
  await runner.init();

  try {
    const runnerResults = await runner.runChecks(filesToAnalyze, tier, { varContext });

    // Map results back to components
    for (const [filePath, fileResult] of runnerResults.files) {
      // Find which component this file belongs to
      const fileInfo = filesToAnalyze.find(f => f.path === filePath);
      if (!fileInfo) continue;

      const component = components[fileInfo.componentIndex];

      for (const [checkName, checkData] of fileResult.checks) {
        if (!component.checkAggregates[checkName]) {
          component.checkAggregates[checkName] = { elementsFound: 0, issues: 0, errors: 0, warnings: 0 };
        }
        component.checkAggregates[checkName].elementsFound += checkData.elementsFound || 0;
        component.checkAggregates[checkName].issues += (checkData.issues || []).length;

        for (const issue of checkData.issues || []) {
          const msg = typeof issue === 'string' ? issue : issue;
          const isError = msg.startsWith('[Error]');
          if (isError) component.checkAggregates[checkName].errors++;
          else component.checkAggregates[checkName].warnings++;

          component.issues.push({
            message: msg,
            file: filePath,
            check: checkName
          });
        }
      }
    }
  } finally {
    await runner.shutdown();
  }

  // Aggregate results
  const componentResults = [];
  const globalCheckAggregates = {};
  let totalIssues = 0;

  for (const component of components) {
    if (component.issues.length === 0) continue;

    componentResults.push({
      name: component.className,
      selector: component.selector,
      tsFile: component.filePath,
      files: [component.templateFile, ...component.styleFiles].filter(Boolean),
      issues: component.issues,
      checkAggregates: component.checkAggregates
    });
    totalIssues += component.issues.length;

    // Merge into global aggregates
    for (const [checkName, data] of Object.entries(component.checkAggregates)) {
      if (!globalCheckAggregates[checkName]) {
        globalCheckAggregates[checkName] = { elementsFound: 0, issues: 0, errors: 0, warnings: 0 };
      }
      globalCheckAggregates[checkName].elementsFound += data.elementsFound;
      globalCheckAggregates[checkName].issues += data.issues;
      globalCheckAggregates[checkName].errors += data.errors;
      globalCheckAggregates[checkName].warnings += data.warnings;
    }
  }

  // Sort by issue count (worst first)
  componentResults.sort((a, b) => b.issues.length - a.issues.length);

  // Calculate overall audit score
  const auditResult = calculateAuditScore(globalCheckAggregates);

  return {
    tier,
    componentCount: componentResults.length,
    totalComponentsScanned: components.length,
    totalIssues,
    auditScore: auditResult.score,
    audits: auditResult.audits,
    components: componentResults
  };
}

/**
 * Format component analysis results for console
 */
function formatComponentResults(results) {
  const lines = [];

  lines.push('========================================');
  lines.push('  MAT-A11Y COMPONENT ANALYSIS');
  lines.push('========================================');
  lines.push('');

  if (results.error) {
    lines.push('Error: ' + results.error);
    return lines.join('\n');
  }

  lines.push('Tier: ' + results.tier.toUpperCase());
  lines.push('Components scanned: ' + results.totalComponentsScanned);
  lines.push('Components with issues: ' + results.componentCount);
  lines.push('Total issues: ' + results.totalIssues);
  lines.push('');

  if (results.componentCount === 0) {
    lines.push('No accessibility issues found!');
    lines.push('');
    lines.push('========================================');
    return lines.join('\n');
  }

  lines.push('COMPONENTS WITH ISSUES:');
  for (const comp of results.components.slice(0, 15)) {
    lines.push(`  ${comp.name}: ${comp.issues.length} issues`);
  }
  if (results.components.length > 15) {
    lines.push(`  ... and ${results.components.length - 15} more components`);
  }
  lines.push('');

  lines.push('FIX PRIORITIES:');
  for (let i = 0; i < Math.min(3, results.components.length); i++) {
    const comp = results.components[i];
    lines.push(`  ${i + 1}. ${comp.name} (${comp.issues.length} issues)`);

    // Group issues by check
    const byCheck = {};
    for (const issue of comp.issues) {
      if (!byCheck[issue.check]) byCheck[issue.check] = 0;
      byCheck[issue.check]++;
    }

    // Show top checks
    const topChecks = Object.entries(byCheck)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    for (const [check, count] of topChecks) {
      lines.push(`     - ${check}: ${count} errors`);
    }
    lines.push('');
  }

  lines.push('========================================');

  return lines.join('\n');
}

module.exports = {
  findComponentFiles,
  parseComponent,
  analyzeComponent,
  analyzeByComponent,
  analyzeByComponentAsync,
  formatComponentResults
};
