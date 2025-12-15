#!/usr/bin/env node
/**
 * Generate all formatter outputs for example-outputs folder
 * Uses component-based analysis (same as CLI default)
 *
 * Usage: node dev/generate-examples.js <path-to-angular-project>
 */
const fs = require('fs');
const path = require('path');
const { analyzeByComponent } = require('../src/core/componentAnalyzer.js');
const { loadAllFormatters } = require('../src/formatters/index.js');
const { optimizeIssues, getOptimizationSummary } = require('../src/core/issueOptimizer.js');

const targetPath = process.argv[2] || '.';
const outputDir = path.join(__dirname, '..', 'example-outputs');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('Component-based analysis of:', targetPath);
console.log('Output to:', outputDir);
console.log('');

// Remove old _report-* files to avoid stale duplicates
const existing = fs.readdirSync(outputDir).filter(n => n.startsWith('_report-'));
for (const f of existing) {
  try { fs.unlinkSync(path.join(outputDir, f)); } catch (e) { /* ignore */ }
}

// Run component analysis (same as CLI default)
let results;
try {
  results = analyzeByComponent(targetPath, { tier: 'full' });
} catch (e) {
  console.error('Analysis failed:', e && e.message ? e.message : e);
  process.exit(1);
}

if (results.error) {
  console.error(results.error);
  process.exit(2);
}

console.log(`Analyzed ${results.totalComponentsScanned} components (${results.componentCount} with issues)\n`);

// Optimize issues by collapsing to root cause
const optimizedResults = optimizeIssues(results, targetPath, { enabled: true });
const summary = getOptimizationSummary(optimizedResults);
if (summary) console.log(summary + '\n');

// Load all formatters
const formatters = loadAllFormatters();

// Generate each format
for (const [name, formatter] of formatters) {
  try {
    const output = formatter.format(optimizedResults);
    const ext = formatter.fileExtension || '.txt';
    const filename = `_report-${name}${ext}`;
    const filepath = path.join(outputDir, filename);

    fs.writeFileSync(filepath, output);
    console.log(`✓ ${name} → ${filename}`);
  } catch (e) {
    console.error(`✗ ${name}: ${e.message}`);
  }
}

// Also save raw JSON (with optimization metadata)
const jsonPath = path.join(outputDir, '_report-raw.json');
fs.writeFileSync(jsonPath, JSON.stringify(optimizedResults, null, 2));
console.log(`✓ raw → _report-raw.json`);

console.log('\nDone!');
