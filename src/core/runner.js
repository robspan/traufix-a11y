/**
 * @fileoverview Parallel execution coordinator for accessibility checks.
 *
 * This module manages a pool of worker threads to execute accessibility checks
 * across multiple files in parallel. It handles:
 * - Worker pool creation and lifecycle management
 * - Task distribution using a job queue
 * - Result collection and aggregation
 * - Error recovery and graceful degradation
 *
 * @module core/runner
 */

'use strict';

const os = require('os');
const path = require('path');
const { Worker } = require('worker_threads');
const { loadAllChecks, getChecksByTier, getChecksByType } = require('./loader');
const { verifyByTier, getVerifySummary } = require('./verifier');

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * @typedef {Object} CheckResult
 * @property {boolean} pass - Whether the check passed
 * @property {string[]} issues - Array of issue messages
 * @property {string|null} error - Error message if check threw
 */

/**
 * @typedef {Object} FileResult
 * @property {string} path - File path
 * @property {Map<string, CheckResult>} checks - Map of checkName to CheckResult
 * @property {number} passed - Number of checks that passed
 * @property {number} failed - Number of checks that failed
 */

/**
 * @typedef {Object} RunResults
 * @property {Map<string, FileResult>} files - Map of filePath to FileResult
 * @property {Object} summary - Summary statistics
 * @property {number} summary.totalFiles - Total files processed
 * @property {number} summary.totalChecks - Total check executions
 * @property {number} summary.passed - Total passed checks
 * @property {number} summary.failed - Total failed checks
 * @property {number} summary.errors - Total checks that errored
 * @property {Array<{file: string, check: string, message: string}>} summary.issues - All issues found
 * @property {Object} timing - Timing information
 * @property {number} timing.startTime - Start timestamp
 * @property {number} timing.endTime - End timestamp
 * @property {number} timing.duration - Duration in milliseconds
 */

/**
 * @typedef {Object} VerifyResults
 * @property {Map<string, Object>} results - Map of checkName to VerifyResult
 * @property {Object} summary - Summary statistics
 * @property {number} summary.total - Total checks
 * @property {number} summary.verified - Verified checks
 * @property {number} summary.failed - Failed checks
 * @property {number} summary.skipped - Skipped checks
 * @property {Object} timing - Timing information
 * @property {number} timing.duration - Duration in milliseconds
 */

/**
 * @typedef {Object} WorkerInfo
 * @property {Worker} worker - The Worker instance
 * @property {boolean} busy - Whether the worker is processing a task
 * @property {string|null} currentTaskId - ID of current task being processed
 */

/**
 * @typedef {Object} PendingTask
 * @property {Function} resolve - Promise resolve function
 * @property {Function} reject - Promise reject function
 * @property {Object} task - The original task object
 * @property {number} timeout - Timeout handle
 */

// ============================================
// CHECK RUNNER CLASS
// ============================================

/**
 * Parallel execution coordinator for accessibility checks.
 *
 * Creates and manages a pool of worker threads to execute checks
 * across multiple files efficiently.
 *
 * @example
 * const runner = new CheckRunner({ workers: 4 });
 * await runner.init();
 *
 * const results = await runner.runChecks(files, 'material');
 * console.log(`Found ${results.summary.issues.length} issues`);
 *
 * await runner.shutdown();
 */
class CheckRunner {
  /**
   * Create a new CheckRunner.
   *
   * @param {Object} [options={}] - Configuration options
   * @param {number|'auto'} [options.workers='auto'] - Number of workers or 'auto' for CPU count - 1
   * @param {number} [options.timeout=30000] - Task timeout in milliseconds
   */
  constructor(options = {}) {
    // Determine worker count
    if (options.workers === 'auto' || options.workers === undefined) {
      this.workerCount = Math.max(1, os.cpus().length - 1);
    } else {
      this.workerCount = Math.max(1, parseInt(options.workers, 10) || 1);
    }

    /** @type {number} Task timeout in milliseconds */
    this.timeout = options.timeout || 30000;

    /** @type {WorkerInfo[]} Array of worker info objects */
    this.workers = [];

    /** @type {Object[]} Queue of tasks waiting to be processed */
    this.taskQueue = [];

    /** @type {Map<string, PendingTask>} Map of taskId to pending task info */
    this.pendingTasks = new Map();

    /** @type {number} Counter for generating unique task IDs */
    this.taskIdCounter = 0;

    /** @type {boolean} Whether the runner has been initialized */
    this.initialized = false;

    /** @type {boolean} Whether shutdown has been requested */
    this.shuttingDown = false;

    /** @type {Map<string, Object>|null} Cached check registry */
    this.checkRegistry = null;
  }

  /**
   * Initialize the worker pool.
   *
   * Creates worker threads and waits for them to be ready.
   * Must be called before runChecks() or verifyChecks().
   *
   * @returns {Promise<void>}
   * @throws {Error} If worker initialization fails
   *
   * @example
   * const runner = new CheckRunner();
   * await runner.init();
   */
  async init() {
    if (this.initialized) {
      return;
    }

    const workerPath = path.join(__dirname, 'worker.js');

    // Check if worker file exists - if not, we'll run in single-threaded mode
    const fs = require('fs');
    if (!fs.existsSync(workerPath)) {
      console.warn('[runner] Worker file not found, running in single-threaded mode');
      this.workerCount = 0;
      this.initialized = true;
      return;
    }

    const initPromises = [];

    for (let i = 0; i < this.workerCount; i++) {
      initPromises.push(this._createWorker(workerPath, i));
    }

    // Wait for all workers to initialize
    const results = await Promise.allSettled(initPromises);

    // Count successful workers
    let successCount = 0;
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        successCount++;
      }
    }

    if (successCount === 0 && this.workerCount > 0) {
      console.warn('[runner] No workers initialized successfully, running in single-threaded mode');
      this.workerCount = 0;
    } else if (successCount < this.workerCount) {
      console.warn(`[runner] Only ${successCount}/${this.workerCount} workers initialized`);
      this.workerCount = successCount;
    }

    this.initialized = true;
  }

  /**
   * Create a single worker thread.
   *
   * @param {string} workerPath - Path to worker.js file
   * @param {number} index - Worker index for logging
   * @returns {Promise<boolean>} True if worker created successfully
   * @private
   */
  async _createWorker(workerPath, index) {
    return new Promise((resolve) => {
      try {
        const worker = new Worker(workerPath);

        // Set up ready signal handler
        const readyTimeout = setTimeout(() => {
          console.warn(`[runner] Worker ${index} did not send ready signal in time`);
          worker.terminate();
          resolve(false);
        }, 5000);

        worker.once('message', (msg) => {
          if (msg.type === 'ready') {
            clearTimeout(readyTimeout);

            // Set up permanent message handlers
            worker.on('message', (msg) => this._handleWorkerMessage(msg));
            worker.on('error', (err) => this._handleWorkerError(worker, err));
            worker.on('exit', (code) => this._handleWorkerExit(worker, code));

            this.workers.push({
              worker,
              busy: false,
              currentTaskId: null
            });

            resolve(true);
          }
        });

        worker.once('error', (err) => {
          clearTimeout(readyTimeout);
          console.warn(`[runner] Worker ${index} failed to initialize: ${err.message}`);
          resolve(false);
        });
      } catch (err) {
        console.warn(`[runner] Failed to create worker ${index}: ${err.message}`);
        resolve(false);
      }
    });
  }

  /**
   * Handle messages from worker threads.
   *
   * @param {Object} msg - Message from worker
   * @private
   */
  _handleWorkerMessage(msg) {
    if (msg.type === 'result') {
      const pending = this.pendingTasks.get(msg.id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingTasks.delete(msg.id);
        pending.resolve(msg.result);
      }

      // Mark worker as available
      const workerInfo = this.workers.find(w => w.currentTaskId === msg.id);
      if (workerInfo) {
        workerInfo.busy = false;
        workerInfo.currentTaskId = null;
      }

      // Process next task in queue
      this._processQueue();
    }
  }

  /**
   * Handle worker errors.
   *
   * @param {Worker} worker - The worker that errored
   * @param {Error} err - The error
   * @private
   */
  _handleWorkerError(worker, err) {
    console.error(`[runner] Worker error: ${err.message}`);

    // Find and reject the pending task
    const workerInfo = this.workers.find(w => w.worker === worker);
    if (workerInfo && workerInfo.currentTaskId) {
      const pending = this.pendingTasks.get(workerInfo.currentTaskId);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingTasks.delete(workerInfo.currentTaskId);
        pending.reject(new Error(`Worker error: ${err.message}`));
      }
    }

    // Remove the dead worker from pool (don't respawn - let pool degrade gracefully)
    const index = this.workers.indexOf(workerInfo);
    if (index !== -1) {
      this.workers.splice(index, 1);
      this.workerCount = this.workers.length;
    }

    // If no workers left, log warning
    if (this.workers.length === 0 && !this.shuttingDown) {
      console.warn('[runner] All workers have died, falling back to single-threaded mode');
    }

    // Process queue in case there are pending tasks
    this._processQueue();
  }

  /**
   * Handle worker exit.
   *
   * @param {Worker} worker - The worker that exited
   * @param {number} code - Exit code
   * @private
   */
  _handleWorkerExit(worker, code) {
    if (code !== 0 && !this.shuttingDown) {
      console.warn(`[runner] Worker exited with code ${code}`);
    }

    // Find and handle any pending task
    const workerInfo = this.workers.find(w => w.worker === worker);
    if (workerInfo && workerInfo.currentTaskId) {
      const pending = this.pendingTasks.get(workerInfo.currentTaskId);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingTasks.delete(workerInfo.currentTaskId);
        pending.reject(new Error(`Worker exited unexpectedly with code ${code}`));
      }
    }

    // Remove from pool
    const index = this.workers.indexOf(workerInfo);
    if (index !== -1) {
      this.workers.splice(index, 1);
      this.workerCount = this.workers.length;
    }

    // Process queue
    this._processQueue();
  }

  /**
   * Queue a task for execution.
   *
   * @param {Object} task - The task to queue
   * @returns {Promise<Object>} Task result
   * @private
   */
  _queueTask(task) {
    return new Promise((resolve, reject) => {
      const id = String(++this.taskIdCounter);

      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        const pending = this.pendingTasks.get(id);
        if (pending) {
          this.pendingTasks.delete(id);

          // Mark worker as available
          const workerInfo = this.workers.find(w => w.currentTaskId === id);
          if (workerInfo) {
            workerInfo.busy = false;
            workerInfo.currentTaskId = null;
          }

          reject(new Error(`Task timed out after ${this.timeout}ms`));
        }
      }, this.timeout);

      this.pendingTasks.set(id, { resolve, reject, task, timeout: timeoutHandle });
      this.taskQueue.push({ ...task, id });
      this._processQueue();
    });
  }

  /**
   * Process the task queue by assigning tasks to available workers.
   *
   * @private
   */
  _processQueue() {
    while (this.taskQueue.length > 0) {
      const availableWorker = this.workers.find(w => !w.busy);
      if (!availableWorker) break;

      const task = this.taskQueue.shift();
      availableWorker.busy = true;
      availableWorker.currentTaskId = task.id;
      availableWorker.worker.postMessage(task);
    }
  }

  /**
   * Run a single check on content (single-threaded fallback).
   *
   * @param {Object} checkModule - The check module
   * @param {string} content - Content to check
   * @returns {CheckResult} Check result
   * @private
   */
  _runCheckSync(checkModule, content) {
    try {
      const result = checkModule.check(content);
      return {
        pass: result.pass === true,
        issues: Array.isArray(result.issues) ? result.issues : [],
        error: null
      };
    } catch (err) {
      return {
        pass: false,
        issues: [],
        error: `Check threw an error: ${err.message}`
      };
    }
  }

  /**
   * Run checks on multiple files.
   *
   * Distributes check tasks across worker threads (or runs single-threaded
   * if no workers are available) and aggregates results.
   *
   * @param {Array<{path: string, content: string}>} files - Files to check
   * @param {'basic'|'material'|'full'} [tier='material'] - Which tier of checks to run
   * @param {Object} [options={}] - Additional options
   * @param {string} [options.check] - Optional single check name to run
   * @returns {Promise<RunResults>} Aggregated results
   *
   * @example
   * const files = [
   *   { path: 'button.html', content: '<button></button>' },
   *   { path: 'link.html', content: '<a href="#">Click</a>' }
   * ];
   *
   * const results = await runner.runChecks(files, 'material');
   * console.log(`Checked ${results.summary.totalFiles} files`);
   */
  async runChecks(files, tier = 'material', options = {}) {
    const startTime = Date.now();

    // Initialize if not already done
    if (!this.initialized) {
      await this.init();
    }

    // Validate tier
    const validTiers = ['basic', 'material', 'full'];
    if (!validTiers.includes(tier)) {
      console.warn(`[runner] Invalid tier "${tier}", defaulting to "material"`);
      tier = 'material';
    }

    // Load and filter checks
    this.checkRegistry = this.checkRegistry || loadAllChecks();
    let checks = getChecksByTier(this.checkRegistry, tier);

    // If a specific check is requested, filter to just that one
    if (options.check) {
      const specificCheck = checks.get(options.check);
      if (specificCheck) {
        checks = new Map([[options.check, specificCheck]]);
      } else {
        console.warn(`[runner] Check "${options.check}" not found`);
        checks = new Map();
      }
    }

    // Initialize results structure
    const results = {
      files: new Map(),
      summary: {
        totalFiles: files.length,
        totalChecks: 0,
        passed: 0,
        failed: 0,
        errors: 0,
        issues: []
      },
      timing: {
        startTime,
        endTime: 0,
        duration: 0
      }
    };

    if (files.length === 0 || checks.size === 0) {
      results.timing.endTime = Date.now();
      results.timing.duration = results.timing.endTime - startTime;
      return results;
    }

    // Split checks by type
    const htmlChecks = getChecksByType(checks, 'html');
    const scssChecks = getChecksByType(checks, 'scss');

    // Determine if we should use workers or run single-threaded
    const useWorkers = this.workers.length > 0;

    // Process each file
    for (const file of files) {
      const fileResult = {
        path: file.path,
        checks: new Map(),
        passed: 0,
        failed: 0
      };

      // Determine file type from extension
      const ext = path.extname(file.path).toLowerCase();
      const isHtml = ['.html', '.htm'].includes(ext);
      const isScss = ['.scss', '.css', '.sass'].includes(ext);

      // Select appropriate checks for this file type
      let applicableChecks;
      if (isHtml) {
        applicableChecks = htmlChecks;
      } else if (isScss) {
        applicableChecks = scssChecks;
      } else {
        // Try both check types for unknown extensions
        applicableChecks = checks;
      }

      // Run each applicable check on this file
      for (const [checkName, checkModule] of applicableChecks) {
        results.summary.totalChecks++;

        let checkResult;

        if (useWorkers) {
          // Use worker threads
          try {
            checkResult = await this._queueTask({
              type: 'runCheck',
              checkName,
              content: file.content
            });
          } catch (err) {
            checkResult = {
              pass: false,
              issues: [],
              error: err.message
            };
          }
        } else {
          // Run single-threaded
          checkResult = this._runCheckSync(checkModule, file.content);
        }

        // Store result
        fileResult.checks.set(checkName, checkResult);

        // Update counters
        if (checkResult.error) {
          results.summary.errors++;
          fileResult.failed++;
        } else if (checkResult.pass) {
          results.summary.passed++;
          fileResult.passed++;
        } else {
          results.summary.failed++;
          fileResult.failed++;

          // Add issues to summary
          for (const issue of checkResult.issues) {
            results.summary.issues.push({
              file: file.path,
              check: checkName,
              message: issue
            });
          }
        }
      }

      results.files.set(file.path, fileResult);
    }

    // Record timing
    results.timing.endTime = Date.now();
    results.timing.duration = results.timing.endTime - startTime;

    return results;
  }

  /**
   * Verify all checks (self-test).
   *
   * Runs each check against its verify file to ensure correct behavior.
   *
   * @param {'basic'|'material'|'full'} [tier='full'] - Which tier to verify
   * @returns {Promise<VerifyResults>} Verification results
   *
   * @example
   * const verifyResults = await runner.verifyChecks('full');
   * console.log(`Verified: ${verifyResults.summary.verified}/${verifyResults.summary.total}`);
   */
  async verifyChecks(tier = 'full') {
    const startTime = Date.now();

    // Validate tier
    const validTiers = ['basic', 'material', 'full'];
    if (!validTiers.includes(tier)) {
      console.warn(`[runner] Invalid tier "${tier}", defaulting to "full"`);
      tier = 'full';
    }

    // Run verification using the verifier module
    // Note: Verification currently runs single-threaded via the verifier module
    // Future enhancement: parallelize verification across workers
    const verifyResults = verifyByTier(tier);
    const summary = getVerifySummary(verifyResults);

    const endTime = Date.now();

    return {
      results: verifyResults,
      summary: {
        total: summary.total,
        verified: summary.verified,
        failed: summary.failed,
        skipped: summary.skipped
      },
      timing: {
        duration: endTime - startTime
      }
    };
  }

  /**
   * Shutdown all workers.
   *
   * Terminates all worker threads and cleans up resources.
   * Should be called when the runner is no longer needed.
   *
   * @returns {Promise<void>}
   *
   * @example
   * await runner.shutdown();
   */
  async shutdown() {
    this.shuttingDown = true;

    // Reject all pending tasks
    for (const [id, pending] of this.pendingTasks) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Runner is shutting down'));
    }
    this.pendingTasks.clear();

    // Clear task queue
    this.taskQueue = [];

    // Terminate all workers
    const terminatePromises = this.workers.map(workerInfo => {
      return new Promise((resolve) => {
        workerInfo.worker.once('exit', () => resolve());
        workerInfo.worker.terminate();
      });
    });

    await Promise.all(terminatePromises);

    this.workers = [];
    this.workerCount = 0;
    this.initialized = false;
    this.shuttingDown = false;
    this.checkRegistry = null;
  }

  /**
   * Get the current status of the runner.
   *
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      initialized: this.initialized,
      workerCount: this.workerCount,
      activeWorkers: this.workers.filter(w => !w.busy).length,
      busyWorkers: this.workers.filter(w => w.busy).length,
      pendingTasks: this.pendingTasks.size,
      queuedTasks: this.taskQueue.length
    };
  }
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Create and initialize a CheckRunner with default options.
 *
 * @param {Object} [options] - Runner options
 * @returns {Promise<CheckRunner>} Initialized runner
 *
 * @example
 * const runner = await createRunner();
 * const results = await runner.runChecks(files);
 * await runner.shutdown();
 */
async function createRunner(options = {}) {
  const runner = new CheckRunner(options);
  await runner.init();
  return runner;
}

/**
 * Run checks on files using a temporary runner.
 *
 * Convenience function that creates a runner, runs checks, and shuts down.
 * Use CheckRunner directly for better performance with multiple operations.
 *
 * @param {Array<{path: string, content: string}>} files - Files to check
 * @param {Object} [options] - Options
 * @param {'basic'|'material'|'full'} [options.tier='material'] - Check tier
 * @param {string} [options.check] - Specific check to run
 * @param {number|'auto'} [options.workers='auto'] - Worker count
 * @returns {Promise<RunResults>} Check results
 *
 * @example
 * const results = await runChecksOnFiles([
 *   { path: 'app.html', content: htmlContent }
 * ], { tier: 'basic' });
 */
async function runChecksOnFiles(files, options = {}) {
  const runner = await createRunner({
    workers: options.workers || 'auto',
    timeout: options.timeout
  });

  try {
    return await runner.runChecks(files, options.tier || 'material', {
      check: options.check
    });
  } finally {
    await runner.shutdown();
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  CheckRunner,
  createRunner,
  runChecksOnFiles
};
