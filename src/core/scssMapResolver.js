'use strict';

/**
 * SCSS Map Resolver
 * 
 * Resolves SCSS map functions like map-get(), map-keys(), etc.
 * 
 * Supported functions:
 * - map-get($map, $key)
 * - map-has-key($map, $key)
 * - map-keys($map)
 * - map-values($map)
 * - map-merge($map1, $map2)
 */

/**
 * Resolve map-get($map, $key)
 * @param {Map} map - SCSS map (from scssParser)
 * @param {string} key - Key to get
 * @returns {string|null} - Value or null if not found
 */
function mapGet(map, key) {
  if (!map || !(map instanceof Map)) return null;
  return map.get(key) || null;
}

/**
 * Check if map has a key
 * @param {Map} map - SCSS map
 * @param {string} key - Key to check
 * @returns {boolean}
 */
function mapHasKey(map, key) {
  if (!map || !(map instanceof Map)) return false;
  return map.has(key);
}

/**
 * Get all keys from a map
 * @param {Map} map - SCSS map
 * @returns {string[]} - Array of keys
 */
function mapKeys(map) {
  if (!map || !(map instanceof Map)) return [];
  return Array.from(map.keys());
}

/**
 * Get all values from a map
 * @param {Map} map - SCSS map
 * @returns {string[]} - Array of values
 */
function mapValues(map) {
  if (!map || !(map instanceof Map)) return [];
  return Array.from(map.values());
}

/**
 * Merge two maps
 * @param {Map} map1 - First map
 * @param {Map} map2 - Second map (overrides map1)
 * @returns {Map} - Merged map
 */
function mapMerge(map1, map2) {
  const result = new Map();
  
  if (map1 instanceof Map) {
    for (const [k, v] of map1) {
      result.set(k, v);
    }
  }
  
  if (map2 instanceof Map) {
    for (const [k, v] of map2) {
      result.set(k, v);
    }
  }
  
  return result;
}

/**
 * Evaluate a map function call
 * @param {string} expression - Expression like "map-get($colors, primary)"
 * @param {Map} mapsRegistry - Map of map names to their Map objects
 * @param {Map} scssVars - SCSS variables (for resolving $map references)
 * @returns {string|null} - Resolved value or null
 */
function evaluateMapFunction(expression, mapsRegistry, scssVars = new Map()) {
  if (!expression || typeof expression !== 'string') return null;
  
  expression = expression.trim();
  
  // Match map-get($mapName, key)
  const mapGetMatch = expression.match(/^map-get\s*\(\s*(\$[\w-]+)\s*,\s*([^)]+)\s*\)$/i);
  if (mapGetMatch) {
    const mapName = mapGetMatch[1];
    const key = mapGetMatch[2].trim();
    
    const map = mapsRegistry.get(mapName);
    if (map) {
      return mapGet(map, key);
    }
    return null;
  }
  
  // Match map-has-key($mapName, key)
  const mapHasKeyMatch = expression.match(/^map-has-key\s*\(\s*(\$[\w-]+)\s*,\s*([^)]+)\s*\)$/i);
  if (mapHasKeyMatch) {
    const mapName = mapHasKeyMatch[1];
    const key = mapHasKeyMatch[2].trim();
    
    const map = mapsRegistry.get(mapName);
    return mapHasKey(map, key) ? 'true' : 'false';
  }
  
  // Match map-keys($mapName)
  const mapKeysMatch = expression.match(/^map-keys\s*\(\s*(\$[\w-]+)\s*\)$/i);
  if (mapKeysMatch) {
    const mapName = mapKeysMatch[1];
    const map = mapsRegistry.get(mapName);
    const keys = mapKeys(map);
    return keys.length > 0 ? `(${keys.join(', ')})` : null;
  }
  
  // Match map-values($mapName)
  const mapValuesMatch = expression.match(/^map-values\s*\(\s*(\$[\w-]+)\s*\)$/i);
  if (mapValuesMatch) {
    const mapName = mapValuesMatch[1];
    const map = mapsRegistry.get(mapName);
    const values = mapValues(map);
    return values.length > 0 ? `(${values.join(', ')})` : null;
  }
  
  // Match map-merge($map1, $map2)
  const mapMergeMatch = expression.match(/^map-merge\s*\(\s*(\$[\w-]+)\s*,\s*(\$[\w-]+)\s*\)$/i);
  if (mapMergeMatch) {
    const map1Name = mapMergeMatch[1];
    const map2Name = mapMergeMatch[2];
    
    const map1 = mapsRegistry.get(map1Name);
    const map2 = mapsRegistry.get(map2Name);
    
    if (map1 || map2) {
      const merged = mapMerge(map1, map2);
      // Return as string representation
      const entries = Array.from(merged.entries()).map(([k, v]) => `${k}: ${v}`);
      return `(${entries.join(', ')})`;
    }
    return null;
  }
  
  return null;
}

/**
 * Check if an expression is a map function call
 * @param {string} expression - Expression to check
 * @returns {boolean}
 */
function isMapFunction(expression) {
  if (!expression || typeof expression !== 'string') return false;
  return /^map-(get|has-key|keys|values|merge)\s*\(/i.test(expression.trim());
}

module.exports = {
  mapGet,
  mapHasKey,
  mapKeys,
  mapValues,
  mapMerge,
  evaluateMapFunction,
  isMapFunction
};
