#!/usr/bin/env node
/**
 * Generate all formatter outputs for example folder
 */
const fs = require('fs');
const path = require('path');
const { analyzeBySitemap, findSitemap } = require('./src/core/sitemapAnalyzer.js');
const { loadAllFormatters } = require('./src/formatters/index.js');

const targetPath = process.argv[2] || 'C:/Users/spani/OneDrive/Dokumente/GitHub/noro-wedding';
const outputDir = path.join(__dirname, 'example-outputs');

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
    const filename = `report-${name}${ext}`;
    const filepath = path.join(outputDir, filename);

    fs.writeFileSync(filepath, output);
    console.log(`✓ ${name} → ${filename}`);
  } catch (e) {
    console.error(`✗ ${name}: ${e.message}`);
  }
}

// Also save raw JSON
const jsonPath = path.join(outputDir, 'report-raw.json');
fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
console.log(`✓ raw → report-raw.json`);

console.log('\nDone!');
