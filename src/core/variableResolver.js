'use strict';

/**
 * Variable Resolver - Main Orchestrator
 * 
 * Resolves SCSS/CSS variables and color functions in style content.
 * This is the main entry point used by checks like colorContrast.
 * 
 * Resolution chain:
 * 1. SCSS variables ($name)
 * 2. CSS custom properties (var(--name))
 * 3. SCSS map functions (map-get($map, key))
 * 4. SCSS color functions (lighten(), darken(), etc.)
 * 
 * Example:
 *   Input:  "color: $text-muted;"
 *   Output: "color: #757575;"
 */

const { evaluateColorFunction } = require('./scssColorFunctions');
const { evaluateMapFunction, isMapFunction } = require('./scssMapResolver');
const { resolveAllVars, hasVar } = require('./cssCustomProperties');
const { buildVariableMap, parseVariables } = require('./scssParser');
const { parseToRgb } = require('./colorMath');

/**
 * Variable context for resolution
 * @typedef {Object} VariableContext
 * @property {Map} scssVars - SCSS variable map ($name -> value)
 * @property {Map} cssVars - CSS custom properties map (--name -> value)
 * @property {Map} maps - SCSS maps ($mapName -> Map of key->value)
 */

/**
 * Build a variable context from a project directory or content strings
 * @param {string|string[]} input - Path to project directory OR array of SCSS content strings
 * @returns {VariableContext} - Variable context for resolution
 */
function buildContext(input) {
  let scssVars = new Map();
  let cssVars = new Map();
  let maps = new Map();

  if (Array.isArray(input)) {
    // Input is an array of content strings - parse each one
    for (const content of input) {
      const parsed = parseVariables(content);
      // Merge into our maps (later values override earlier ones)
      for (const [key, value] of parsed.scssVars) {
        scssVars.set(key, value);
      }
      for (const [key, value] of parsed.cssVars) {
        cssVars.set(key, value);
      }
      for (const [key, value] of parsed.maps) {
        maps.set(key, value);
      }
    }
  } else if (typeof input === 'string') {
    // Input is a directory path - scan for files
    const result = buildVariableMap(input);
    scssVars = result.scssVars || new Map();
    cssVars = result.cssVars || new Map();
    maps = result.maps || new Map();
  }

  return { scssVars, cssVars, maps };
}

/**
 * Create an empty context (for when project scanning isn't needed)
 * @returns {VariableContext}
 */
function emptyContext() {
  return {
    scssVars: new Map(),
    cssVars: new Map(),
    maps: new Map()
  };
}

/**
 * Resolve a single value (could be variable, function, or literal)
 * @param {string} value - Value to resolve
 * @param {VariableContext} context - Variable context
 * @param {number} depth - Recursion depth (to prevent infinite loops)
 * @returns {string|null} - Resolved value or null if cannot resolve
 */
function resolveValue(value, context, depth = 0) {
  if (!value || typeof value !== 'string') return value;
  if (depth > 20) return value; // Prevent infinite recursion
  
  value = value.trim();
  
  // Already a literal color? Return as-is
  if (isLiteralColor(value)) {
    return value;
  }
  
  // SCSS variable: $name
  if (value.startsWith('$') && !value.includes('(')) {
    const resolved = context.scssVars.get(value);
    if (resolved) {
      // Recursively resolve (might be another variable or function)
      return resolveValue(resolved, context, depth + 1);
    }
    return null; // Cannot resolve
  }
  
  // CSS custom property: var(--name)
  if (hasVar(value)) {
    const resolved = resolveAllVars(value, context.cssVars);
    if (resolved && resolved !== value && !hasVar(resolved)) {
      // Recursively resolve (result might contain SCSS vars or functions)
      return resolveValue(resolved, context, depth + 1);
    }
    // If still has var(), try to resolve what we can
    if (resolved && !hasVar(resolved)) {
      return resolved;
    }
    return null; // Cannot fully resolve
  }
  
  // SCSS map function: map-get($colors, primary)
  if (isMapFunction(value)) {
    const resolved = evaluateMapFunction(value, context.maps, context.scssVars);
    if (resolved) {
      return resolveValue(resolved, context, depth + 1);
    }
    return null;
  }
  
  // SCSS color function: lighten($color, 10%)
  if (isColorFunction(value)) {
    // First resolve any variables in the function arguments
    const resolvedArgs = resolveVariablesInExpression(value, context, depth);
    if (resolvedArgs) {
      // If resolveVariablesInExpression already evaluated the function, return it
      if (isLiteralColor(resolvedArgs)) {
        return resolvedArgs;
      }
      // Otherwise try to evaluate
      const result = evaluateColorFunction(resolvedArgs, convertToPlainObject(context.scssVars));
      if (result) {
        return result;
      }
    }
    return null;
  }
  
  // If value contains variables, try to resolve inline
  if (containsVariable(value)) {
    return resolveVariablesInExpression(value, context, depth);
  }
  
  return value;
}

/**
 * Resolve all variables and functions in a CSS property value
 * @param {string} value - CSS property value (e.g., "lighten($primary, 10%)")
 * @param {VariableContext} context - Variable context
 * @param {number} depth - Recursion depth
 * @returns {string} - Resolved value (or original if cannot resolve)
 */
function resolveVariablesInExpression(value, context, depth = 0) {
  if (!value || typeof value !== 'string') return value;
  if (depth > 20) return value;
  
  let result = value;
  let changed = true;
  let iterations = 0;
  
  while (changed && iterations < 30) {
    changed = false;
    iterations++;
    
    // Replace SCSS variables: $name
    const varMatch = result.match(/\$[\w-]+/);
    if (varMatch) {
      const varName = varMatch[0];
      const resolved = context.scssVars.get(varName);
      if (resolved) {
        result = result.replace(varName, resolved);
        changed = true;
        continue;
      }
    }
    
    // Replace CSS var(): var(--name) or var(--name, fallback)
    if (hasVar(result)) {
      const newResult = resolveAllVars(result, context.cssVars);
      if (newResult !== result) {
        result = newResult;
        changed = true;
        continue;
      }
    }
    
    // Replace map-get(): map-get($map, key)
    const mapMatch = result.match(/map-get\s*\(\s*\$[\w-]+\s*,\s*[^)]+\)/i);
    if (mapMatch) {
      const resolved = evaluateMapFunction(mapMatch[0], context.maps, context.scssVars);
      if (resolved) {
        result = result.replace(mapMatch[0], resolved);
        changed = true;
        continue;
      }
    }
    
    // Try to evaluate color functions once variables are resolved
    if (isColorFunction(result) && !containsVariable(result)) {
      const evaluated = evaluateColorFunction(result, {});
      if (evaluated) {
        result = evaluated;
        changed = true;
        continue;
      }
    }
  }
  
  return result;
}

/**
 * Resolve a full CSS declaration (property: value)
 * @param {string} declaration - Full declaration like "color: $primary;"
 * @param {VariableContext} context - Variable context
 * @returns {string} - Declaration with resolved values
 */
function resolveDeclaration(declaration, context) {
  if (!declaration || typeof declaration !== 'string') return declaration;
  
  // Parse property: value
  const match = declaration.match(/^([^:]+):\s*(.+?)\s*;?\s*$/);
  if (!match) return declaration;
  
  const property = match[1].trim();
  const value = match[2].trim();
  
  const resolved = resolveValue(value, context);
  
  if (resolved && resolved !== value) {
    return `${property}: ${resolved};`;
  }
  
  return declaration;
}

/**
 * Resolve all variables in a CSS rule block
 * @param {string} content - CSS content (declarations)
 * @param {VariableContext} context - Variable context
 * @returns {string} - Content with resolved variables
 */
function resolveContent(content, context) {
  if (!content || typeof content !== 'string') return content;
  
  // Split by semicolons, resolve each declaration
  const declarations = content.split(';');
  const resolved = declarations.map(decl => {
    const trimmed = decl.trim();
    if (!trimmed) return '';
    
    // Check if it has a colon (is a declaration)
    if (trimmed.includes(':')) {
      const colonIndex = trimmed.indexOf(':');
      const property = trimmed.slice(0, colonIndex).trim();
      const value = trimmed.slice(colonIndex + 1).trim();
      
      const resolvedValue = resolveValue(value, context);
      if (resolvedValue && resolvedValue !== value) {
        return `${property}: ${resolvedValue}`;
      }
    }
    
    return trimmed;
  });
  
  return resolved.filter(Boolean).join('; ');
}

/**
 * Check if a value is a literal color (hex, rgb, hsl, named)
 * @param {string} value - Value to check
 * @returns {boolean}
 */
function isLiteralColor(value) {
  if (!value || typeof value !== 'string') return false;
  value = value.trim().toLowerCase();
  
  // Hex color
  if (/^#[0-9a-f]{3,8}$/i.test(value)) return true;
  
  // rgb/rgba/hsl/hsla
  if (/^(rgb|rgba|hsl|hsla)\s*\(/i.test(value)) {
    // Check if it's actually parseable
    return parseToRgb(value) !== null;
  }
  
  // Named color (common ones)
  const namedColors = [
    'white', 'black', 'red', 'green', 'blue', 'yellow', 'cyan', 'magenta',
    'gray', 'grey', 'orange', 'purple', 'pink', 'brown', 'transparent',
    'inherit', 'initial', 'unset', 'currentcolor'
  ];
  
  return namedColors.includes(value);
}

/**
 * Check if a value contains a SCSS color function call
 * @param {string} value - Value to check
 * @returns {boolean}
 */
function isColorFunction(value) {
  if (!value || typeof value !== 'string') return false;
  
  const colorFunctions = [
    'lighten', 'darken', 'saturate', 'desaturate', 'adjust-hue',
    'complement', 'invert', 'mix', 'grayscale', 'greyscale',
    'fade-out', 'fade-in', 'transparentize', 'opacify',
    'adjust-color', 'scale-color', 'change-color',
    'rgba', 'rgb', 'hsl', 'hsla'
  ];
  
  for (const fn of colorFunctions) {
    if (new RegExp(`^${fn}\\s*\\(`, 'i').test(value.trim())) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if a value contains any variable references
 * @param {string} value - Value to check
 * @returns {boolean}
 */
function containsVariable(value) {
  if (!value || typeof value !== 'string') return false;
  
  // SCSS variable
  if (/\$[\w-]+/.test(value)) return true;
  
  // CSS variable
  if (/var\s*\(/.test(value)) return true;
  
  // Map function
  if (/map-get\s*\(/i.test(value)) return true;
  
  return false;
}

/**
 * Convert a Map to a plain object (for compatibility with existing code)
 * @param {Map} map - Map to convert
 * @returns {Object} - Plain object
 */
function convertToPlainObject(map) {
  if (!(map instanceof Map)) return {};
  
  const obj = {};
  for (const [k, v] of map) {
    obj[k] = v;
  }
  return obj;
}

/**
 * Get statistics about resolution success
 * @param {string[]} values - Array of values to resolve
 * @param {VariableContext} context - Variable context
 * @returns {object} - { total, resolved, unresolved, examples }
 */
function getResolutionStats(values, context) {
  const stats = {
    total: values.length,
    resolved: 0,
    unresolved: 0,
    unresolvedExamples: []
  };
  
  for (const value of values) {
    const resolved = resolveValue(value, context);
    if (resolved && isLiteralColor(resolved)) {
      stats.resolved++;
    } else {
      stats.unresolved++;
      if (stats.unresolvedExamples.length < 5) {
        stats.unresolvedExamples.push(value);
      }
    }
  }
  
  return stats;
}

module.exports = {
  buildContext,
  emptyContext,
  resolveValue,
  resolveVariablesInExpression,
  resolveDeclaration,
  resolveContent,
  isLiteralColor,
  isColorFunction,
  containsVariable,
  getResolutionStats
};
