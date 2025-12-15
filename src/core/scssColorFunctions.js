'use strict';

/**
 * SCSS Color Functions
 * 
 * Implements SCSS/Sass color manipulation functions for static analysis.
 * These are pure color math functions that can be resolved without a compiler.
 * 
 * Supported functions:
 * - lighten($color, $amount)
 * - darken($color, $amount)
 * - saturate($color, $amount)
 * - desaturate($color, $amount)
 * - adjust-hue($color, $degrees)
 * - complement($color)
 * - invert($color)
 * - mix($color1, $color2, $weight)
 * - rgba($color, $alpha) / rgba($r, $g, $b, $a)
 * - rgb($r, $g, $b)
 * - hsl($h, $s, $l)
 * - hsla($h, $s, $l, $a)
 * - transparentize($color, $amount) / fade-out($color, $amount)
 * - opacify($color, $amount) / fade-in($color, $amount)
 * - grayscale($color)
 * - adjust-color($color, ...)
 * - scale-color($color, ...)
 * - change-color($color, ...)
 * - red($color), green($color), blue($color)
 * - hue($color), saturation($color), lightness($color)
 * - alpha($color) / opacity($color)
 */

const { 
  parseToRgb, 
  rgbToHsl, 
  hslToRgb, 
  rgbToHex, 
  rgbToHslObj,
  hslToRgbObj,
  clamp, 
  parseAmount 
} = require('./colorMath');

/**
 * Lighten a color by a percentage
 * @param {string} color - Color value
 * @param {string|number} amount - Percentage to lighten (0-100)
 * @returns {string|null} - Resulting hex color
 */
function lighten(color, amount) {
  const rgb = parseToRgb(color);
  if (!rgb) return null;
  
  const hsl = rgbToHslObj(rgb);
  const amountVal = parseAmount(amount);
  
  hsl.l = clamp(hsl.l + amountVal, 0, 1);
  
  const result = hslToRgbObj(hsl);
  return rgbToHex(result);
}

/**
 * Darken a color by a percentage
 * @param {string} color - Color value
 * @param {string|number} amount - Percentage to darken (0-100)
 * @returns {string|null} - Resulting hex color
 */
function darken(color, amount) {
  const rgb = parseToRgb(color);
  if (!rgb) return null;
  
  const hsl = rgbToHslObj(rgb);
  const amountVal = parseAmount(amount);
  
  hsl.l = clamp(hsl.l - amountVal, 0, 1);
  
  const result = hslToRgbObj(hsl);
  return rgbToHex(result);
}

/**
 * Increase saturation of a color
 * @param {string} color - Color value
 * @param {string|number} amount - Percentage to increase (0-100)
 * @returns {string|null} - Resulting hex color
 */
function saturate(color, amount) {
  const rgb = parseToRgb(color);
  if (!rgb) return null;
  
  const hsl = rgbToHslObj(rgb);
  const amountVal = parseAmount(amount);
  
  hsl.s = clamp(hsl.s + amountVal, 0, 1);
  
  const result = hslToRgbObj(hsl);
  return rgbToHex(result);
}

/**
 * Decrease saturation of a color
 * @param {string} color - Color value
 * @param {string|number} amount - Percentage to decrease (0-100)
 * @returns {string|null} - Resulting hex color
 */
function desaturate(color, amount) {
  const rgb = parseToRgb(color);
  if (!rgb) return null;
  
  const hsl = rgbToHslObj(rgb);
  const amountVal = parseAmount(amount);
  
  hsl.s = clamp(hsl.s - amountVal, 0, 1);
  
  const result = hslToRgbObj(hsl);
  return rgbToHex(result);
}

/**
 * Adjust hue of a color
 * @param {string} color - Color value
 * @param {string|number} degrees - Degrees to rotate (-360 to 360)
 * @returns {string|null} - Resulting hex color
 */
function adjustHue(color, degrees) {
  const rgb = parseToRgb(color);
  if (!rgb) return null;
  
  const hsl = rgbToHslObj(rgb);
  const deg = parseFloat(degrees) || 0;
  
  hsl.h = ((hsl.h + deg) % 360 + 360) % 360;
  
  const result = hslToRgbObj(hsl);
  return rgbToHex(result);
}

/**
 * Get the complement of a color (rotate hue by 180°)
 * @param {string} color - Color value
 * @returns {string|null} - Resulting hex color
 */
function complement(color) {
  return adjustHue(color, 180);
}

/**
 * Invert a color
 * @param {string} color - Color value
 * @param {string|number} weight - Optional weight (default 100%)
 * @returns {string|null} - Resulting hex color
 */
function invert(color, weight = '100%') {
  const rgb = parseToRgb(color);
  if (!rgb) return null;
  
  const w = parseAmount(weight);
  
  const inverted = {
    r: Math.round(255 - rgb.r),
    g: Math.round(255 - rgb.g),
    b: Math.round(255 - rgb.b),
    a: rgb.a
  };
  
  // Apply weight (mix with original)
  if (w < 1) {
    inverted.r = Math.round(inverted.r * w + rgb.r * (1 - w));
    inverted.g = Math.round(inverted.g * w + rgb.g * (1 - w));
    inverted.b = Math.round(inverted.b * w + rgb.b * (1 - w));
  }
  
  return rgbToHex(inverted);
}

/**
 * Mix two colors together
 * @param {string} color1 - First color
 * @param {string} color2 - Second color
 * @param {string|number} weight - Weight of first color (default 50%)
 * @returns {string|null} - Resulting hex color
 */
function mix(color1, color2, weight = '50%') {
  const rgb1 = parseToRgb(color1);
  const rgb2 = parseToRgb(color2);
  if (!rgb1 || !rgb2) return null;
  
  const w = parseAmount(weight);
  
  // Sass mix algorithm accounts for alpha
  const w1 = w;
  const w2 = 1 - w;
  
  const a = rgb1.a * w1 + rgb2.a * w2;
  
  const result = {
    r: Math.round(rgb1.r * w1 + rgb2.r * w2),
    g: Math.round(rgb1.g * w1 + rgb2.g * w2),
    b: Math.round(rgb1.b * w1 + rgb2.b * w2),
    a: a
  };
  
  return rgbToHex(result);
}

/**
 * Make a color more transparent
 * @param {string} color - Color value
 * @param {string|number} amount - Amount to decrease opacity (0-1)
 * @returns {string|null} - Resulting rgba color
 */
function transparentize(color, amount) {
  const rgb = parseToRgb(color);
  if (!rgb) return null;
  
  const amountVal = parseAmount(amount, false);
  rgb.a = clamp(rgb.a - amountVal, 0, 1);
  
  return rgbToHex(rgb);
}

/**
 * Alias for transparentize
 */
const fadeOut = transparentize;

/**
 * Make a color more opaque
 * @param {string} color - Color value
 * @param {string|number} amount - Amount to increase opacity (0-1)
 * @returns {string|null} - Resulting color
 */
function opacify(color, amount) {
  const rgb = parseToRgb(color);
  if (!rgb) return null;
  
  const amountVal = parseAmount(amount, false);
  rgb.a = clamp(rgb.a + amountVal, 0, 1);
  
  return rgbToHex(rgb);
}

/**
 * Alias for opacify
 */
const fadeIn = opacify;

/**
 * Convert a color to grayscale
 * @param {string} color - Color value
 * @returns {string|null} - Resulting grayscale hex color
 */
function grayscale(color) {
  return desaturate(color, '100%');
}

/**
 * SCSS rgba() function - can take (color, alpha) or (r, g, b, a)
 * @param  {...any} args - Arguments
 * @returns {string|null} - Resulting rgba color
 */
function rgba(...args) {
  if (args.length === 2) {
    // rgba($color, $alpha)
    const [color, alpha] = args;
    const rgb = parseToRgb(color);
    if (!rgb) return null;
    
    let a = parseFloat(alpha);
    if (typeof alpha === 'string' && alpha.endsWith('%')) {
      a = parseFloat(alpha) / 100;
    }
    rgb.a = clamp(a, 0, 1);
    
    return rgbToHex(rgb);
  } else if (args.length >= 3) {
    // rgba(r, g, b) or rgba(r, g, b, a)
    const [r, g, b, a = 1] = args;
    return rgbToHex({
      r: clamp(parseInt(r, 10), 0, 255),
      g: clamp(parseInt(g, 10), 0, 255),
      b: clamp(parseInt(b, 10), 0, 255),
      a: clamp(parseFloat(a), 0, 1)
    });
  }
  return null;
}

/**
 * SCSS rgb() function
 * @param {number} r - Red
 * @param {number} g - Green
 * @param {number} b - Blue
 * @returns {string|null} - Resulting hex color
 */
function rgb(r, g, b) {
  return rgbToHex({
    r: clamp(parseInt(r, 10), 0, 255),
    g: clamp(parseInt(g, 10), 0, 255),
    b: clamp(parseInt(b, 10), 0, 255),
    a: 1
  });
}

/**
 * SCSS hsl() function
 * @param {number} h - Hue (0-360)
 * @param {number|string} s - Saturation (0-100 or "50%")
 * @param {number|string} l - Lightness (0-100 or "50%")
 * @returns {string|null} - Resulting hex color
 */
function hsl(h, s, l) {
  const hue = parseFloat(h) || 0;
  const sat = parseAmount(s);
  const light = parseAmount(l);
  
  const rgbResult = hslToRgb(hue, sat, light);
  return rgbToHex({ ...rgbResult, a: 1 });
}

/**
 * SCSS hsla() function
 * @param {number} h - Hue (0-360)
 * @param {number|string} s - Saturation
 * @param {number|string} l - Lightness
 * @param {number} a - Alpha
 * @returns {string|null} - Resulting color
 */
function hsla(h, s, l, a) {
  const hue = parseFloat(h) || 0;
  const sat = parseAmount(s);
  const light = parseAmount(l);
  const alpha = clamp(parseFloat(a), 0, 1);
  
  const rgbResult = hslToRgb(hue, sat, light);
  return rgbToHex({ ...rgbResult, a: alpha });
}

/**
 * Get red component of a color
 * @param {string} color - Color value
 * @returns {number|null} - Red value (0-255)
 */
function red(color) {
  const rgb = parseToRgb(color);
  return rgb ? rgb.r : null;
}

/**
 * Get green component of a color
 * @param {string} color - Color value
 * @returns {number|null} - Green value (0-255)
 */
function green(color) {
  const rgb = parseToRgb(color);
  return rgb ? rgb.g : null;
}

/**
 * Get blue component of a color
 * @param {string} color - Color value
 * @returns {number|null} - Blue value (0-255)
 */
function blue(color) {
  const rgb = parseToRgb(color);
  return rgb ? rgb.b : null;
}

/**
 * Get hue of a color
 * @param {string} color - Color value
 * @returns {number|null} - Hue (0-360)
 */
function hue(color) {
  const rgb = parseToRgb(color);
  if (!rgb) return null;
  const hslVal = rgbToHslObj(rgb);
  return hslVal.h;
}

/**
 * Get saturation of a color
 * @param {string} color - Color value
 * @returns {number|null} - Saturation (0-100)
 */
function saturation(color) {
  const rgb = parseToRgb(color);
  if (!rgb) return null;
  const hslVal = rgbToHslObj(rgb);
  return hslVal.s * 100;
}

/**
 * Get lightness of a color
 * @param {string} color - Color value
 * @returns {number|null} - Lightness (0-100)
 */
function lightness(color) {
  const rgb = parseToRgb(color);
  if (!rgb) return null;
  const hslVal = rgbToHslObj(rgb);
  return hslVal.l * 100;
}

/**
 * Get alpha/opacity of a color
 * @param {string} color - Color value
 * @returns {number|null} - Alpha (0-1)
 */
function alpha(color) {
  const rgb = parseToRgb(color);
  return rgb ? rgb.a : null;
}

/**
 * Alias for alpha
 */
const opacity = alpha;

/**
 * SCSS adjust-color() function
 * Adjusts one or more properties of a color
 * @param {string} color - Base color
 * @param {object} adjustments - { red, green, blue, hue, saturation, lightness, alpha }
 * @returns {string|null} - Resulting color
 */
function adjustColor(color, adjustments = {}) {
  const rgb = parseToRgb(color);
  if (!rgb) return null;
  
  // RGB adjustments
  if ('red' in adjustments || 'green' in adjustments || 'blue' in adjustments) {
    rgb.r = clamp(rgb.r + (parseInt(adjustments.red, 10) || 0), 0, 255);
    rgb.g = clamp(rgb.g + (parseInt(adjustments.green, 10) || 0), 0, 255);
    rgb.b = clamp(rgb.b + (parseInt(adjustments.blue, 10) || 0), 0, 255);
  }
  
  // HSL adjustments
  if ('hue' in adjustments || 'saturation' in adjustments || 'lightness' in adjustments) {
    const hsl = rgbToHslObj(rgb);
    if ('hue' in adjustments) {
      hsl.h = (hsl.h + (parseFloat(adjustments.hue) || 0)) % 360;
    }
    if ('saturation' in adjustments) {
      const satAdj = parseAmount(adjustments.saturation);
      hsl.s = clamp(hsl.s + satAdj, 0, 1);
    }
    if ('lightness' in adjustments) {
      const lightAdj = parseAmount(adjustments.lightness);
      hsl.l = clamp(hsl.l + lightAdj, 0, 1);
    }
    const newRgb = hslToRgbObj(hsl);
    rgb.r = newRgb.r;
    rgb.g = newRgb.g;
    rgb.b = newRgb.b;
  }
  
  // Alpha adjustment
  if ('alpha' in adjustments) {
    rgb.a = clamp(rgb.a + (parseFloat(adjustments.alpha) || 0), 0, 1);
  }
  
  return rgbToHex(rgb);
}

/**
 * SCSS scale-color() function
 * Scales one or more properties of a color
 * @param {string} color - Base color
 * @param {object} scales - { red, green, blue, saturation, lightness, alpha }
 * @returns {string|null} - Resulting color
 */
function scaleColor(color, scales = {}) {
  const rgb = parseToRgb(color);
  if (!rgb) return null;
  
  const scaleValue = (current, max, scale) => {
    const pct = parseAmount(scale);
    if (pct > 0) {
      return current + (max - current) * pct;
    } else {
      return current + current * pct;
    }
  };
  
  // RGB scaling
  if ('red' in scales) {
    rgb.r = clamp(Math.round(scaleValue(rgb.r, 255, scales.red)), 0, 255);
  }
  if ('green' in scales) {
    rgb.g = clamp(Math.round(scaleValue(rgb.g, 255, scales.green)), 0, 255);
  }
  if ('blue' in scales) {
    rgb.b = clamp(Math.round(scaleValue(rgb.b, 255, scales.blue)), 0, 255);
  }
  
  // HSL scaling
  if ('saturation' in scales || 'lightness' in scales) {
    const hsl = rgbToHslObj(rgb);
    if ('saturation' in scales) {
      hsl.s = clamp(scaleValue(hsl.s, 1, scales.saturation), 0, 1);
    }
    if ('lightness' in scales) {
      hsl.l = clamp(scaleValue(hsl.l, 1, scales.lightness), 0, 1);
    }
    const newRgb = hslToRgbObj(hsl);
    rgb.r = newRgb.r;
    rgb.g = newRgb.g;
    rgb.b = newRgb.b;
  }
  
  // Alpha scaling
  if ('alpha' in scales) {
    rgb.a = clamp(scaleValue(rgb.a, 1, scales.alpha), 0, 1);
  }
  
  return rgbToHex(rgb);
}

/**
 * SCSS change-color() function
 * Sets one or more properties of a color
 * @param {string} color - Base color
 * @param {object} changes - { red, green, blue, hue, saturation, lightness, alpha }
 * @returns {string|null} - Resulting color
 */
function changeColor(color, changes = {}) {
  const rgb = parseToRgb(color);
  if (!rgb) return null;
  
  // RGB changes
  if ('red' in changes) {
    rgb.r = clamp(parseInt(changes.red, 10), 0, 255);
  }
  if ('green' in changes) {
    rgb.g = clamp(parseInt(changes.green, 10), 0, 255);
  }
  if ('blue' in changes) {
    rgb.b = clamp(parseInt(changes.blue, 10), 0, 255);
  }
  
  // HSL changes
  if ('hue' in changes || 'saturation' in changes || 'lightness' in changes) {
    const hsl = rgbToHslObj(rgb);
    if ('hue' in changes) {
      hsl.h = parseFloat(changes.hue) || 0;
    }
    if ('saturation' in changes) {
      hsl.s = parseAmount(changes.saturation);
    }
    if ('lightness' in changes) {
      hsl.l = parseAmount(changes.lightness);
    }
    const newRgb = hslToRgbObj(hsl);
    rgb.r = newRgb.r;
    rgb.g = newRgb.g;
    rgb.b = newRgb.b;
  }
  
  // Alpha change
  if ('alpha' in changes) {
    rgb.a = clamp(parseFloat(changes.alpha), 0, 1);
  }
  
  return rgbToHex(rgb);
}

/**
 * Parse a SCSS color function call and evaluate it
 * @param {string} expression - Function call like "lighten(#fff, 10%)"
 * @param {object} variableMap - Map of variable names to values (for resolving $variables)
 * @returns {string|null} - Resolved color value or null if cannot resolve
 */
function evaluateColorFunction(expression, variableMap = {}) {
  if (!expression || typeof expression !== 'string') return null;
  
  expression = expression.trim();
  
  // Match function call: name(args)
  const funcMatch = expression.match(/^([a-z-]+)\s*\(([\s\S]*)\)$/i);
  if (!funcMatch) return null;
  
  const funcName = funcMatch[1].toLowerCase().replace(/-/g, '');
  const argsString = funcMatch[2];
  
  // Parse arguments (handling nested parentheses)
  const args = parseArgs(argsString, variableMap);
  
  // Dispatch to appropriate function
  switch (funcName) {
    case 'lighten':
      return lighten(args[0], args[1]);
    case 'darken':
      return darken(args[0], args[1]);
    case 'saturate':
      return saturate(args[0], args[1]);
    case 'desaturate':
      return desaturate(args[0], args[1]);
    case 'adjusthue':
    case 'adjust-hue':
      return adjustHue(args[0], args[1]);
    case 'complement':
      return complement(args[0]);
    case 'invert':
      return invert(args[0], args[1]);
    case 'mix':
      return mix(args[0], args[1], args[2]);
    case 'rgba':
      return rgba(...args);
    case 'rgb':
      return rgb(args[0], args[1], args[2]);
    case 'hsl':
      return hsl(args[0], args[1], args[2]);
    case 'hsla':
      return hsla(args[0], args[1], args[2], args[3]);
    case 'transparentize':
    case 'fadeout':
    case 'fade-out':
      return transparentize(args[0], args[1]);
    case 'opacify':
    case 'fadein':
    case 'fade-in':
      return opacify(args[0], args[1]);
    case 'grayscale':
    case 'greyscale':
      return grayscale(args[0]);
    case 'red':
      return red(args[0])?.toString();
    case 'green':
      return green(args[0])?.toString();
    case 'blue':
      return blue(args[0])?.toString();
    case 'hue':
      return hue(args[0])?.toString();
    case 'saturation':
      return saturation(args[0])?.toString();
    case 'lightness':
      return lightness(args[0])?.toString();
    case 'alpha':
    case 'opacity':
      return alpha(args[0])?.toString();
    default:
      return null;
  }
}

/**
 * Parse function arguments, handling nested calls and variables
 * @param {string} argsString - Arguments string
 * @param {object} variableMap - Variable mappings
 * @returns {string[]} - Parsed arguments
 */
function parseArgs(argsString, variableMap = {}) {
  const args = [];
  let current = '';
  let depth = 0;
  
  for (let i = 0; i < argsString.length; i++) {
    const char = argsString[i];
    
    if (char === '(') {
      depth++;
      current += char;
    } else if (char === ')') {
      depth--;
      current += char;
    } else if (char === ',' && depth === 0) {
      args.push(resolveArg(current.trim(), variableMap));
      current = '';
    } else {
      current += char;
    }
  }
  
  if (current.trim()) {
    args.push(resolveArg(current.trim(), variableMap));
  }
  
  return args;
}

/**
 * Resolve a single argument (could be variable, nested function, or value)
 * @param {string} arg - Argument to resolve
 * @param {object} variableMap - Variable mappings
 * @returns {string} - Resolved value
 */
function resolveArg(arg, variableMap) {
  if (!arg) return arg;
  
  // SCSS variable
  if (arg.startsWith('$')) {
    const resolved = variableMap[arg];
    if (resolved) {
      // Recursively resolve if result is also a variable or function
      return resolveArg(resolved, variableMap);
    }
    return arg; // Keep as-is if not found
  }
  
  // Nested function call
  if (/^[a-z-]+\s*\(/i.test(arg)) {
    const result = evaluateColorFunction(arg, variableMap);
    return result || arg;
  }
  
  return arg;
}

module.exports = {
  // Main functions
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
  fadeOut,
  opacify,
  fadeIn,
  grayscale,
  adjustColor,
  scaleColor,
  changeColor,
  
  // Color component getters
  red,
  green,
  blue,
  hue,
  saturation,
  lightness,
  alpha,
  opacity,
  
  // Main resolver
  evaluateColorFunction,
  parseArgs
};
