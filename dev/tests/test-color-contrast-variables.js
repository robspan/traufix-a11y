#!/usr/bin/env node

/**
 * Test Color Contrast with Variable Resolution
 * 
 * Tests that the colorContrast check correctly handles:
 * - SCSS variables ($var)
 * - CSS custom properties (var(--name))
 * - SCSS color functions (lighten, darken, mix, etc.)
 * - Variable chains ($a: $b)
 * - Fallback values var(--x, fallback)
 * 
 * Validates against false positives and false negatives.
 */

const { buildContext, resolveValue } = require('../../src/core/variableResolver');
const colorContrastCheck = require('../../src/checks/colorContrast');

const c = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  dim: '\x1b[2m',
  bold: '\x1b[1m'
};

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ${c.green}✓${c.reset} ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ${c.red}✗${c.reset} ${name}`);
    console.log(`    ${c.dim}${e.message}${c.reset}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

console.log('\n' + c.bold + 'Color Contrast Variable Resolution Tests' + c.reset + '\n');

// Build a shared context with various variables
const scssContent = `
  // Basic colors
  $primary: #1a73e8;
  $primary-dark: #0d47a1;
  $text-dark: #333333;
  $text-light: #cccccc;
  $bg-white: #ffffff;
  $bg-dark: #1a1a1a;
  
  // Chains
  $brand-color: #4a1426;
  $button-text: $brand-color;
  
  // For function tests
  $base: #000000;
  
  :root {
    --primary: #1a73e8;
    --text-muted: #999999;
    --bg-light: #ffffff;
  }
`;

const context = buildContext([scssContent]);

// ============================================================
// TRUE POSITIVES - Bad contrast that SHOULD be flagged
// ============================================================
console.log(c.bold + 'True Positives (should find issues):' + c.reset);

test('flags light text on light background (literal)', () => {
  const scss = `.bad { color: #cccccc; background: #ffffff; }`;
  const result = colorContrastCheck.check(scss, context);
  assert(!result.pass, 'Should flag low contrast');
  assert(result.issues.length > 0, 'Should have issues');
});

test('flags low contrast with SCSS variables', () => {
  const scss = `.bad { color: $text-light; background: $bg-white; }`;
  const result = colorContrastCheck.check(scss, context);
  assert(!result.pass, 'Should flag low contrast from resolved variables');
});

test('flags low contrast with CSS custom properties', () => {
  const scss = `.bad { color: var(--text-muted); background: var(--bg-light); }`;
  const result = colorContrastCheck.check(scss, context);
  assert(!result.pass, 'Should flag low contrast from CSS vars');
});

test('flags low contrast from lighten() function', () => {
  const scss = `.bad { color: lighten($base, 70%); background: $bg-white; }`;
  const result = colorContrastCheck.check(scss, context);
  assert(!result.pass, 'Should flag low contrast from color function');
});

test('flags rgba with very low alpha', () => {
  const scss = `.bad { color: rgba(0, 0, 0, 0.2); background: #ffffff; }`;
  const result = colorContrastCheck.check(scss, context);
  assert(!result.pass, 'Should flag highly transparent text');
});

// ============================================================
// TRUE NEGATIVES - Good contrast that should NOT be flagged
// ============================================================
console.log('\n' + c.bold + 'True Negatives (should NOT find issues):' + c.reset);

test('passes dark text on light background (literal)', () => {
  const scss = `.good { color: #333333; background: #ffffff; }`;
  const result = colorContrastCheck.check(scss, context);
  assert(result.pass, 'Should pass good contrast');
});

test('passes dark SCSS variable on light background', () => {
  const scss = `.good { color: $text-dark; background: $bg-white; }`;
  const result = colorContrastCheck.check(scss, context);
  assert(result.pass, 'Should pass good contrast from variables');
});

test('passes white on dark background', () => {
  const scss = `.good { color: #ffffff; background: $bg-dark; }`;
  const result = colorContrastCheck.check(scss, context);
  assert(result.pass, 'Should pass light-on-dark contrast');
});

test('passes CSS var with good contrast', () => {
  const scss = `.good { color: var(--primary); background: var(--bg-light); }`;
  const result = colorContrastCheck.check(scss, context);
  assert(result.pass, 'Should pass CSS var with good contrast');
});

test('passes darken() creating good contrast', () => {
  const scss = `.good { color: darken(#ffffff, 80%); background: #ffffff; }`;
  const result = colorContrastCheck.check(scss, context);
  assert(result.pass, 'Should pass darkened color with good contrast');
});

test('passes variable chain resolution', () => {
  const scss = `.good { color: $button-text; background: $bg-white; }`;
  const result = colorContrastCheck.check(scss, context);
  // $button-text -> $brand-color -> #4a1426 (dark maroon) on white = good contrast
  assert(result.pass, 'Should resolve variable chain and pass');
});

// ============================================================
// EDGE CASES - Unresolvable variables should be skipped (not flagged)
// ============================================================
console.log('\n' + c.bold + 'Edge Cases (unresolvable should skip):' + c.reset);

test('skips undefined SCSS variable (no false positive)', () => {
  const scss = `.unknown { color: $undefined-var; background: #ffffff; }`;
  const result = colorContrastCheck.check(scss, context);
  // Should pass because we can't resolve it - don't flag as error
  assert(result.pass, 'Should skip unresolvable SCSS var');
});

test('skips undefined CSS custom property (no false positive)', () => {
  const scss = `.unknown { color: var(--not-defined); background: #ffffff; }`;
  const result = colorContrastCheck.check(scss, context);
  // Should pass because we can't resolve it - don't flag as error
  assert(result.pass, 'Should skip unresolvable CSS var');
});

test('uses fallback value when CSS var undefined', () => {
  const scss = `.fallback { color: var(--undefined, #333333); background: #ffffff; }`;
  const result = colorContrastCheck.check(scss, context);
  // Fallback #333 on white = good contrast
  assert(result.pass, 'Should use fallback value and pass');
});

test('flags bad fallback value when CSS var undefined', () => {
  const scss = `.fallback { color: var(--undefined, #cccccc); background: #ffffff; }`;
  const result = colorContrastCheck.check(scss, context);
  // Fallback #ccc on white = bad contrast
  assert(!result.pass, 'Should use fallback value and flag bad contrast');
});

test('skips gradient backgrounds (cannot analyze)', () => {
  const scss = `.gradient { color: #333333; background: linear-gradient(to right, #fff, #000); }`;
  const result = colorContrastCheck.check(scss, context);
  // Gradients are skipped, not flagged
  assert(result.pass, 'Should skip gradient backgrounds');
});

test('skips image backgrounds (cannot analyze)', () => {
  const scss = `.image { color: #333333; background: url('bg.png'); }`;
  const result = colorContrastCheck.check(scss, context);
  assert(result.pass, 'Should skip image backgrounds');
});

// ============================================================
// MIX FUNCTION TESTS
// ============================================================
console.log('\n' + c.bold + 'Color Function Tests:' + c.reset);

test('mix() with 80% black = dark gray (good contrast)', () => {
  const scss = `.mix { color: mix(#000, #fff, 80%); background: #ffffff; }`;
  const result = colorContrastCheck.check(scss, context);
  // mix(black, white, 80%) = mostly black = good contrast
  assert(result.pass, 'mix(black, white, 80%) should pass');
});

test('mix() with 30% black = light gray (bad contrast)', () => {
  const scss = `.mix { color: mix(#000, #fff, 30%); background: #ffffff; }`;
  const result = colorContrastCheck.check(scss, context);
  // mix(black, white, 30%) = mostly white = bad contrast
  assert(!result.pass, 'mix(black, white, 30%) should fail');
});

test('rgba() with variable and alpha', () => {
  const scss = `.rgba { color: rgba($primary, 0.9); background: $bg-white; }`;
  const result = colorContrastCheck.check(scss, context);
  // #1a73e8 at 90% opacity on white - should still be okay
  assert(result.pass, 'rgba with high alpha should pass');
});

// ============================================================
// SUMMARY
// ============================================================
console.log('\n' + c.bold + '========================================' + c.reset);
console.log(c.bold + '  RESULTS' + c.reset);
console.log(c.bold + '========================================' + c.reset);
console.log(`\n  ${c.green}Passed: ${passed}${c.reset}`);
console.log(`  ${c.red}Failed: ${failed}${c.reset}\n`);

if (failed > 0) {
  console.log(c.red + 'Color Contrast Variable Tests: FAILED' + c.reset + '\n');
  process.exit(1);
} else {
  console.log(c.green + 'Color Contrast Variable Tests: ' + passed + ' passed, 0 failed' + c.reset + '\n');
  process.exit(0);
}
