'use strict';

/**
 * CSS Custom Properties Resolver
 * 
 * Resolves CSS var() function calls to their actual values.
 * 
 * Handles:
 * - var(--name)
 * - var(--name, fallback)
 * - Nested var(): var(--a, var(--b, #000))
 */

/**
 * Resolve a var() expression to its value
 * @param {string} expression - Expression like "var(--color)" or "var(--color, #000)"
 * @param {Map} cssVars - Map of CSS custom property names to values
 * @param {number} depth - Recursion depth (to prevent infinite loops)
 * @returns {string|null} - Resolved value or null if cannot resolve
 */
function resolveVar(expression, cssVars, depth = 0) {
  if (!expression || typeof expression !== 'string') return null;
  if (depth > 10) return null; // Prevent infinite recursion
  
  expression = expression.trim();
  
  // Not a var() expression
  if (!expression.startsWith('var(')) {
    return expression;
  }
  
  // Parse var(--name) or var(--name, fallback)
  const match = expression.match(/^var\(\s*(--[\w-]+)\s*(?:,\s*([\s\S]*))?\)$/);
  if (!match) return null;
  
  const varName = match[1];
  const fallback = match[2]?.trim();
  
  // Look up the variable
  let value = cssVars.get(varName);
  
  if (value !== undefined && value !== null) {
    // If the value itself contains var(), resolve recursively
    if (value.includes('var(')) {
      value = resolveAllVars(value, cssVars, depth + 1);
    }
    return value;
  }
  
  // Variable not found, use fallback
  if (fallback !== undefined) {
    // Fallback might also be a var()
    if (fallback.includes('var(')) {
      return resolveAllVars(fallback, cssVars, depth + 1);
    }
    return fallback;
  }
  
  return null;
}

/**
 * Resolve all var() expressions in a string
 * @param {string} value - String potentially containing var() expressions
 * @param {Map} cssVars - Map of CSS custom property names to values
 * @param {number} depth - Recursion depth
 * @returns {string} - String with all var() resolved (or original if cannot resolve)
 */
function resolveAllVars(value, cssVars, depth = 0) {
  if (!value || typeof value !== 'string') return value;
  if (depth > 10) return value;
  if (!value.includes('var(')) return value;
  
  // Find and replace all var() expressions
  // Need to handle nested parentheses correctly
  let result = value;
  let changed = true;
  let iterations = 0;
  
  while (changed && iterations < 20) {
    changed = false;
    iterations++;
    
    // Find the innermost var() first (to handle nesting)
    const varMatch = result.match(/var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*(?:\([^)]*\)[^)]*)*))?\)/);
    
    if (varMatch) {
      const fullMatch = varMatch[0];
      const varName = varMatch[1];
      const fallback = varMatch[2]?.trim();
      
      let resolved = cssVars.get(varName);
      
      if (resolved !== undefined && resolved !== null) {
        result = result.replace(fullMatch, resolved);
        changed = true;
      } else if (fallback !== undefined) {
        result = result.replace(fullMatch, fallback);
        changed = true;
      } else {
        // Cannot resolve - leave as is or return null?
        // For partial resolution, replace with empty string to avoid infinite loop
        break;
      }
    }
  }
  
  return result;
}

/**
 * Check if a value contains var() expressions
 * @param {string} value - Value to check
 * @returns {boolean}
 */
function hasVar(value) {
  return value && typeof value === 'string' && value.includes('var(');
}

/**
 * Extract all var() references from a value
 * @param {string} value - Value to parse
 * @returns {string[]} - Array of variable names (--name)
 */
function extractVarReferences(value) {
  if (!value || typeof value !== 'string') return [];
  
  const refs = [];
  const pattern = /var\(\s*(--[\w-]+)/g;
  
  let match;
  while ((match = pattern.exec(value)) !== null) {
    refs.push(match[1]);
  }
  
  return refs;
}

/**
 * Check if all referenced variables can be resolved
 * @param {string} value - Value containing var() expressions
 * @param {Map} cssVars - Available CSS custom properties
 * @returns {boolean}
 */
function canFullyResolve(value, cssVars) {
  const refs = extractVarReferences(value);
  
  for (const ref of refs) {
    if (!cssVars.has(ref)) {
      // Check if the var() has a fallback
      const pattern = new RegExp(`var\\(\\s*${escapeRegex(ref)}\\s*,`);
      if (!pattern.test(value)) {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Escape special regex characters in a string
 * @param {string} str - String to escape
 * @returns {string}
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  resolveVar,
  resolveAllVars,
  hasVar,
  extractVarReferences,
  canFullyResolve
};
