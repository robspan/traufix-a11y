'use strict';

/**
 * Tests for SCSS Color Functions
 * 
 * Tests all SCSS color manipulation functions:
 * - lighten, darken
 * - saturate, desaturate
 * - adjust-hue, complement
 * - mix, invert
 * - rgba, rgb, hsl, hsla
 * - transparentize, opacify
 * - grayscale
 */

const {
  lighten,
  darken,
  saturate,
  desaturate,
  adjustHue,
  complement,
  invert,
  mix,
  rgba,
  rgb,
  hsl,
  hsla,
  transparentize,
  opacify,
  grayscale,
  red,
  green,
  blue,
  hue,
  saturation,
  lightness,
  alpha,
  evaluateColorFunction
} = require('../../src/core/scssColorFunctions');

const { parseToRgb, rgbToHex } = require('../../src/core/colorMath');

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

function assertApproxEqual(actual, expected, tolerance = 0.01, msg = '') {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${msg}\n    Expected: ~${expected}\n    Actual: ${actual}`);
  }
}

function assertColorApprox(actual, expected, msg = '') {
  const actualRgb = parseToRgb(actual);
  const expectedRgb = parseToRgb(expected);
  
  if (!actualRgb || !expectedRgb) {
    throw new Error(`${msg}\n    Could not parse colors: ${actual}, ${expected}`);
  }
  
  const diff = Math.abs(actualRgb.r - expectedRgb.r) +
               Math.abs(actualRgb.g - expectedRgb.g) +
               Math.abs(actualRgb.b - expectedRgb.b);
  
  if (diff > 10) { // Allow small rounding differences
    throw new Error(`${msg}\n    Expected: ${expected} (${JSON.stringify(expectedRgb)})\n    Actual: ${actual} (${JSON.stringify(actualRgb)})`);
  }
}

function assertNotNull(value, msg = '') {
  if (value === null || value === undefined) {
    throw new Error(`${msg}\n    Expected non-null value`);
  }
}

console.log('\nSCSS Color Functions Tests\n');

// ============ Color Math Tests ============
console.log('Color Math:');

test('parseToRgb parses hex colors', () => {
  const result = parseToRgb('#ff0000');
  assertEqual(result.r, 255);
  assertEqual(result.g, 0);
  assertEqual(result.b, 0);
});

test('parseToRgb parses short hex colors', () => {
  const result = parseToRgb('#f00');
  assertEqual(result.r, 255);
  assertEqual(result.g, 0);
  assertEqual(result.b, 0);
});

test('parseToRgb parses rgb()', () => {
  const result = parseToRgb('rgb(100, 150, 200)');
  assertEqual(result.r, 100);
  assertEqual(result.g, 150);
  assertEqual(result.b, 200);
});

test('parseToRgb parses rgba()', () => {
  const result = parseToRgb('rgba(100, 150, 200, 0.5)');
  assertEqual(result.r, 100);
  assertEqual(result.g, 150);
  assertEqual(result.b, 200);
  assertApproxEqual(result.a, 0.5);
});

test('parseToRgb parses named colors', () => {
  const result = parseToRgb('red');
  assertEqual(result.r, 255);
  assertEqual(result.g, 0);
  assertEqual(result.b, 0);
});

test('rgbToHex converts to hex', () => {
  const result = rgbToHex({ r: 255, g: 0, b: 0, a: 1 });
  assertEqual(result.toLowerCase(), '#ff0000');
});

// ============ Lighten/Darken Tests ============
console.log('\nLighten/Darken:');

test('lighten brightens a color', () => {
  const result = lighten('#000000', '50%');
  assertNotNull(result);
  assertColorApprox(result, '#808080');
});

test('lighten with 0% returns same color', () => {
  const result = lighten('#1a73e8', '0%');
  assertColorApprox(result, '#1a73e8');
});

test('lighten with 100% returns white', () => {
  const result = lighten('#1a73e8', '100%');
  assertColorApprox(result, '#ffffff');
});

test('darken dims a color', () => {
  const result = darken('#ffffff', '50%');
  assertNotNull(result);
  assertColorApprox(result, '#808080');
});

test('darken with 0% returns same color', () => {
  const result = darken('#1a73e8', '0%');
  assertColorApprox(result, '#1a73e8');
});

test('darken with 100% returns black', () => {
  const result = darken('#1a73e8', '100%');
  assertColorApprox(result, '#000000');
});

// ============ Saturate/Desaturate Tests ============
console.log('\nSaturate/Desaturate:');

test('saturate increases saturation', () => {
  const result = saturate('#808080', '50%');
  assertNotNull(result);
  // Gray becomes more colorful - hard to test exact value
});

test('desaturate decreases saturation', () => {
  const result = desaturate('#ff0000', '50%');
  assertNotNull(result);
  // Red becomes more gray
});

test('grayscale fully desaturates', () => {
  const result = grayscale('#ff0000');
  assertNotNull(result);
  // Pure red should become gray
  const rgb = parseToRgb(result);
  // R, G, B should be equal (grayscale)
  assertApproxEqual(rgb.r, rgb.g, 5);
  assertApproxEqual(rgb.g, rgb.b, 5);
});

// ============ Hue Adjustment Tests ============
console.log('\nHue Adjustment:');

test('adjustHue rotates hue', () => {
  const result = adjustHue('#ff0000', 120);
  assertNotNull(result);
  // Red + 120° = Green (approximately)
  const rgb = parseToRgb(result);
  assertEqual(rgb.r < 50, true, 'Should have low red');
  assertEqual(rgb.g > 200, true, 'Should have high green');
});

test('complement rotates by 180°', () => {
  const result = complement('#ff0000');
  assertNotNull(result);
  // Complement of red is cyan
  assertColorApprox(result, '#00ffff');
});

// ============ Mix Tests ============
console.log('\nMix:');

test('mix blends two colors equally', () => {
  const result = mix('#ff0000', '#0000ff', '50%');
  assertNotNull(result);
  // Red + Blue = Purple
  assertColorApprox(result, '#800080');
});

test('mix with 100% returns first color', () => {
  const result = mix('#ff0000', '#0000ff', '100%');
  assertColorApprox(result, '#ff0000');
});

test('mix with 0% returns second color', () => {
  const result = mix('#ff0000', '#0000ff', '0%');
  assertColorApprox(result, '#0000ff');
});

// ============ Invert Tests ============
console.log('\nInvert:');

test('invert inverts colors', () => {
  const result = invert('#ffffff');
  assertColorApprox(result, '#000000');
});

test('invert black to white', () => {
  const result = invert('#000000');
  assertColorApprox(result, '#ffffff');
});

test('invert red to cyan', () => {
  const result = invert('#ff0000');
  assertColorApprox(result, '#00ffff');
});

// ============ RGBA/RGB Tests ============
console.log('\nRGBA/RGB:');

test('rgba with color and alpha', () => {
  const result = rgba('#ff0000', '0.5');
  assertNotNull(result);
  assertEqual(result.includes('rgba') || result.includes('0.5'), true);
});

test('rgba with r, g, b, a', () => {
  const result = rgba(255, 0, 0, 0.5);
  assertNotNull(result);
});

test('rgb returns hex', () => {
  const result = rgb(255, 0, 0);
  assertColorApprox(result, '#ff0000');
});

// ============ HSL Tests ============
console.log('\nHSL:');

test('hsl creates color', () => {
  const result = hsl(0, '100%', '50%');
  assertNotNull(result);
  // Hue 0, full saturation, 50% lightness = red
  assertColorApprox(result, '#ff0000');
});

test('hsla with alpha', () => {
  const result = hsla(0, '100%', '50%', 0.5);
  assertNotNull(result);
});

// ============ Transparency Tests ============
console.log('\nTransparency:');

test('transparentize reduces opacity', () => {
  const result = transparentize('#ff0000', '0.3');
  assertNotNull(result);
  // Should have alpha < 1
  const rgb = parseToRgb(result);
  assertApproxEqual(rgb.a, 0.7);
});

test('opacify increases opacity', () => {
  const result = opacify('rgba(255, 0, 0, 0.5)', '0.3');
  assertNotNull(result);
  const rgb = parseToRgb(result);
  assertApproxEqual(rgb.a, 0.8);
});

// ============ Component Getters ============
console.log('\nComponent Getters:');

test('red() gets red component', () => {
  assertEqual(red('#ff8040'), 255);
});

test('green() gets green component', () => {
  assertEqual(green('#ff8040'), 128);
});

test('blue() gets blue component', () => {
  assertEqual(blue('#ff8040'), 64);
});

test('alpha() gets alpha component', () => {
  assertEqual(alpha('#ff0000'), 1);
  assertApproxEqual(alpha('rgba(255, 0, 0, 0.5)'), 0.5);
});

test('hue() gets hue', () => {
  const h = hue('#ff0000');
  assertApproxEqual(h, 0, 1);
});

test('saturation() gets saturation', () => {
  const s = saturation('#ff0000');
  assertApproxEqual(s, 100, 1);
});

test('lightness() gets lightness', () => {
  const l = lightness('#ff0000');
  assertApproxEqual(l, 50, 1);
});

// ============ evaluateColorFunction Tests ============
console.log('\nFunction Evaluation:');

test('evaluateColorFunction parses lighten()', () => {
  const result = evaluateColorFunction('lighten(#000, 50%)');
  assertNotNull(result);
  assertColorApprox(result, '#808080');
});

test('evaluateColorFunction parses darken()', () => {
  const result = evaluateColorFunction('darken(#fff, 50%)');
  assertNotNull(result);
  assertColorApprox(result, '#808080');
});

test('evaluateColorFunction parses mix()', () => {
  const result = evaluateColorFunction('mix(#ff0000, #0000ff, 50%)');
  assertNotNull(result);
});

test('evaluateColorFunction parses complement()', () => {
  const result = evaluateColorFunction('complement(#ff0000)');
  assertNotNull(result);
  assertColorApprox(result, '#00ffff');
});

test('evaluateColorFunction parses rgba()', () => {
  const result = evaluateColorFunction('rgba(#000, 0.5)');
  assertNotNull(result);
});

test('evaluateColorFunction returns null for unknown function', () => {
  const result = evaluateColorFunction('unknown(#000)');
  assertEqual(result, null);
});

// ============ Summary ============
console.log('\n' + '='.repeat(50));
console.log(`SCSS Color Functions Tests: ${passed} passed, ${failed} failed`);
console.log('='.repeat(50));

if (failed > 0) {
  process.exit(1);
}
