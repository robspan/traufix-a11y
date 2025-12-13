'use strict';

/**
 * Error Robustness Tests for PageResolver and ComponentRegistry
 * 
 * These tests are written TDD-style - they define expected behavior
 * for edge cases without assuming implementation details.
 * 
 * PRINCIPLE: These modules should NEVER throw. They should always
 * return sensible defaults and degrade gracefully.
 */

const path = require('path');
const fs = require('fs');

// Test utilities
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${e.message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertArray(value, message) {
  if (!Array.isArray(value)) {
    throw new Error(message || `Expected array, got ${typeof value}`);
  }
}

function assertObject(value, message) {
  if (typeof value !== 'object' || value === null) {
    throw new Error(message || `Expected object, got ${typeof value}`);
  }
}

function assertNoThrow(fn, message) {
  try {
    fn();
  } catch (e) {
    throw new Error(message || `Function threw: ${e.message}`);
  }
}

// ============================================================
// COMPONENT REGISTRY TESTS
// ============================================================

console.log('\n========================================');
console.log('ComponentRegistry Error Robustness Tests');
console.log('========================================\n');

const {
  buildComponentRegistry,
  findComponentSelectorsInHtml,
  resolvePageComponents,
  getRegistryStats
} = require('../../src/core/componentRegistry');

console.log('buildComponentRegistry():');

test('should not throw with null projectDir', () => {
  assertNoThrow(() => buildComponentRegistry(null));
});

test('should not throw with undefined projectDir', () => {
  assertNoThrow(() => buildComponentRegistry(undefined));
});

test('should not throw with empty string projectDir', () => {
  assertNoThrow(() => buildComponentRegistry(''));
});

test('should not throw with number as projectDir', () => {
  assertNoThrow(() => buildComponentRegistry(12345));
});

test('should not throw with object as projectDir', () => {
  assertNoThrow(() => buildComponentRegistry({ path: '/some/path' }));
});

test('should not throw with array as projectDir', () => {
  assertNoThrow(() => buildComponentRegistry(['/some/path']));
});

test('should return a Map with null input', () => {
  const result = buildComponentRegistry(null);
  assert(result instanceof Map, 'Should return a Map');
});

test('should return empty Map for non-existent directory', () => {
  const result = buildComponentRegistry('/non/existent/path/12345');
  assert(result instanceof Map, 'Should return a Map');
  assertEqual(result.size, 0, 'Map should be empty');
});

test('should return empty Map for file path instead of directory', () => {
  const result = buildComponentRegistry(__filename);
  assert(result instanceof Map, 'Should return a Map');
});

console.log('\nfindComponentSelectorsInHtml():');

test('should not throw with null input', () => {
  assertNoThrow(() => findComponentSelectorsInHtml(null));
});

test('should not throw with undefined input', () => {
  assertNoThrow(() => findComponentSelectorsInHtml(undefined));
});

test('should not throw with number input', () => {
  assertNoThrow(() => findComponentSelectorsInHtml(12345));
});

test('should not throw with object input', () => {
  assertNoThrow(() => findComponentSelectorsInHtml({ html: '<div></div>' }));
});

test('should not throw with array input', () => {
  assertNoThrow(() => findComponentSelectorsInHtml(['<app-test></app-test>']));
});

test('should return empty array for null', () => {
  const result = findComponentSelectorsInHtml(null);
  assertArray(result);
  assertEqual(result.length, 0);
});

test('should return empty array for empty string', () => {
  const result = findComponentSelectorsInHtml('');
  assertArray(result);
  assertEqual(result.length, 0);
});

test('should return empty array for plain text', () => {
  const result = findComponentSelectorsInHtml('Hello World');
  assertArray(result);
  assertEqual(result.length, 0);
});

test('should return empty array for standard HTML only', () => {
  const result = findComponentSelectorsInHtml('<div><span>test</span></div>');
  assertArray(result);
  assertEqual(result.length, 0);
});

test('should find component selectors in valid HTML', () => {
  const result = findComponentSelectorsInHtml('<app-header></app-header><app-footer/>');
  assertArray(result);
  assert(result.length >= 1, 'Should find at least one selector');
});

test('should handle malformed HTML gracefully', () => {
  const result = findComponentSelectorsInHtml('<app-header <div></app-footer');
  assertArray(result);
  // Should not throw, result contents don't matter
});

test('should handle very long strings', () => {
  const longHtml = '<div>' + 'x'.repeat(1000000) + '</div>';
  assertNoThrow(() => findComponentSelectorsInHtml(longHtml));
});

test('should handle special characters in HTML', () => {
  const html = '<div>Special chars: éàü 中文 🎉 \0 \n\t</div>';
  assertNoThrow(() => findComponentSelectorsInHtml(html));
});

console.log('\nresolvePageComponents():');

test('should not throw with null htmlPath', () => {
  assertNoThrow(() => resolvePageComponents(null, new Map()));
});

test('should not throw with null registry', () => {
  assertNoThrow(() => resolvePageComponents('/some/path.html', null));
});

test('should not throw with both null', () => {
  assertNoThrow(() => resolvePageComponents(null, null));
});

test('should not throw with undefined arguments', () => {
  assertNoThrow(() => resolvePageComponents(undefined, undefined));
});

test('should not throw with wrong registry type (object)', () => {
  assertNoThrow(() => resolvePageComponents('/path.html', { get: () => null }));
});

test('should not throw with wrong registry type (array)', () => {
  assertNoThrow(() => resolvePageComponents('/path.html', []));
});

test('should not throw with wrong registry type (string)', () => {
  assertNoThrow(() => resolvePageComponents('/path.html', 'registry'));
});

test('should not throw with number as htmlPath', () => {
  assertNoThrow(() => resolvePageComponents(12345, new Map()));
});

test('should return proper structure for null inputs', () => {
  const result = resolvePageComponents(null, null);
  assertObject(result);
  assertArray(result.htmlFiles);
  assertArray(result.scssFiles);
  assertArray(result.components);
  assertArray(result.inlineTemplates);
});

test('should return empty arrays for non-existent path', () => {
  const result = resolvePageComponents('/non/existent/file.html', new Map());
  assertArray(result.htmlFiles);
  assertEqual(result.htmlFiles.length, 0);
});

test('should handle registry with circular references', () => {
  // Create a registry with components that reference each other
  const registry = new Map();
  registry.set('app-a', {
    selector: 'app-a',
    templateUrl: null,
    template: '<app-b></app-b>',
    styleUrls: []
  });
  registry.set('app-b', {
    selector: 'app-b',
    templateUrl: null,
    template: '<app-a></app-a>', // Circular!
    styleUrls: []
  });
  
  // Should handle circular reference without infinite loop or crash
  assertNoThrow(() => {
    const result = resolvePageComponents('/fake/path.html', registry);
    assertObject(result);
  });
});

test('should handle registry with malformed entries', () => {
  const registry = new Map();
  registry.set('app-broken', null);
  registry.set('app-incomplete', { selector: 'app-incomplete' }); // Missing other fields
  registry.set('app-wrong-type', 'not an object');
  registry.set(null, { selector: 'null-key' });
  
  assertNoThrow(() => resolvePageComponents('/fake/path.html', registry));
});

console.log('\ngetRegistryStats():');

test('should not throw with null registry', () => {
  assertNoThrow(() => getRegistryStats(null));
});

test('should not throw with undefined registry', () => {
  assertNoThrow(() => getRegistryStats(undefined));
});

test('should not throw with wrong type (object)', () => {
  assertNoThrow(() => getRegistryStats({ size: 10 }));
});

test('should not throw with wrong type (array)', () => {
  assertNoThrow(() => getRegistryStats([]));
});

test('should not throw with wrong type (string)', () => {
  assertNoThrow(() => getRegistryStats('registry'));
});

test('should return proper structure for null', () => {
  const result = getRegistryStats(null);
  assertObject(result);
  assertEqual(typeof result.total, 'number');
  assertEqual(typeof result.withTemplate, 'number');
  assertEqual(typeof result.withInlineTemplate, 'number');
  assertEqual(typeof result.withStyles, 'number');
});

test('should return zeros for empty Map', () => {
  const result = getRegistryStats(new Map());
  assertEqual(result.total, 0);
  assertEqual(result.withTemplate, 0);
  assertEqual(result.withInlineTemplate, 0);
  assertEqual(result.withStyles, 0);
});

test('should handle Map with malformed entries', () => {
  const registry = new Map();
  registry.set('ok', { templateUrl: '/path', styleUrls: ['/style.scss'] });
  registry.set('null-entry', null);
  registry.set('string-entry', 'not an object');
  registry.set('missing-arrays', { templateUrl: '/path' }); // No styleUrls
  
  assertNoThrow(() => getRegistryStats(registry));
  const result = getRegistryStats(registry);
  assertObject(result);
  assert(result.total >= 0, 'Should have non-negative total');
});

// ============================================================
// PAGE RESOLVER TESTS
// ============================================================

console.log('\n========================================');
console.log('PageResolver Error Robustness Tests');
console.log('========================================\n');

const { PageResolver, createPageResolver } = require('../../src/core/pageResolver');

console.log('createPageResolver():');

test('should not throw with null projectDir', () => {
  assertNoThrow(() => createPageResolver(null));
});

test('should not throw with undefined projectDir', () => {
  assertNoThrow(() => createPageResolver(undefined));
});

test('should not throw with empty string', () => {
  assertNoThrow(() => createPageResolver(''));
});

test('should not throw with number as projectDir', () => {
  assertNoThrow(() => createPageResolver(12345));
});

test('should not throw with object as projectDir', () => {
  assertNoThrow(() => createPageResolver({ path: '/test' }));
});

test('should return a PageResolver instance even with bad input', () => {
  const resolver = createPageResolver(null);
  assert(resolver instanceof PageResolver, 'Should return PageResolver instance');
});

test('should return initialized resolver by default', () => {
  const resolver = createPageResolver('/non/existent');
  assert(resolver.initialized === true, 'Should be initialized');
});

test('should allow skipping auto-init', () => {
  const resolver = createPageResolver('/non/existent', false);
  assert(resolver.initialized === false, 'Should not be initialized');
});

console.log('\nPageResolver.initialize():');

test('should not throw when initializing with bad projectDir', () => {
  const resolver = new PageResolver(null);
  assertNoThrow(() => resolver.initialize());
});

test('should be idempotent (safe to call multiple times)', () => {
  const resolver = new PageResolver('/test');
  assertNoThrow(() => {
    resolver.initialize();
    resolver.initialize();
    resolver.initialize();
  });
});

test('should mark as initialized even on failure', () => {
  const resolver = new PageResolver('/non/existent/12345');
  resolver.initialize();
  assert(resolver.initialized === true, 'Should be marked as initialized');
});

test('should return this for chaining', () => {
  const resolver = new PageResolver('/test');
  const result = resolver.initialize();
  assert(result === resolver, 'Should return this');
});

console.log('\nPageResolver.getStats():');

test('should not throw before initialization', () => {
  const resolver = new PageResolver('/test');
  assertNoThrow(() => resolver.getStats());
});

test('should not throw after failed initialization', () => {
  const resolver = createPageResolver('/non/existent/12345');
  assertNoThrow(() => resolver.getStats());
});

test('should return proper structure', () => {
  const resolver = createPageResolver('/test');
  const stats = resolver.getStats();
  assertObject(stats);
  assertEqual(typeof stats.total, 'number');
  assertEqual(typeof stats.withTemplate, 'number');
});

test('should return zeros for failed initialization', () => {
  const resolver = createPageResolver('/non/existent/12345');
  const stats = resolver.getStats();
  assertEqual(stats.total, 0);
});

console.log('\nPageResolver.resolvePage():');

test('should not throw with null htmlPath', () => {
  const resolver = createPageResolver('/test');
  assertNoThrow(() => resolver.resolvePage(null));
});

test('should not throw with undefined htmlPath', () => {
  const resolver = createPageResolver('/test');
  assertNoThrow(() => resolver.resolvePage(undefined));
});

test('should not throw with number as htmlPath', () => {
  const resolver = createPageResolver('/test');
  assertNoThrow(() => resolver.resolvePage(12345));
});

test('should not throw with object as htmlPath', () => {
  const resolver = createPageResolver('/test');
  assertNoThrow(() => resolver.resolvePage({ path: '/test.html' }));
});

test('should not throw with empty string htmlPath', () => {
  const resolver = createPageResolver('/test');
  assertNoThrow(() => resolver.resolvePage(''));
});

test('should not throw with non-existent file', () => {
  const resolver = createPageResolver('/test');
  assertNoThrow(() => resolver.resolvePage('/non/existent/file.html'));
});

test('should return proper structure for null input', () => {
  const resolver = createPageResolver('/test');
  const result = resolver.resolvePage(null);
  assertObject(result);
  assertArray(result.htmlFiles);
  assertArray(result.scssFiles);
  assertArray(result.inlineTemplates);
  assertArray(result.components);
  assert('primaryHtml' in result, 'Should have primaryHtml');
  assert('primaryScss' in result, 'Should have primaryScss');
});

test('should return empty arrays for invalid path', () => {
  const resolver = createPageResolver('/test');
  const result = resolver.resolvePage('/non/existent/file.html');
  assertEqual(result.htmlFiles.length, 0);
  assertEqual(result.scssFiles.length, 0);
});

test('should handle both null html and scss paths', () => {
  const resolver = createPageResolver('/test');
  assertNoThrow(() => resolver.resolvePage(null, null));
});

test('should handle mixed valid/invalid paths', () => {
  const resolver = createPageResolver('/test');
  assertNoThrow(() => resolver.resolvePage('/valid.html', 12345));
  assertNoThrow(() => resolver.resolvePage(null, '/valid.scss'));
});

console.log('\nPageResolver.resolveRouteFiles():');

test('should not throw with null routeFiles', () => {
  const resolver = createPageResolver('/test');
  assertNoThrow(() => resolver.resolveRouteFiles(null));
});

test('should not throw with undefined routeFiles', () => {
  const resolver = createPageResolver('/test');
  assertNoThrow(() => resolver.resolveRouteFiles(undefined));
});

test('should not throw with empty object', () => {
  const resolver = createPageResolver('/test');
  assertNoThrow(() => resolver.resolveRouteFiles({}));
});

test('should not throw with wrong type (string)', () => {
  const resolver = createPageResolver('/test');
  assertNoThrow(() => resolver.resolveRouteFiles('route files'));
});

test('should not throw with wrong type (array)', () => {
  const resolver = createPageResolver('/test');
  assertNoThrow(() => resolver.resolveRouteFiles(['/file1.html', '/file2.html']));
});

test('should not throw with wrong type (number)', () => {
  const resolver = createPageResolver('/test');
  assertNoThrow(() => resolver.resolveRouteFiles(12345));
});

test('should return proper structure for null', () => {
  const resolver = createPageResolver('/test');
  const result = resolver.resolveRouteFiles(null);
  assertObject(result);
  assertArray(result.htmlFiles);
  assertArray(result.scssFiles);
});

test('should handle object with wrong property types', () => {
  const resolver = createPageResolver('/test');
  assertNoThrow(() => resolver.resolveRouteFiles({ html: 123, scss: {} }));
});

test('should handle object with null properties', () => {
  const resolver = createPageResolver('/test');
  assertNoThrow(() => resolver.resolveRouteFiles({ html: null, scss: null }));
});

// ============================================================
// INTEGRATION / STRESS TESTS
// ============================================================

console.log('\n========================================');
console.log('Integration & Stress Tests');
console.log('========================================\n');

test('should handle rapid successive calls', () => {
  const resolver = createPageResolver('/test');
  assertNoThrow(() => {
    for (let i = 0; i < 100; i++) {
      resolver.resolvePage(`/file${i}.html`);
    }
  });
});

test('should handle concurrent-style operations', () => {
  assertNoThrow(() => {
    const resolvers = [];
    for (let i = 0; i < 10; i++) {
      resolvers.push(createPageResolver(`/project${i}`));
    }
    for (const r of resolvers) {
      r.resolvePage('/test.html');
      r.getStats();
    }
  });
});

test('should handle very deep component nesting in registry', () => {
  const registry = new Map();
  
  // Create a chain of 100 components
  for (let i = 0; i < 100; i++) {
    registry.set(`app-level-${i}`, {
      selector: `app-level-${i}`,
      template: i < 99 ? `<app-level-${i + 1}></app-level-${i + 1}>` : '<div>leaf</div>',
      templateUrl: null,
      styleUrls: []
    });
  }
  
  assertNoThrow(() => {
    const result = resolvePageComponents('/fake.html', registry);
    assertObject(result);
  });
});

test('should handle registry with thousands of entries', () => {
  const registry = new Map();
  
  for (let i = 0; i < 1000; i++) {
    registry.set(`app-component-${i}`, {
      selector: `app-component-${i}`,
      templateUrl: `/path/to/component-${i}.html`,
      styleUrls: [`/path/to/component-${i}.scss`]
    });
  }
  
  assertNoThrow(() => {
    const stats = getRegistryStats(registry);
    assertEqual(stats.total, 1000);
  });
});

test('should handle HTML with thousands of component references', () => {
  let html = '<div>';
  for (let i = 0; i < 1000; i++) {
    html += `<app-item-${i}></app-item-${i}>`;
  }
  html += '</div>';
  
  assertNoThrow(() => {
    const selectors = findComponentSelectorsInHtml(html);
    assertArray(selectors);
    assert(selectors.length > 0, 'Should find selectors');
  });
});

// ============================================================
// SUMMARY
// ============================================================

console.log('\n========================================');
console.log('Test Results');
console.log('========================================');
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
console.log(`  Total:  ${passed + failed}`);
console.log('========================================\n');

if (failed > 0) {
  process.exit(1);
}
