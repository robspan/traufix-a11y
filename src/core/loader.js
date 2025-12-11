/**
 * Check Module Loader
 *
 * Dynamically discovers and loads check modules from the folder structure.
 * Provides a registry-based approach to managing accessibility checks.
 *
 * @module core/loader
 */

const fs = require('fs');
const path = require('path');

/**
 * Path to the checks directory
 * @type {string}
 */
const CHECKS_DIR = path.join(__dirname, '..', 'checks');

/**
 * Cache for loaded check modules
 * @type {Map<string, object>|null}
 */
let checkRegistryCache = null;

/**
 * Required fields for a valid check module
 * @type {string[]}
 */
const REQUIRED_FIELDS = ['name', 'description', 'tier', 'type', 'check'];

/**
 * Valid tier values
 * @type {string[]}
 */
const VALID_TIERS = ['basic', 'material', 'full'];

/**
 * Valid type values
 * @type {string[]}
 */
const VALID_TYPES = ['html', 'scss'];

/**
 * Tier hierarchy for filtering
 * Maps each tier to the tiers it includes
 * @type {Object<string, string[]>}
 */
const TIER_HIERARCHY = {
  basic: ['basic'],
  material: ['basic', 'material'],
  full: ['basic', 'material', 'full']
};

/**
 * Discover all check folders in src/checks/
 *
 * Scans the checks directory for subfolders that contain an index.js file.
 *
 * @returns {string[]} Array of check folder paths (absolute paths)
 *
 * @example
 * const checkPaths = discoverChecks();
 * // Returns: ['/path/to/src/checks/buttonNames', '/path/to/src/checks/colorContrast', ...]
 */
function discoverChecks() {
  // Handle missing checks directory gracefully
  if (!fs.existsSync(CHECKS_DIR)) {
    return [];
  }

  let entries;
  try {
    entries = fs.readdirSync(CHECKS_DIR, { withFileTypes: true });
  } catch (error) {
    console.warn(`[loader] Warning: Could not read checks directory: ${error.message}`);
    return [];
  }

  const checkPaths = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const checkFolder = path.join(CHECKS_DIR, entry.name);
    const indexFile = path.join(checkFolder, 'index.js');

    // Only include folders that have an index.js file
    if (fs.existsSync(indexFile)) {
      checkPaths.push(checkFolder);
    }
  }

  return checkPaths;
}

/**
 * Validate a check module has required fields
 *
 * Validates that the module exports all required properties with correct types.
 *
 * @param {object} module - The check module to validate
 * @returns {{ valid: boolean, errors: string[] }} Validation result
 *
 * @example
 * const result = validateCheckModule(myModule);
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors);
 * }
 */
function validateCheckModule(module) {
  const errors = [];

  if (!module || typeof module !== 'object') {
    return { valid: false, errors: ['Module is not an object'] };
  }

  // Check required fields exist
  for (const field of REQUIRED_FIELDS) {
    if (!(field in module)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate field types if they exist
  if ('name' in module && typeof module.name !== 'string') {
    errors.push('Field "name" must be a string');
  }

  if ('description' in module && typeof module.description !== 'string') {
    errors.push('Field "description" must be a string');
  }

  if ('tier' in module) {
    if (typeof module.tier !== 'string') {
      errors.push('Field "tier" must be a string');
    } else if (!VALID_TIERS.includes(module.tier)) {
      errors.push(`Field "tier" must be one of: ${VALID_TIERS.join(', ')}`);
    }
  }

  if ('type' in module) {
    if (typeof module.type !== 'string') {
      errors.push('Field "type" must be a string');
    } else if (!VALID_TYPES.includes(module.type)) {
      errors.push(`Field "type" must be one of: ${VALID_TYPES.join(', ')}`);
    }
  }

  if ('check' in module && typeof module.check !== 'function') {
    errors.push('Field "check" must be a function');
  }

  // Validate optional fields if present
  if ('wcag' in module && typeof module.wcag !== 'string') {
    errors.push('Field "wcag" must be a string');
  }

  if ('weight' in module && typeof module.weight !== 'number') {
    errors.push('Field "weight" must be a number');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Load a single check module
 *
 * Attempts to load and validate a check module from the given path.
 * Returns the module if successful, or an error message if it fails.
 *
 * @param {string} checkPath - Path to check folder (must contain index.js)
 * @returns {{ module: object|null, error: string|null }} Load result
 *
 * @example
 * const result = loadCheck('/path/to/src/checks/buttonNames');
 * if (result.module) {
 *   console.log('Loaded:', result.module.name);
 * } else {
 *   console.error('Error:', result.error);
 * }
 */
function loadCheck(checkPath) {
  const indexFile = path.join(checkPath, 'index.js');
  const checkName = path.basename(checkPath);

  // Check if index.js exists
  if (!fs.existsSync(indexFile)) {
    return {
      module: null,
      error: `Check "${checkName}": index.js not found at ${indexFile}`
    };
  }

  // Try to require the module
  let module;
  try {
    // Clear from cache to ensure fresh load during development
    delete require.cache[require.resolve(indexFile)];
    module = require(indexFile);
  } catch (error) {
    return {
      module: null,
      error: `Check "${checkName}": Failed to load - ${error.message}`
    };
  }

  // Validate the module
  const validation = validateCheckModule(module);
  if (!validation.valid) {
    return {
      module: null,
      error: `Check "${checkName}": Invalid module - ${validation.errors.join('; ')}`
    };
  }

  // Verify name matches folder name for consistency
  if (module.name !== checkName) {
    console.warn(
      `[loader] Warning: Check name "${module.name}" does not match folder name "${checkName}"`
    );
  }

  return {
    module,
    error: null
  };
}

/**
 * Load all checks and return a registry
 *
 * Discovers all check modules, loads them, and returns a Map registry.
 * Failed modules are logged as warnings but don't stop the loading process.
 * Results are cached for performance.
 *
 * @param {boolean} [forceReload=false] - Force reload even if cached
 * @returns {Map<string, object>} Map of checkName -> module
 *
 * @example
 * const registry = loadAllChecks();
 * console.log(`Loaded ${registry.size} checks`);
 *
 * for (const [name, module] of registry) {
 *   console.log(`- ${name}: ${module.description}`);
 * }
 */
function loadAllChecks(forceReload = false) {
  // Return cached registry if available
  if (checkRegistryCache && !forceReload) {
    return checkRegistryCache;
  }

  const registry = new Map();
  const checkPaths = discoverChecks();

  if (checkPaths.length === 0) {
    console.warn('[loader] Warning: No check modules found in src/checks/');
    checkRegistryCache = registry;
    return registry;
  }

  let loadedCount = 0;
  let errorCount = 0;

  for (const checkPath of checkPaths) {
    const result = loadCheck(checkPath);

    if (result.module) {
      registry.set(result.module.name, result.module);
      loadedCount++;
    } else {
      console.warn(`[loader] ${result.error}`);
      errorCount++;
    }
  }

  // Log summary
  if (errorCount > 0) {
    console.warn(
      `[loader] Loaded ${loadedCount} checks, ${errorCount} failed to load`
    );
  }

  // Cache the registry
  checkRegistryCache = registry;

  return registry;
}

/**
 * Get checks filtered by tier
 *
 * Returns a filtered registry containing only checks that match the specified tier.
 * Tier filtering is cumulative:
 * - 'basic': only basic tier checks
 * - 'material': basic + material tier checks (default)
 * - 'full': all checks (basic + material + full)
 *
 * @param {Map<string, object>} registry - Check registry (from loadAllChecks)
 * @param {'basic'|'material'|'full'} tier - Tier to filter by
 * @returns {Map<string, object>} Filtered checks
 *
 * @example
 * const registry = loadAllChecks();
 * const materialChecks = getChecksByTier(registry, 'material');
 * console.log(`Material tier has ${materialChecks.size} checks`);
 */
function getChecksByTier(registry, tier) {
  // Validate tier
  if (!VALID_TIERS.includes(tier)) {
    console.warn(`[loader] Invalid tier "${tier}", defaulting to "material"`);
    tier = 'material';
  }

  const allowedTiers = TIER_HIERARCHY[tier];
  const filtered = new Map();

  for (const [name, module] of registry) {
    if (allowedTiers.includes(module.tier)) {
      filtered.set(name, module);
    }
  }

  return filtered;
}

/**
 * Get checks filtered by type
 *
 * Returns a filtered registry containing only checks of the specified type.
 *
 * @param {Map<string, object>} registry - Check registry
 * @param {'html'|'scss'} type - Type to filter by
 * @returns {Map<string, object>} Filtered checks
 *
 * @example
 * const registry = loadAllChecks();
 * const htmlChecks = getChecksByType(registry, 'html');
 */
function getChecksByType(registry, type) {
  if (!VALID_TYPES.includes(type)) {
    console.warn(`[loader] Invalid type "${type}"`);
    return new Map();
  }

  const filtered = new Map();

  for (const [name, module] of registry) {
    if (module.type === type) {
      filtered.set(name, module);
    }
  }

  return filtered;
}

/**
 * Clear the check registry cache
 *
 * Useful for testing or when check modules have been modified.
 */
function clearCache() {
  checkRegistryCache = null;
}

/**
 * Get a single check by name
 *
 * @param {string} name - Check name
 * @returns {object|undefined} Check module or undefined if not found
 */
function getCheck(name) {
  const registry = loadAllChecks();
  return registry.get(name);
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Core API
  discoverChecks,
  loadCheck,
  loadAllChecks,
  validateCheckModule,
  getChecksByTier,

  // Additional utilities
  getChecksByType,
  getCheck,
  clearCache,

  // Constants (for testing/extension)
  CHECKS_DIR,
  REQUIRED_FIELDS,
  VALID_TIERS,
  VALID_TYPES,
  TIER_HIERARCHY
};
