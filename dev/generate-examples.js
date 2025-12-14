#!/usr/bin/env node
/**
 * Generate all formatter outputs for example-outputs folder
 *
 * Usage: node dev-tools/generate-examples.js <path-to-angular-project>
 */
const fs = require('fs');
const path = require('path');
const { analyzeBySitemap, findSitemap } = require('../src/core/sitemapAnalyzer.js');
const { loadAllFormatters } = require('../src/formatters/index.js');

const targetPath = process.argv[2];
const outputDir = path.join(__dirname, '..', 'example-outputs');

if (!targetPath) {
  console.log('Generate example formatter outputs from a real Angular project.\n');
  console.log('Usage: node dev-tools/generate-examples.js <path-to-angular-project>');
  console.log('Example: node dev-tools/generate-examples.js ../my-angular-app');
  process.exit(1);
}

console.log('Analyzing:', targetPath);
console.log('Output to:', outputDir);
console.log('');

// Run analysis
const sitemapPath = findSitemap(targetPath);
if (!sitemapPath) {
  console.error('No sitemap found');
  process.exit(1);
}

const results = analyzeBySitemap(targetPath, { tier: 'full', sitemap: sitemapPath });

if (results.error) {
  console.error('Analysis error:', results.error);
  process.exit(1);
}

console.log(`Analyzed ${results.urlCount} sitemap URLs + ${results.internal?.count || 0} internal routes\n`);

// Load all formatters
const formatters = loadAllFormatters();

// Generate each format
for (const [name, formatter] of formatters) {
  try {
    const output = formatter.format(results);
    const ext = formatter.fileExtension || '.txt';
    const filename = `_report-${name}${ext}`;
    const filepath = path.join(outputDir, filename);

    fs.writeFileSync(filepath, output);
    console.log(`✓ ${name} → ${filename}`);
  } catch (e) {
    console.error(`✗ ${name}: ${e.message}`);
  }
}

// Also save raw JSON
const jsonPath = path.join(outputDir, '_report-raw.json');
fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
console.log(`✓ raw → _report-raw.json`);

console.log('\nDone!');
