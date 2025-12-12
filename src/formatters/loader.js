/**
 * Formatter Module Loader
 *
 * Dynamically discovers and loads formatter modules from the folder structure.
 * Provides a registry-based approach to managing output formatters.
 *
 * @module formatters/loader
 */

const fs = require('fs');
const path = require('path');

/**
 * Path to the formatters directory
 * @type {string}
 */
const FORMATTERS_DIR = __dirname;

/**
 * Cache for loaded formatter modules
 * @type {Map<string, object>|null}
 */
let formatterRegistryCache = null;

/**
 * Required fields for a valid formatter module
 * @type {string[]}
 */
const REQUIRED_FIELDS = ['name', 'description', 'category', 'output', 'format'];

/**
 * Valid category values
 * @type {string[]}
 */
const VALID_CATEGORIES = [
  'cicd',           // CI/CD platforms (GitHub, GitLab, Jenkins, etc.)
  'code-quality',   // Code quality tools (SonarQube, CodeClimate, etc.)
  'docs',           // Documentation (Markdown, HTML, PDF, etc.)
  'monitoring',     // Dashboards & monitoring (Prometheus, Grafana, etc.)
  'notifications',  // Webhooks & notifications (Slack, Discord, etc.)
  'test-frameworks',// Test formats (JUnit, TAP, etc.)
  'ide',            // IDE integrations (VS Code, IntelliJ, etc.)
  'a11y-standards', // Accessibility standards (EARL, ACT, axe, etc.)
  'data'            // Data formats (JSON, YAML, CSV, etc.)
];

/**
 * Valid output types
 * @type {string[]}
 */
const VALID_OUTPUTS = [
  'json',    // JSON output
  'xml',     // XML output
  'text',    // Plain text output
  'html',    // HTML output
  'binary'   // Binary output (e.g., protocol buffers)
];

/**
 * Discover all formatter folders in src/formatters/
 *
 * Scans the formatters directory for subfolders that contain an index.js file.
 *
 * @returns {string[]} Array of formatter folder paths (absolute paths)
 */
function discoverFormatters() {
  if (!fs.existsSync(FORMATTERS_DIR)) {
    return [];
  }

  let entries;
  try {
    entries = fs.readdirSync(FORMATTERS_DIR, { withFileTypes: true });
  } catch (error) {
    console.warn(`[formatter-loader] Warning: Could not read formatters directory: ${error.message}`);
    return [];
  }

  const formatterPaths = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    // Skip special folders
    if (entry.name.startsWith('_') || entry.name === 'node_modules') {
      continue;
    }

    const formatterFolder = path.join(FORMATTERS_DIR, entry.name);
    const indexFile = path.join(formatterFolder, 'index.js');

    if (fs.existsSync(indexFile)) {
      formatterPaths.push(formatterFolder);
    }
  }

  return formatterPaths;
}

/**
 * Validate a formatter module has required fields
 *
 * @param {object} module - The formatter module to validate
 * @returns {{ valid: boolean, errors: string[] }} Validation result
 */
function validateFormatterModule(module) {
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

  if ('category' in module) {
    if (typeof module.category !== 'string') {
      errors.push('Field "category" must be a string');
    } else if (!VALID_CATEGORIES.includes(module.category)) {
      errors.push(`Field "category" must be one of: ${VALID_CATEGORIES.join(', ')}`);
    }
  }

  if ('output' in module) {
    if (typeof module.output !== 'string') {
      errors.push('Field "output" must be a string');
    } else if (!VALID_OUTPUTS.includes(module.output)) {
      errors.push(`Field "output" must be one of: ${VALID_OUTPUTS.join(', ')}`);
    }
  }

  if ('format' in module && typeof module.format !== 'function') {
    errors.push('Field "format" must be a function');
  }

  // Validate optional fields if present
  if ('fileExtension' in module && typeof module.fileExtension !== 'string') {
    errors.push('Field "fileExtension" must be a string');
  }

  if ('mimeType' in module && typeof module.mimeType !== 'string') {
    errors.push('Field "mimeType" must be a string');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Load a single formatter module
 *
 * @param {string} formatterPath - Path to formatter folder (must contain index.js)
 * @returns {{ module: object|null, error: string|null }} Load result
 */
function loadFormatter(formatterPath) {
  const indexFile = path.join(formatterPath, 'index.js');
  const formatterName = path.basename(formatterPath);

  if (!fs.existsSync(indexFile)) {
    return {
      module: null,
      error: `Formatter "${formatterName}": index.js not found at ${indexFile}`
    };
  }

  let module;
  try {
    delete require.cache[require.resolve(indexFile)];
    module = require(indexFile);
  } catch (error) {
    return {
      module: null,
      error: `Formatter "${formatterName}": Failed to load - ${error.message}`
    };
  }

  const validation = validateFormatterModule(module);
  if (!validation.valid) {
    return {
      module: null,
      error: `Formatter "${formatterName}": Invalid module - ${validation.errors.join('; ')}`
    };
  }

  if (module.name !== formatterName) {
    console.warn(
      `[formatter-loader] Warning: Formatter name "${module.name}" does not match folder name "${formatterName}"`
    );
  }

  return {
    module,
    error: null
  };
}

/**
 * Load all formatters and return a registry
 *
 * @param {boolean} [forceReload=false] - Force reload even if cached
 * @returns {Map<string, object>} Map of formatterName -> module
 */
function loadAllFormatters(forceReload = false) {
  if (formatterRegistryCache && !forceReload) {
    return formatterRegistryCache;
  }

  const registry = new Map();
  const formatterPaths = discoverFormatters();

  if (formatterPaths.length === 0) {
    formatterRegistryCache = registry;
    return registry;
  }

  let loadedCount = 0;
  let errorCount = 0;

  for (const formatterPath of formatterPaths) {
    const result = loadFormatter(formatterPath);

    if (result.module) {
      registry.set(result.module.name, result.module);
      loadedCount++;
    } else {
      console.warn(`[formatter-loader] ${result.error}`);
      errorCount++;
    }
  }

  if (errorCount > 0) {
    console.warn(
      `[formatter-loader] Loaded ${loadedCount} formatters, ${errorCount} failed to load`
    );
  }

  formatterRegistryCache = registry;
  return registry;
}

/**
 * Get formatters filtered by category
 *
 * @param {Map<string, object>} registry - Formatter registry
 * @param {string} category - Category to filter by
 * @returns {Map<string, object>} Filtered formatters
 */
function getFormattersByCategory(registry, category) {
  if (!VALID_CATEGORIES.includes(category)) {
    console.warn(`[formatter-loader] Invalid category "${category}"`);
    return new Map();
  }

  const filtered = new Map();

  for (const [name, module] of registry) {
    if (module.category === category) {
      filtered.set(name, module);
    }
  }

  return filtered;
}

/**
 * Get formatters filtered by output type
 *
 * @param {Map<string, object>} registry - Formatter registry
 * @param {string} output - Output type to filter by
 * @returns {Map<string, object>} Filtered formatters
 */
function getFormattersByOutput(registry, output) {
  if (!VALID_OUTPUTS.includes(output)) {
    console.warn(`[formatter-loader] Invalid output type "${output}"`);
    return new Map();
  }

  const filtered = new Map();

  for (const [name, module] of registry) {
    if (module.output === output) {
      filtered.set(name, module);
    }
  }

  return filtered;
}

/**
 * Get a single formatter by name
 *
 * @param {string} name - Formatter name
 * @returns {object|undefined} Formatter module or undefined
 */
function getFormatter(name) {
  const registry = loadAllFormatters();
  return registry.get(name);
}

/**
 * Format results using a named formatter
 *
 * @param {string} name - Formatter name
 * @param {object} results - Analysis results
 * @param {object} [options={}] - Formatter options
 * @returns {string|object} Formatted output
 */
function format(name, results, options = {}) {
  const formatter = getFormatter(name);
  if (!formatter) {
    const available = Array.from(loadAllFormatters().keys()).join(', ');
    throw new Error(`Unknown formatter: "${name}". Available: ${available}`);
  }
  return formatter.format(results, options);
}

/**
 * List all available formatter names
 *
 * @returns {string[]} Array of formatter names
 */
function listFormatters() {
  return Array.from(loadAllFormatters().keys()).sort();
}

/**
 * Get formatter info for all formatters
 *
 * @returns {object[]} Array of formatter info objects
 */
function listFormattersWithInfo() {
  const registry = loadAllFormatters();
  const info = [];

  for (const [name, module] of registry) {
    info.push({
      name: module.name,
      description: module.description,
      category: module.category,
      output: module.output,
      fileExtension: module.fileExtension || null,
      mimeType: module.mimeType || null
    });
  }

  return info.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Clear the formatter registry cache
 */
function clearCache() {
  formatterRegistryCache = null;
}

module.exports = {
  // Core API
  discoverFormatters,
  loadFormatter,
  loadAllFormatters,
  validateFormatterModule,
  getFormattersByCategory,
  getFormattersByOutput,
  getFormatter,
  format,
  listFormatters,
  listFormattersWithInfo,
  clearCache,

  // Constants
  FORMATTERS_DIR,
  REQUIRED_FIELDS,
  VALID_CATEGORIES,
  VALID_OUTPUTS
};
