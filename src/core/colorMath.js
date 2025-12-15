'use strict';

/**
 * Color Math Utilities
 * 
 * Core color conversion functions for SCSS color function resolution.
 * Handles RGB ↔ HSL ↔ HEX conversions needed by lighten(), darken(), etc.
 */

/**
 * Parse a color string into RGB components
 * Supports: #rgb, #rrggbb, rgb(), rgba(), hsl(), hsla(), named colors
 * 
 * @param {string} color - Color string
 * @returns {{ r: number, g: number, b: number, a: number }|null}
 */
function parseToRgb(color) {
  if (!color || typeof color !== 'string') return null;
  
  color = color.trim().toLowerCase();
  
  // Named colors (common ones)
  const namedColors = {
    white: { r: 255, g: 255, b: 255, a: 1 },
    black: { r: 0, g: 0, b: 0, a: 1 },
    red: { r: 255, g: 0, b: 0, a: 1 },
    green: { r: 0, g: 128, b: 0, a: 1 },
    blue: { r: 0, g: 0, b: 255, a: 1 },
    yellow: { r: 255, g: 255, b: 0, a: 1 },
    cyan: { r: 0, g: 255, b: 255, a: 1 },
    magenta: { r: 255, g: 0, b: 255, a: 1 },
    gray: { r: 128, g: 128, b: 128, a: 1 },
    grey: { r: 128, g: 128, b: 128, a: 1 },
    orange: { r: 255, g: 165, b: 0, a: 1 },
    purple: { r: 128, g: 0, b: 128, a: 1 },
    pink: { r: 255, g: 192, b: 203, a: 1 },
    brown: { r: 165, g: 42, b: 42, a: 1 },
    transparent: { r: 0, g: 0, b: 0, a: 0 }
  };
  
  if (namedColors[color]) {
    return { ...namedColors[color] };
  }
  
  // Hex: #rgb or #rrggbb or #rrggbbaa
  const hexMatch = color.match(/^#([0-9a-f]{3,8})$/);
  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: 1
      };
    } else if (hex.length === 4) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: parseInt(hex[3] + hex[3], 16) / 255
      };
    } else if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: 1
      };
    } else if (hex.length === 8) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: parseInt(hex.slice(6, 8), 16) / 255
      };
    }
  }
  
  // rgb(r, g, b) or rgb(r g b)
  const rgbMatch = color.match(/^rgb\(\s*(\d+)\s*[,\s]\s*(\d+)\s*[,\s]\s*(\d+)\s*\)$/);
  if (rgbMatch) {
    return {
      r: clamp(parseInt(rgbMatch[1], 10), 0, 255),
      g: clamp(parseInt(rgbMatch[2], 10), 0, 255),
      b: clamp(parseInt(rgbMatch[3], 10), 0, 255),
      a: 1
    };
  }
  
  // rgba(r, g, b, a)
  const rgbaMatch = color.match(/^rgba\(\s*(\d+)\s*[,\s]\s*(\d+)\s*[,\s]\s*(\d+)\s*[,\/\s]\s*([\d.]+%?)\s*\)$/);
  if (rgbaMatch) {
    let alpha = parseFloat(rgbaMatch[4]);
    if (rgbaMatch[4].endsWith('%')) {
      alpha = alpha / 100;
    }
    return {
      r: clamp(parseInt(rgbaMatch[1], 10), 0, 255),
      g: clamp(parseInt(rgbaMatch[2], 10), 0, 255),
      b: clamp(parseInt(rgbaMatch[3], 10), 0, 255),
      a: clamp(alpha, 0, 1)
    };
  }
  
  // hsl(h, s%, l%)
  const hslMatch = color.match(/^hsl\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)%\s*[,\s]\s*([\d.]+)%\s*\)$/);
  if (hslMatch) {
    const h = parseFloat(hslMatch[1]);
    const s = parseFloat(hslMatch[2]) / 100;
    const l = parseFloat(hslMatch[3]) / 100;
    const rgb = hslToRgb(h, s, l);
    return { ...rgb, a: 1 };
  }
  
  // hsla(h, s%, l%, a)
  const hslaMatch = color.match(/^hsla\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)%\s*[,\s]\s*([\d.]+)%\s*[,\/\s]\s*([\d.]+%?)\s*\)$/);
  if (hslaMatch) {
    const h = parseFloat(hslaMatch[1]);
    const s = parseFloat(hslaMatch[2]) / 100;
    const l = parseFloat(hslaMatch[3]) / 100;
    let alpha = parseFloat(hslaMatch[4]);
    if (hslaMatch[4].endsWith('%')) {
      alpha = alpha / 100;
    }
    const rgb = hslToRgb(h, s, l);
    return { ...rgb, a: clamp(alpha, 0, 1) };
  }
  
  return null;
}

/**
 * Convert RGB to HSL
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {{ h: number, s: number, l: number }} - h: 0-360, s: 0-1, l: 0-1
 */
function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  
  if (max === min) {
    return { h: 0, s: 0, l };
  }
  
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  
  let h;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    case b:
      h = ((r - g) / d + 4) / 6;
      break;
  }
  
  return { h: h * 360, s, l };
}

/**
 * Convert HSL to RGB
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-1)
 * @param {number} l - Lightness (0-1)
 * @returns {{ r: number, g: number, b: number }}
 */
function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360; // Normalize hue to 0-360
  h /= 360;
  
  if (s === 0) {
    const val = Math.round(l * 255);
    return { r: val, g: val, b: val };
  }
  
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  
  return {
    r: Math.round(hue2rgb(p, q, h + 1/3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1/3) * 255)
  };
}

/**
 * Convert RGB to hex string
 * @param {{ r: number, g: number, b: number, a?: number }} rgb
 * @returns {string} - Hex color like #rrggbb or rgba() if alpha < 1
 */
function rgbToHex(rgb) {
  if (!rgb) return null;
  
  const { r, g, b, a = 1 } = rgb;
  
  if (a < 1) {
    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
  }
  
  const toHex = (n) => {
    const hex = clamp(Math.round(n), 0, 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Convert RGB to HSL object
 * @param {{ r: number, g: number, b: number, a?: number }} rgb
 * @returns {{ h: number, s: number, l: number, a: number }}
 */
function rgbToHslObj(rgb) {
  if (!rgb) return null;
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return { ...hsl, a: rgb.a || 1 };
}

/**
 * Convert HSL object to RGB object
 * @param {{ h: number, s: number, l: number, a?: number }} hsl
 * @returns {{ r: number, g: number, b: number, a: number }}
 */
function hslToRgbObj(hsl) {
  if (!hsl) return null;
  const rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
  return { ...rgb, a: hsl.a || 1 };
}

/**
 * Clamp a number between min and max
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Parse a percentage or decimal amount
 * @param {string|number} value - "50%", "0.5", 50
 * @param {boolean} isPercent - Whether to treat numbers as percentages
 * @returns {number} - Value from 0 to 1
 */
function parseAmount(value, isPercent = true) {
  if (typeof value === 'number') {
    return isPercent ? value / 100 : value;
  }
  if (typeof value === 'string') {
    value = value.trim();
    if (value.endsWith('%')) {
      return parseFloat(value) / 100;
    }
    const num = parseFloat(value);
    return isPercent && num > 1 ? num / 100 : num;
  }
  return 0;
}

module.exports = {
  parseToRgb,
  rgbToHsl,
  hslToRgb,
  rgbToHex,
  rgbToHslObj,
  hslToRgbObj,
  clamp,
  parseAmount
};
