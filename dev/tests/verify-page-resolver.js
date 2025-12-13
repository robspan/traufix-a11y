#!/usr/bin/env node

/**
 * Development Tests - Page Resolver
 * 
 * Tests the deep component resolution functionality that builds
 * a complete picture of what makes up a page by recursively
 * resolving child components.
 * 
 * This is a DEVELOPMENT test - it verifies the PageResolver internals.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Import the modules we're testing
const { PageResolver, createPageResolver } = require('../../src/core/pageResolver');
const { buildComponentRegistry, findComponentSelectorsInHtml, resolvePageComponents, getRegistryStats } = require('../../src/core/componentRegistry');

// Test utilities
let testDir;
let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    passCount++;
    console.log(`  ✓ ${message}`);
  } else {
    failCount++;
    console.log(`  ✗ ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  const pass = actual === expected;
  if (pass) {
    passCount++;
    console.log(`  ✓ ${message}`);
  } else {
    failCount++;
    console.log(`  ✗ ${message}`);
    console.log(`    Expected: ${expected}`);
    console.log(`    Actual:   ${actual}`);
  }
}

function assertIncludes(array, item, message) {
  const pass = array.includes(item);
  if (pass) {
    passCount++;
    console.log(`  ✓ ${message}`);
  } else {
    failCount++;
    console.log(`  ✗ ${message}`);
    console.log(`    Array does not include: ${item}`);
    console.log(`    Array contents: ${JSON.stringify(array)}`);
  }
}

/**
 * Create a mock Angular project for testing
 */
function createMockProject() {
  testDir = path.join(os.tmpdir(), `mat-a11y-test-${Date.now()}`);
  const srcDir = path.join(testDir, 'src', 'app');
  
  // Create directory structure
  fs.mkdirSync(path.join(srcDir, 'home'), { recursive: true });
  fs.mkdirSync(path.join(srcDir, 'shared', 'header'), { recursive: true });
  fs.mkdirSync(path.join(srcDir, 'shared', 'footer'), { recursive: true });
  fs.mkdirSync(path.join(srcDir, 'shared', 'nav'), { recursive: true });
  fs.mkdirSync(path.join(srcDir, 'features', 'widget'), { recursive: true });
  
  // Home component (route component)
  fs.writeFileSync(path.join(srcDir, 'home', 'home.component.ts'), `
import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {}
`);
  
  fs.writeFileSync(path.join(srcDir, 'home', 'home.component.html'), `
<app-header></app-header>
<main>
  <h1>Welcome Home</h1>
  <app-widget></app-widget>
</main>
<app-footer></app-footer>
`);
  
  fs.writeFileSync(path.join(srcDir, 'home', 'home.component.scss'), `
:host { display: block; }
`);

  // Header component (shared)
  fs.writeFileSync(path.join(srcDir, 'shared', 'header', 'header.component.ts'), `
import { Component } from '@angular/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {}
`);
  
  fs.writeFileSync(path.join(srcDir, 'shared', 'header', 'header.component.html'), `
<header>
  <img src="logo.png">
  <app-nav></app-nav>
</header>
`);
  
  fs.writeFileSync(path.join(srcDir, 'shared', 'header', 'header.component.scss'), `
header { display: flex; }
`);

  // Nav component (nested in header)
  fs.writeFileSync(path.join(srcDir, 'shared', 'nav', 'nav.component.ts'), `
import { Component } from '@angular/core';

@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html'
})
export class NavComponent {}
`);
  
  fs.writeFileSync(path.join(srcDir, 'shared', 'nav', 'nav.component.html'), `
<nav>
  <a href="/">Home</a>
  <a href="/about">About</a>
</nav>
`);

  // Footer component (shared)
  fs.writeFileSync(path.join(srcDir, 'shared', 'footer', 'footer.component.ts'), `
import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  template: \`<footer><p>Copyright 2025</p></footer>\`,
  styles: [\`footer { padding: 20px; }\`]
})
export class FooterComponent {}
`);

  // Widget component (feature)
  fs.writeFileSync(path.join(srcDir, 'features', 'widget', 'widget.component.ts'), `
import { Component } from '@angular/core';

@Component({
  selector: 'app-widget',
  templateUrl: './widget.component.html',
  styleUrl: './widget.component.css'
})
export class WidgetComponent {}
`);
  
  fs.writeFileSync(path.join(srcDir, 'features', 'widget', 'widget.component.html'), `
<div class="widget">
  <button>Click me</button>
</div>
`);
  
  fs.writeFileSync(path.join(srcDir, 'features', 'widget', 'widget.component.css'), `
.widget { border: 1px solid #ccc; }
`);

  return testDir;
}

/**
 * Clean up test directory
 */
function cleanupMockProject() {
  if (testDir && fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

// ============================================
// TESTS
// ============================================

console.log('');
console.log('==========================================');
console.log('  DEV TEST: PAGE RESOLVER');
console.log('==========================================');
console.log('');

// Setup
console.log('Setting up mock Angular project...');
createMockProject();
console.log(`Created test project at: ${testDir}`);
console.log('');

// Test 1: buildComponentRegistry
console.log('TEST 1: buildComponentRegistry');
console.log('-------------------------------');
const registry = buildComponentRegistry(testDir);
assertEqual(registry.size, 5, 'Registry should find 5 components');

const headerInfo = registry.get('app-header');
assert(headerInfo !== undefined, 'Should find app-header component');
assert(headerInfo?.templateUrl?.endsWith('header.component.html'), 'Header should have templateUrl');
assertEqual(headerInfo?.styleUrls?.length, 1, 'Header should have 1 styleUrl');

const footerInfo = registry.get('app-footer');
assert(footerInfo !== undefined, 'Should find app-footer component');
assert(footerInfo?.template?.includes('Copyright'), 'Footer should have inline template');
assertEqual(footerInfo?.templateUrl, null, 'Footer should NOT have templateUrl (uses inline)');

const widgetInfo = registry.get('app-widget');
assert(widgetInfo !== undefined, 'Should find app-widget component');
assertEqual(widgetInfo?.styleUrls?.length, 1, 'Widget should have 1 styleUrl (from styleUrl singular)');
console.log('');

// Test 2: getRegistryStats
console.log('TEST 2: getRegistryStats');
console.log('------------------------');
const stats = getRegistryStats(registry);
assertEqual(stats.total, 5, 'Total should be 5');
assertEqual(stats.withTemplate, 4, 'Should have 4 with external templates');
assertEqual(stats.withInlineTemplate, 1, 'Should have 1 with inline template (footer)');
assertEqual(stats.withStyles, 3, 'Should have 3 with styles (home, header, widget - nav has none)');
console.log('');

// Test 3: findComponentSelectorsInHtml
console.log('TEST 3: findComponentSelectorsInHtml');
console.log('------------------------------------');
const homeHtml = fs.readFileSync(path.join(testDir, 'src', 'app', 'home', 'home.component.html'), 'utf-8');
const selectors = findComponentSelectorsInHtml(homeHtml);
assertEqual(selectors.length, 3, 'Home template should have 3 component selectors');
assertIncludes(selectors, 'app-header', 'Should find app-header');
assertIncludes(selectors, 'app-widget', 'Should find app-widget');
assertIncludes(selectors, 'app-footer', 'Should find app-footer');

// Should NOT include standard HTML elements
const htmlWithStandard = '<app-test></app-test><ng-container></ng-container><div></div>';
const standardSelectors = findComponentSelectorsInHtml(htmlWithStandard);
assertEqual(standardSelectors.length, 1, 'Should only find app-test, not ng-container');
assertIncludes(standardSelectors, 'app-test', 'Should find app-test');
console.log('');

// Test 4: resolvePageComponents (recursive resolution)
console.log('TEST 4: resolvePageComponents (recursive)');
console.log('-----------------------------------------');
const homePath = path.join(testDir, 'src', 'app', 'home', 'home.component.html');
const pageComponents = resolvePageComponents(homePath, registry);

// Should find all HTML files (home + header + nav + widget, footer is inline)
assert(pageComponents.htmlFiles.length >= 4, `Should resolve 4+ HTML files, got ${pageComponents.htmlFiles.length}`);
assert(pageComponents.htmlFiles.some(f => f.includes('home.component.html')), 'Should include home.component.html');
assert(pageComponents.htmlFiles.some(f => f.includes('header.component.html')), 'Should include header.component.html');
assert(pageComponents.htmlFiles.some(f => f.includes('nav.component.html')), 'Should include nav.component.html (nested in header)');
assert(pageComponents.htmlFiles.some(f => f.includes('widget.component.html')), 'Should include widget.component.html');

// Should find SCSS/CSS files
assert(pageComponents.scssFiles.length >= 2, `Should resolve 2+ SCSS files, got ${pageComponents.scssFiles.length}`);
assert(pageComponents.scssFiles.some(f => f.includes('header.component.scss')), 'Should include header.component.scss');
assert(pageComponents.scssFiles.some(f => f.includes('widget.component.css')), 'Should include widget.component.css');

// Should find inline templates
assertEqual(pageComponents.inlineTemplates.length, 1, 'Should find 1 inline template (footer)');
assertEqual(pageComponents.inlineTemplates[0]?.selector, 'app-footer', 'Inline template should be from footer');

// Should list all components found
assert(pageComponents.components.length >= 4, `Should find 4+ components, got ${pageComponents.components.length}`);
assertIncludes(pageComponents.components, 'app-header', 'Should list app-header');
assertIncludes(pageComponents.components, 'app-nav', 'Should list app-nav');
assertIncludes(pageComponents.components, 'app-widget', 'Should list app-widget');
assertIncludes(pageComponents.components, 'app-footer', 'Should list app-footer');
console.log('');

// Test 5: PageResolver class
console.log('TEST 5: PageResolver class');
console.log('--------------------------');
const resolver = new PageResolver(testDir);
assertEqual(resolver.initialized, false, 'Should not be initialized before calling initialize()');

resolver.initialize();
assertEqual(resolver.initialized, true, 'Should be initialized after calling initialize()');

const resolverStats = resolver.getStats();
assertEqual(resolverStats.total, 5, 'Resolver stats should show 5 components');
console.log('');

// Test 6: createPageResolver factory
console.log('TEST 6: createPageResolver factory');
console.log('-----------------------------------');
const autoResolver = createPageResolver(testDir);
assertEqual(autoResolver.initialized, true, 'Factory should auto-initialize by default');

const manualResolver = createPageResolver(testDir, false);
assertEqual(manualResolver.initialized, false, 'Factory with autoInit=false should not initialize');
console.log('');

// Test 7: resolver.resolvePage
console.log('TEST 7: resolver.resolvePage');
console.log('----------------------------');
const resolvedPage = autoResolver.resolvePage(homePath);
assert(resolvedPage.htmlFiles.length >= 4, 'resolvePage should resolve all HTML files');
assert(resolvedPage.components.length >= 4, 'resolvePage should list all child components');
assertEqual(resolvedPage.primaryHtml, homePath, 'Should track primary HTML path');
console.log('');

// Test 8: resolver.resolveRouteFiles
console.log('TEST 8: resolver.resolveRouteFiles');
console.log('----------------------------------');
const routeFiles = {
  html: homePath,
  scss: path.join(testDir, 'src', 'app', 'home', 'home.component.scss')
};
const resolvedRoute = autoResolver.resolveRouteFiles(routeFiles);
assert(resolvedRoute.htmlFiles.length >= 4, 'resolveRouteFiles should resolve all HTML files');
assert(resolvedRoute.scssFiles.length >= 1, 'resolveRouteFiles should include primary SCSS');
assertEqual(resolvedRoute.primaryHtml, homePath, 'Should track primary HTML');
assertEqual(resolvedRoute.primaryScss, routeFiles.scss, 'Should track primary SCSS');

// Test with null input
const nullResolved = autoResolver.resolveRouteFiles(null);
assertEqual(nullResolved.htmlFiles.length, 0, 'Null input should return empty htmlFiles');
assertEqual(nullResolved.scssFiles.length, 0, 'Null input should return empty scssFiles');
console.log('');

// Test 9: Circular reference handling
console.log('TEST 9: Circular reference handling');
console.log('-----------------------------------');
// Create a component that references itself or creates a cycle
const circularDir = path.join(testDir, 'src', 'app', 'circular');
fs.mkdirSync(circularDir, { recursive: true });

fs.writeFileSync(path.join(circularDir, 'circular.component.ts'), `
import { Component } from '@angular/core';

@Component({
  selector: 'app-circular',
  templateUrl: './circular.component.html'
})
export class CircularComponent {}
`);

fs.writeFileSync(path.join(circularDir, 'circular.component.html'), `
<div>
  <app-circular></app-circular>
  <app-header></app-header>
</div>
`);

// Rebuild registry with circular component
const circularRegistry = buildComponentRegistry(testDir);
const circularPath = path.join(circularDir, 'circular.component.html');

// This should NOT infinite loop
const circularResult = resolvePageComponents(circularPath, circularRegistry);
assert(circularResult.htmlFiles.length > 0, 'Should resolve without infinite loop');
assert(circularResult.htmlFiles.length < 100, 'Should not have excessive files from loop');
// The circular component should appear once in components list
const circularCount = circularResult.components.filter(c => c === 'app-circular').length;
assert(circularCount <= 1, 'Circular component should only appear once (visited tracking)');
console.log('');

// Cleanup
console.log('Cleaning up...');
cleanupMockProject();
console.log('');

// Results
console.log('==========================================');
console.log('  RESULTS');
console.log('==========================================');
console.log(`  Passed: ${passCount}`);
console.log(`  Failed: ${failCount}`);
console.log('');

if (failCount > 0) {
  console.log('❌ Some tests failed!');
  process.exit(1);
} else {
  console.log('✅ All tests passed!');
  process.exit(0);
}
