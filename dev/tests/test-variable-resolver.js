'use strict';

/**
 * Tests for Variable Resolver
 * 
 * Tests SCSS/CSS variable resolution, including:
 * - SCSS variables ($name)
 * - CSS custom properties (var(--name))
 * - SCSS maps (map-get)
 * - Variable chains ($a: $b)
 */

const {
  buildContext,
  emptyContext,
  resolveValue,
  resolveVariablesInExpression,
  isLiteralColor,
  isColorFunction,
  containsVariable
} = require('../../src/core/variableResolver');

const { parseVariables } = require('../../src/core/scssParser');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    if (process.argv.includes('--verbose')) {
      console.log(`  ✓ ${name}`);
    }
  } catch (e) {
    failed++;
    console.log(`  ✗ ${name}`);
    console.log(`    ${e.message}`);
  }
}

function assertEqual(actual, expected, msg = '') {
  if (actual !== expected) {
    throw new Error(`${msg}\n    Expected: ${expected}\n    Actual: ${actual}`);
  }
}

function assertNotNull(value, msg = '') {
  if (value === null || value === undefined) {
    throw new Error(`${msg}\n    Expected non-null value`);
  }
}

function assertNull(value, msg = '') {
  if (value !== null && value !== undefined) {
    throw new Error(`${msg}\n    Expected null, got: ${value}`);
  }
}

console.log('\nVariable Resolver Tests\n');

// ============ Utility Tests ============
console.log('Utility Functions:');

test('isLiteralColor detects hex colors', () => {
  assertEqual(isLiteralColor('#fff'), true);
  assertEqual(isLiteralColor('#ffffff'), true);
  assertEqual(isLiteralColor('#FFF'), true);
  assertEqual(isLiteralColor('#aabbcc'), true);
});

test('isLiteralColor detects rgb/rgba', () => {
  assertEqual(isLiteralColor('rgb(255, 0, 0)'), true);
  assertEqual(isLiteralColor('rgba(255, 0, 0, 0.5)'), true);
});

test('isLiteralColor detects named colors', () => {
  assertEqual(isLiteralColor('white'), true);
  assertEqual(isLiteralColor('black'), true);
  assertEqual(isLiteralColor('red'), true);
  assertEqual(isLiteralColor('transparent'), true);
});

test('isLiteralColor returns false for variables', () => {
  assertEqual(isLiteralColor('$primary'), false);
  assertEqual(isLiteralColor('var(--color)'), false);
  assertEqual(isLiteralColor('lighten(#fff, 10%)'), false);
});

test('isColorFunction detects SCSS functions', () => {
  assertEqual(isColorFunction('lighten(#fff, 10%)'), true);
  assertEqual(isColorFunction('darken($color, 20%)'), true);
  assertEqual(isColorFunction('mix(red, blue, 50%)'), true);
  assertEqual(isColorFunction('rgba(255, 0, 0, 0.5)'), true);
});

test('isColorFunction returns false for non-functions', () => {
  assertEqual(isColorFunction('#fff'), false);
  assertEqual(isColorFunction('$primary'), false);
  assertEqual(isColorFunction('var(--color)'), false);
});

test('containsVariable detects SCSS variables', () => {
  assertEqual(containsVariable('$primary'), true);
  assertEqual(containsVariable('color: $text'), true);
  assertEqual(containsVariable('lighten($base, 10%)'), true);
});

test('containsVariable detects CSS variables', () => {
  assertEqual(containsVariable('var(--color)'), true);
  assertEqual(containsVariable('color: var(--text)'), true);
});

test('containsVariable returns false for literals', () => {
  assertEqual(containsVariable('#fff'), false);
  assertEqual(containsVariable('rgb(0,0,0)'), false);
  assertEqual(containsVariable('white'), false);
});

// ============ SCSS Variable Resolution ============
console.log('\nSCSS Variable Resolution:');

test('resolves simple SCSS variable', () => {
  const context = emptyContext();
  context.scssVars.set('$primary', '#1a73e8');
  
  const result = resolveValue('$primary', context);
  assertEqual(result, '#1a73e8');
});

test('resolves chained SCSS variables', () => {
  const context = emptyContext();
  context.scssVars.set('$gray-600', '#757575');
  context.scssVars.set('$text-muted', '$gray-600');
  
  const result = resolveValue('$text-muted', context);
  assertEqual(result, '#757575');
});

test('returns null for undefined SCSS variable', () => {
  const context = emptyContext();
  
  const result = resolveValue('$undefined', context);
  assertNull(result);
});

// ============ CSS Custom Property Resolution ============
console.log('\nCSS Custom Property Resolution:');

test('resolves CSS var()', () => {
  const context = emptyContext();
  context.cssVars.set('--primary', '#1a73e8');
  
  const result = resolveValue('var(--primary)', context);
  assertEqual(result, '#1a73e8');
});

test('resolves CSS var() with fallback when undefined', () => {
  const context = emptyContext();
  
  const result = resolveValue('var(--undefined, #000)', context);
  assertEqual(result, '#000');
});

test('resolves CSS var() without using fallback when defined', () => {
  const context = emptyContext();
  context.cssVars.set('--color', '#fff');
  
  const result = resolveValue('var(--color, #000)', context);
  assertEqual(result, '#fff');
});

// ============ Color Function Resolution ============
console.log('\nColor Function Resolution:');

test('resolves lighten() with literal color', () => {
  const context = emptyContext();
  
  const result = resolveValue('lighten(#000000, 50%)', context);
  assertNotNull(result);
  // Should be around #808080 (50% lighter than black)
  assertEqual(isLiteralColor(result), true);
});

test('resolves darken() with literal color', () => {
  const context = emptyContext();
  
  const result = resolveValue('darken(#ffffff, 50%)', context);
  assertNotNull(result);
  assertEqual(isLiteralColor(result), true);
});

test('resolves color function with SCSS variable', () => {
  const context = emptyContext();
  context.scssVars.set('$base', '#1a73e8');
  
  const result = resolveValue('lighten($base, 20%)', context);
  assertNotNull(result);
  assertEqual(isLiteralColor(result), true);
});

test('resolves rgba() with color and alpha', () => {
  const context = emptyContext();
  
  const result = resolveValue('rgba(#000, 0.5)', context);
  assertNotNull(result);
  assertEqual(result.includes('rgba') || result.includes('0.5'), true);
});

// ============ SCSS Map Resolution ============
console.log('\nSCSS Map Resolution:');

test('resolves map-get()', () => {
  const context = emptyContext();
  const colorMap = new Map();
  colorMap.set('primary', '#1a73e8');
  colorMap.set('danger', '#dc3545');
  context.maps.set('$colors', colorMap);
  
  const result = resolveValue('map-get($colors, primary)', context);
  assertEqual(result, '#1a73e8');
});

test('returns null for undefined map key', () => {
  const context = emptyContext();
  const colorMap = new Map();
  colorMap.set('primary', '#1a73e8');
  context.maps.set('$colors', colorMap);
  
  const result = resolveValue('map-get($colors, undefined)', context);
  assertNull(result);
});

// ============ SCSS Parser Tests ============
console.log('\nSCSS Parser:');

test('parses SCSS variable definitions', () => {
  const content = `
    $primary: #1a73e8;
    $secondary: #333333;
  `;
  
  const { scssVars } = parseVariables(content);
  assertEqual(scssVars.get('$primary'), '#1a73e8');
  assertEqual(scssVars.get('$secondary'), '#333333');
});

test('parses CSS custom property definitions', () => {
  const content = `
    :root {
      --primary: #1a73e8;
      --text-color: #333;
    }
  `;
  
  const { cssVars } = parseVariables(content);
  assertEqual(cssVars.get('--primary'), '#1a73e8');
  assertEqual(cssVars.get('--text-color'), '#333');
});

test('parses SCSS map definitions', () => {
  const content = `
    $colors: (
      primary: #1a73e8,
      danger: #dc3545
    );
  `;
  
  const { maps } = parseVariables(content);
  const colorMap = maps.get('$colors');
  assertNotNull(colorMap);
  assertEqual(colorMap.get('primary'), '#1a73e8');
  assertEqual(colorMap.get('danger'), '#dc3545');
});

test('parses !default variables', () => {
  const content = `
    $font-size: 16px !default;
  `;
  
  const { scssVars } = parseVariables(content);
  assertEqual(scssVars.get('$font-size'), '16px');
});

// ============ Integration Tests ============
console.log('\nIntegration:');

test('resolves expression with multiple variables', () => {
  const context = emptyContext();
  context.scssVars.set('$base-color', '#1a73e8');
  
  const result = resolveVariablesInExpression('lighten($base-color, 10%)', context);
  assertNotNull(result);
  // Should be resolved hex color, not contain $base-color
  assertEqual(result.includes('$base-color'), false);
});

test('emptyContext returns usable context', () => {
  const context = emptyContext();
  assertNotNull(context.scssVars);
  assertNotNull(context.cssVars);
  assertNotNull(context.maps);
});

// ============ Summary ============
console.log('\n' + '='.repeat(50));
console.log(`Variable Resolver Tests: ${passed} passed, ${failed} failed`);
console.log('='.repeat(50));

if (failed > 0) {
  process.exit(1);
}
