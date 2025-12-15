/**
 * @fileoverview Worker Thread implementation for parallel accessibility checks.
 *
 * This module runs inside a Worker Thread (not the main thread). It:
 * 1. Receives messages from the main thread with check tasks
 * 2. Loads the appropriate check module
 * 3. Runs the check on the provided content
 * 4. Sends results back to the main thread
 *
 * The worker is designed to be robust and never crash - all errors are
 * caught and reported back to the main thread.
 *
 * @module core/worker
 */

'use strict';

const { parentPort, workerData } = require('worker_threads');
const path = require('path');
const fs = require('fs');

// Path to checks directory relative to this file
const CHECKS_DIR = path.join(__dirname, '..', 'checks');

// Cache for loaded check modules to avoid repeated file system access
const checkCache = new Map();

/**
 * Deserialize varContext from JSON-safe format back to Maps.
 * Worker threads receive plain objects, we need to convert back to Maps.
 * @param {Object|null} serialized - Serialized context {scssVars, cssVars, maps} with arrays
 * @returns {Object} - Context with Maps
 */
function deserializeVarContext(serialized) {
  if (!serialized) {
    return {
      scssVars: new Map(),
      cssVars: new Map(),
      maps: new Map()
    };
  }

  return {
    scssVars: new Map(serialized.scssVars || []),
    cssVars: new Map(serialized.cssVars || []),
    maps: new Map((serialized.maps || []).map(([k, v]) => [k, new Map(v)]))
  };
}

// Import parser for verify file parsing
let parser = null;
try {
  parser = require('./parser');
} catch (err) {
  // Parser will be loaded lazily if needed
}

/**
 * Load a check module by name.
 *
 * Attempts to load the check module from the checks directory.
 * Modules are cached after first load for performance.
 *
 * @param {string} checkName - Name of the check (folder name in src/checks)
 * @returns {{ module: object|null, error: string|null }}
 * @private
 */
function loadCheckModule(checkName) {
  // Validate checkName to prevent directory traversal
  if (!checkName || typeof checkName !== 'string') {
    return { module: null, error: 'Invalid check name: must be a non-empty string' };
  }

  // Security: prevent directory traversal
  if (checkName.includes('..') || checkName.includes('/') || checkName.includes('\\')) {
    return { module: null, error: 'Invalid check name: contains invalid characters' };
  }

  // Return cached module if available
  if (checkCache.has(checkName)) {
    return { module: checkCache.get(checkName), error: null };
  }

  // Checks are flat .js files, not directories with index.js
  const checkPath = path.join(CHECKS_DIR, `${checkName}.js`);

  try {
    // Check if file exists first
    if (!fs.existsSync(checkPath)) {
      return { module: null, error: `Check module not found: ${checkName}` };
    }

    // Clear from require cache to ensure fresh load (useful during development)
    delete require.cache[require.resolve(checkPath)];

    const module = require(checkPath);

    // Validate the module has a check function
    if (!module || typeof module.check !== 'function') {
      return { module: null, error: `Check module "${checkName}" does not export a check function` };
    }

    // Cache the module
    checkCache.set(checkName, module);

    return { module, error: null };
  } catch (err) {
    return { module: null, error: `Failed to load check "${checkName}": ${err.message}` };
  }
}

/**
 * Run a check safely with error handling.
 *
 * @param {Function} checkFn - The check function to run
 * @param {string} content - Content to check
 * @param {string} filePath - Optional file path for context
 * @returns {{ pass: boolean, issues: string[], error: string|null }}
 * @private
 */
function runCheckSafely(checkFn, content, filePath) {
  try {
    const result = checkFn(content, filePath);

    // Normalize result to expected format
    const pass = result.pass === true;
    const issues = Array.isArray(result.issues) ? result.issues : [];
    const elementsFound = result.elementsFound || 0;

    return { pass, issues, elementsFound, error: null };
  } catch (err) {
    return {
      pass: false,
      issues: [],
      elementsFound: 0,
      error: `Check threw an error: ${err.message}`
    };
  }
}

/**
 * Handle a 'run' message - execute a check on content.
 *
 * @param {Object} msg - The message object
 * @param {string} msg.id - Unique task ID
 * @param {string} msg.checkName - Name of the check to run
 * @param {string} msg.content - Content to check
 * @param {string} [msg.filePath] - Optional file path for context
 * @private
 */
function handleRun(msg) {
  const { id, checkName, content, filePath } = msg;

  // Validate required fields
  if (!id) {
    sendError(null, checkName, 'INVALID_MESSAGE', 'Missing task id');
    return;
  }

  if (!checkName) {
    sendError(id, null, 'INVALID_MESSAGE', 'Missing checkName');
    return;
  }

  if (typeof content !== 'string') {
    sendError(id, checkName, 'INVALID_MESSAGE', 'Content must be a string');
    return;
  }

  // Load the check module
  const loadResult = loadCheckModule(checkName);
  if (!loadResult.module) {
    sendError(id, checkName, 'CHECK_NOT_FOUND', loadResult.error);
    return;
  }

  // Run the check
  const checkResult = runCheckSafely(loadResult.module.check, content, filePath);

  if (checkResult.error) {
    sendError(id, checkName, 'CHECK_ERROR', checkResult.error);
    return;
  }

  // Send success result
  parentPort.postMessage({
    type: 'result',
    id,
    checkName,
    result: {
      pass: checkResult.pass,
      issues: checkResult.issues,
      elementsFound: checkResult.elementsFound
    }
  });
}

/**
 * Handle a 'preload' message - pre-load check modules to warm the cache.
 * This reduces first-run latency by loading modules before they're needed.
 *
 * @param {Object} msg - The message object
 * @param {string} msg.id - Unique task ID
 * @param {string[]} msg.checkNames - Names of checks to preload
 * @private
 */
function handlePreload(msg) {
  const { id, checkNames } = msg;

  if (!id) {
    sendError(null, null, 'INVALID_MESSAGE', 'Missing task id');
    return;
  }

  if (!Array.isArray(checkNames)) {
    sendError(id, null, 'INVALID_MESSAGE', 'checkNames must be an array');
    return;
  }

  let loaded = 0;
  let failed = 0;

  for (const checkName of checkNames) {
    const loadResult = loadCheckModule(checkName);
    if (loadResult.module) {
      loaded++;
    } else {
      failed++;
    }
  }

  parentPort.postMessage({
    type: 'result',
    id,
    result: { loaded, failed }
  });
}

/**
 * Handle a 'runBatch' message - process multiple files with multiple checks.
 * This is the optimized path that minimizes message passing overhead.
 *
 * @param {Object} msg - The message object
 * @param {string} msg.id - Unique task ID
 * @param {Array<{path: string, content: string}>} msg.files - Files to process
 * @param {string[]} msg.htmlCheckNames - Check names for HTML files
 * @param {string[]} msg.scssCheckNames - Check names for SCSS files
 * @param {Object} [msg.varContext] - Serialized SCSS variable context for color resolution
 * @private
 */
function handleRunBatch(msg) {
  const { id, files, htmlCheckNames, scssCheckNames, varContext: serializedVarContext } = msg;
  
  // Deserialize varContext for SCSS checks (converts arrays back to Maps)
  const varContext = deserializeVarContext(serializedVarContext);

  if (!id) {
    sendError(null, null, 'INVALID_MESSAGE', 'Missing task id');
    return;
  }

  if (!Array.isArray(files)) {
    sendError(id, null, 'INVALID_MESSAGE', 'Files must be an array');
    return;
  }

  const results = {
    files: []
  };

  for (const file of files) {
    const ext = path.extname(file.path).toLowerCase();
    const isHtml = ['.html', '.htm'].includes(ext);
    const isScss = ['.scss', '.css', '.sass'].includes(ext);

    const checkNames = isHtml ? htmlCheckNames : (isScss ? scssCheckNames : []);
    const fileResult = {
      path: file.path,
      checks: {}
    };

    for (const checkName of checkNames) {
      const loadResult = loadCheckModule(checkName);
      if (!loadResult.module) {
        fileResult.checks[checkName] = {
          pass: false,
          issues: [],
          elementsFound: 0,
          error: loadResult.error
        };
        continue;
      }

      // SCSS checks receive varContext as second arg, HTML checks receive filePath
      const secondArg = isScss ? varContext : file.path;
      const checkResult = runCheckSafely(loadResult.module.check, file.content, secondArg);
      fileResult.checks[checkName] = {
        pass: checkResult.pass,
        issues: checkResult.issues,
        elementsFound: checkResult.elementsFound,
        error: checkResult.error
      };
    }

    results.files.push(fileResult);
  }

  parentPort.postMessage({
    type: 'result',
    id,
    result: results
  });
}

/**
 * Handle a 'verify' message - verify a check against its verify file.
 *
 * @param {Object} msg - The message object
 * @param {string} msg.id - Unique task ID
 * @param {string} msg.checkName - Name of the check to verify
 * @private
 */
function handleVerify(msg) {
  const { id, checkName } = msg;

  // Validate required fields
  if (!id) {
    sendError(null, checkName, 'INVALID_MESSAGE', 'Missing task id');
    return;
  }

  if (!checkName) {
    sendError(id, null, 'INVALID_MESSAGE', 'Missing checkName');
    return;
  }

  // Load the check module
  const loadResult = loadCheckModule(checkName);
  if (!loadResult.module) {
    sendError(id, checkName, 'CHECK_NOT_FOUND', loadResult.error);
    return;
  }

  const checkModule = loadResult.module;

  // Get the check type to determine verify file extension
  if (!checkModule.type) {
    sendError(id, checkName, 'INVALID_CHECK', 'Check module missing type property');
    return;
  }

  // Find and read the verify file
  const checkPath = path.join(CHECKS_DIR, checkName);
  const verifyFileResult = findAndReadVerifyFile(checkPath, checkModule.type);

  if (verifyFileResult.error) {
    sendVerifyResult(id, checkName, {
      verified: false,
      error: verifyFileResult.error,
      passResult: null,
      failResult: null
    });
    return;
  }

  // Ensure parser is loaded
  if (!parser) {
    try {
      parser = require('./parser');
    } catch (err) {
      sendError(id, checkName, 'PARSER_ERROR', `Failed to load parser: ${err.message}`);
      return;
    }
  }

  // Parse the verify file
  const parseResult = parser.parseVerifyFile(verifyFileResult.content, checkModule.type);

  if (parseResult.error) {
    sendVerifyResult(id, checkName, {
      verified: false,
      error: `Parse error: ${parseResult.error}`,
      passResult: null,
      failResult: null
    });
    return;
  }

  // Run check on pass section - expect pass (no issues)
  const passCheckResult = runCheckSafely(checkModule.check, parseResult.passContent);
  const passResult = {
    expected: 'pass',
    actual: passCheckResult.pass ? 'pass' : 'fail',
    issues: passCheckResult.issues,
    error: passCheckResult.error
  };

  // Run check on fail section - expect fail (has issues)
  const failCheckResult = runCheckSafely(checkModule.check, parseResult.failContent);
  const failResult = {
    expected: 'fail',
    actual: failCheckResult.pass ? 'pass' : 'fail',
    issues: failCheckResult.issues,
    error: failCheckResult.error
  };

  // Determine if verification passed
  const passVerified = passResult.actual === 'pass' && !passResult.error;
  const failVerified = failResult.actual === 'fail' && !failResult.error;
  const verified = passVerified && failVerified;

  sendVerifyResult(id, checkName, {
    verified,
    passResult,
    failResult,
    error: null
  });
}

/**
 * Find and read a verify file for a check.
 *
 * @param {string} checkPath - Path to the check folder
 * @param {string} checkType - Type of check ('html' or 'scss')
 * @returns {{ content: string|null, error: string|null }}
 * @private
 */
function findAndReadVerifyFile(checkPath, checkType) {
  const extension = checkType === 'html' ? '.html' : '.scss';
  const verifyFileName = `verify${extension}`;
  const verifyFilePath = path.join(checkPath, verifyFileName);

  // Try primary extension
  if (fs.existsSync(verifyFilePath)) {
    try {
      const content = fs.readFileSync(verifyFilePath, 'utf8');
      return { content, error: null };
    } catch (err) {
      return { content: null, error: `Failed to read verify file: ${err.message}` };
    }
  }

  // Try alternative extensions
  const alternativeExtensions = checkType === 'html' ? ['.htm'] : ['.css', '.sass'];
  for (const ext of alternativeExtensions) {
    const altPath = path.join(checkPath, `verify${ext}`);
    if (fs.existsSync(altPath)) {
      try {
        const content = fs.readFileSync(altPath, 'utf8');
        return { content, error: null };
      } catch (err) {
        return { content: null, error: `Failed to read verify file: ${err.message}` };
      }
    }
  }

  return {
    content: null,
    error: `Verify file not found: expected ${verifyFileName} in ${checkPath}`
  };
}

/**
 * Send an error message to the main thread.
 *
 * @param {string|null} id - Task ID (may be null if not available)
 * @param {string|null} checkName - Check name (may be null if not available)
 * @param {string} code - Error code
 * @param {string} message - Error message
 * @private
 */
function sendError(id, checkName, code, message) {
  parentPort.postMessage({
    type: 'error',
    id,
    checkName,
    error: { code, message }
  });
}

/**
 * Send a verify result to the main thread.
 *
 * @param {string} id - Task ID
 * @param {string} checkName - Check name
 * @param {Object} result - Verification result
 * @private
 */
function sendVerifyResult(id, checkName, result) {
  parentPort.postMessage({
    type: 'verify-result',
    id,
    checkName,
    result
  });
}

// ============================================
// MAIN MESSAGE HANDLER
// ============================================

/**
 * Handle incoming messages from the main thread.
 *
 * Supported message types:
 * - 'run': Execute a check on content
 * - 'verify': Verify a check against its verify file
 * - 'shutdown': Gracefully terminate the worker
 */
parentPort.on('message', (msg) => {
  // Wrap everything in try-catch to ensure worker never crashes
  try {
    // Validate message format
    if (!msg || typeof msg !== 'object') {
      sendError(null, null, 'INVALID_MESSAGE', 'Message must be an object');
      return;
    }

    if (!msg.type) {
      sendError(msg.id || null, msg.checkName || null, 'INVALID_MESSAGE', 'Message missing type');
      return;
    }

    switch (msg.type) {
      case 'run':
        handleRun(msg);
        break;

      case 'runBatch':
        handleRunBatch(msg);
        break;

      case 'verify':
        handleVerify(msg);
        break;

      case 'preload':
        // Preload check modules to warm the cache
        handlePreload(msg);
        break;

      case 'shutdown':
        // Graceful shutdown
        process.exit(0);
        break;

      default:
        sendError(
          msg.id || null,
          msg.checkName || null,
          'UNKNOWN_MESSAGE_TYPE',
          `Unknown message type: ${msg.type}`
        );
    }
  } catch (err) {
    // Catch-all error handler - worker should never crash
    sendError(
      (msg && msg.id) || null,
      (msg && msg.checkName) || null,
      'WORKER_ERROR',
      `Unexpected worker error: ${err.message}`
    );
  }
});

// Handle uncaught exceptions to prevent worker crash
process.on('uncaughtException', (err) => {
  try {
    sendError(null, null, 'UNCAUGHT_EXCEPTION', `Uncaught exception: ${err.message}`);
  } catch (e) {
    // Last resort - can't even send error message
    console.error('[worker] Fatal: Unable to report uncaught exception:', err);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  try {
    const message = reason instanceof Error ? reason.message : String(reason);
    sendError(null, null, 'UNHANDLED_REJECTION', `Unhandled promise rejection: ${message}`);
  } catch (e) {
    // Last resort - can't even send error message
    console.error('[worker] Fatal: Unable to report unhandled rejection:', reason);
  }
});

// ============================================
// READY SIGNAL
// ============================================

// Signal to main thread that worker is ready to receive messages
parentPort.postMessage({ type: 'ready' });
