'use strict';

/**
 * SCSS Parser
 * 
 * Parses SCSS/CSS files to extract variable definitions.
 * Handles:
 * - SCSS variables: $name: value;
 * - CSS custom properties: --name: value;
 * - Variable references: $name: $other-name;
 * - Color functions: $name: lighten($base, 10%);
 * - SCSS maps (basic): $map: (key: value, ...);
 */

const fs = require('fs');
const path = require('path');

/**
 * Parse a single SCSS/CSS file for variable definitions
 * @param {string} content - File content
 * @returns {object} - { scssVars: Map, cssVars: Map, maps: Map }
 */
function parseVariables(content) {
  const scssVars = new Map();
  const cssVars = new Map();
  const maps = new Map();
  
  if (!content || typeof content !== 'string') {
    return { scssVars, cssVars, maps };
  }
  
  // Remove comments to avoid false matches
  content = removeComments(content);
  
  // Parse SCSS variables: $name: value;
  parseScssVariables(content, scssVars, maps);
  
  // Parse CSS custom properties: --name: value;
  parseCssCustomProperties(content, cssVars);
  
  return { scssVars, cssVars, maps };
}

/**
 * Remove SCSS/CSS comments from content
 * @param {string} content - File content
 * @returns {string} - Content without comments
 */
function removeComments(content) {
  // Remove single-line comments (// ...)
  content = content.replace(/\/\/[^\n]*/g, '');
  
  // Remove multi-line comments (/* ... */)
  content = content.replace(/\/\*[\s\S]*?\*\//g, '');
  
  return content;
}

/**
 * Parse SCSS variable definitions
 * @param {string} content - File content
 * @param {Map} scssVars - Map to store variables
 * @param {Map} maps - Map to store SCSS maps
 */
function parseScssVariables(content, scssVars, maps) {
  let match;

  // First, match !default variables (more specific pattern)
  const defaultPattern = /(?:^|[\n;{}])\s*(\$[\w-]+)\s*:\s*([^;]+?)\s*!default\s*;/g;
  
  while ((match = defaultPattern.exec(content)) !== null) {
    const varName = match[1].trim();
    const value = match[2].trim();
    
    // Only set if not already defined (respects !default behavior)
    if (!scssVars.has(varName) && !maps.has(varName)) {
      if (isMapDefinition(value)) {
        const mapEntries = parseMapDefinition(value);
        if (mapEntries.size > 0) {
          maps.set(varName, mapEntries);
        }
      } else {
        scssVars.set(varName, value);
      }
    }
  }

  // Then match regular $variable: value; (but not inside selectors)
  // Look for patterns at start of line or after semicolon/brace
  // Exclude !default by matching non-!default endings
  const varPattern = /(?:^|[\n;{}])\s*(\$[\w-]+)\s*:\s*([^;!]+(?:![^d][^;]*)?);/g;
  
  while ((match = varPattern.exec(content)) !== null) {
    const varName = match[1].trim();
    let value = match[2].trim();
    
    // Skip if this is a !default variable (already parsed)
    if (value.includes('!default')) continue;
    
    // Check if it's a map definition
    if (isMapDefinition(value)) {
      const mapEntries = parseMapDefinition(value);
      if (mapEntries.size > 0) {
        maps.set(varName, mapEntries);
      }
    } else {
      scssVars.set(varName, value);
    }
  }
}

/**
 * Check if a value is a SCSS map definition
 * @param {string} value - Value to check
 * @returns {boolean}
 */
function isMapDefinition(value) {
  const trimmed = value.trim();
  return trimmed.startsWith('(') && trimmed.endsWith(')') && trimmed.includes(':');
}

/**
 * Parse a SCSS map definition
 * @param {string} value - Map definition like "(key1: value1, key2: value2)"
 * @returns {Map} - Map of key-value pairs
 */
function parseMapDefinition(value) {
  const result = new Map();
  
  // Remove outer parentheses
  let inner = value.trim();
  if (inner.startsWith('(')) inner = inner.slice(1);
  if (inner.endsWith(')')) inner = inner.slice(0, -1);
  
  // Split by comma, respecting nested parentheses
  const entries = splitByComma(inner);
  
  for (const entry of entries) {
    const colonIndex = entry.indexOf(':');
    if (colonIndex > 0) {
      const key = entry.slice(0, colonIndex).trim();
      const val = entry.slice(colonIndex + 1).trim();
      result.set(key, val);
    }
  }
  
  return result;
}

/**
 * Split string by comma, respecting nested parentheses
 * @param {string} str - String to split
 * @returns {string[]} - Array of parts
 */
function splitByComma(str) {
  const parts = [];
  let current = '';
  let depth = 0;
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    
    if (char === '(') {
      depth++;
      current += char;
    } else if (char === ')') {
      depth--;
      current += char;
    } else if (char === ',' && depth === 0) {
      if (current.trim()) {
        parts.push(current.trim());
      }
      current = '';
    } else {
      current += char;
    }
  }
  
  if (current.trim()) {
    parts.push(current.trim());
  }
  
  return parts;
}

/**
 * Parse CSS custom property definitions
 * @param {string} content - File content
 * @param {Map} cssVars - Map to store variables
 */
function parseCssCustomProperties(content, cssVars) {
  // Find :root, html, or body blocks with custom properties
  const rootPattern = /(?::root|html|body)\s*\{([^}]+)\}/g;
  
  let match;
  while ((match = rootPattern.exec(content)) !== null) {
    const blockContent = match[1];
    
    // Parse --name: value; within the block
    const propPattern = /(--[\w-]+)\s*:\s*([^;]+);/g;
    
    let propMatch;
    while ((propMatch = propPattern.exec(blockContent)) !== null) {
      const propName = propMatch[1].trim();
      const value = propMatch[2].trim();
      cssVars.set(propName, value);
    }
  }
  
  // Also look for custom properties in any selector (for component-scoped)
  // This is less common but can happen
  const anyPropPattern = /(?:^|[{;\n])\s*(--[\w-]+)\s*:\s*([^;]+);/g;
  
  while ((match = anyPropPattern.exec(content)) !== null) {
    const propName = match[1].trim();
    const value = match[2].trim();
    
    // Only add if not already defined (prefer :root definitions)
    if (!cssVars.has(propName)) {
      cssVars.set(propName, value);
    }
  }
}

/**
 * Parse a file and extract variables
 * @param {string} filePath - Path to SCSS/CSS file
 * @returns {object} - { scssVars: Map, cssVars: Map, maps: Map }
 */
function parseFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return { scssVars: new Map(), cssVars: new Map(), maps: new Map() };
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    return parseVariables(content);
  } catch (e) {
    return { scssVars: new Map(), cssVars: new Map(), maps: new Map() };
  }
}

/**
 * Parse multiple files and merge variables (later files override earlier)
 * @param {string[]} filePaths - Array of file paths
 * @returns {object} - { scssVars: Map, cssVars: Map, maps: Map }
 */
function parseFiles(filePaths) {
  const scssVars = new Map();
  const cssVars = new Map();
  const maps = new Map();
  
  for (const filePath of filePaths) {
    try {
      const parsed = parseFile(filePath);
      
      // Merge (later overrides earlier)
      for (const [k, v] of parsed.scssVars) {
        scssVars.set(k, v);
      }
      for (const [k, v] of parsed.cssVars) {
        cssVars.set(k, v);
      }
      for (const [k, v] of parsed.maps) {
        maps.set(k, v);
      }
    } catch (e) {
      // Skip files that can't be parsed
      continue;
    }
  }
  
  return { scssVars, cssVars, maps };
}

/**
 * Recursively scan a directory for SCSS/CSS files
 * @param {string} dir - Directory to scan
 * @param {string[]} result - Array to collect file paths
 * @param {Set} skipDirs - Directories to skip
 */
function scanDirectory(dir, result = [], skipDirs = new Set(['node_modules', '.git', 'dist', '.angular', 'coverage'])) {
  try {
    if (!fs.existsSync(dir)) return result;
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        if (!skipDirs.has(entry.name)) {
          scanDirectory(fullPath, result, skipDirs);
        }
      } else if (entry.isFile()) {
        if (entry.name.endsWith('.scss') || entry.name.endsWith('.css')) {
          result.push(fullPath);
        }
      }
    }
  } catch (e) {
    // Skip directories that can't be read
  }
  
  return result;
}

/**
 * Build a complete variable map from a project directory
 * Respects import order by processing files in a sensible order:
 * 1. Files starting with _ (partials, usually variables/mixins)
 * 2. Files in deeper directories (more specific)
 * 3. Root files
 * 
 * @param {string} projectDir - Project directory
 * @returns {object} - { scssVars: Map, cssVars: Map, maps: Map }
 */
function buildVariableMap(projectDir) {
  const files = scanDirectory(projectDir);
  
  // Sort files: _ prefix first, then by depth (shallow first)
  files.sort((a, b) => {
    const aBase = path.basename(a);
    const bBase = path.basename(b);
    const aIsPartial = aBase.startsWith('_');
    const bIsPartial = bBase.startsWith('_');
    
    // Partials first
    if (aIsPartial && !bIsPartial) return -1;
    if (!aIsPartial && bIsPartial) return 1;
    
    // Then by depth (shallow first)
    const aDepth = a.split(path.sep).length;
    const bDepth = b.split(path.sep).length;
    
    return aDepth - bDepth;
  });
  
  return parseFiles(files);
}

module.exports = {
  parseVariables,
  parseFile,
  parseFiles,
  buildVariableMap,
  scanDirectory,
  removeComments,
  parseMapDefinition,
  splitByComma
};
