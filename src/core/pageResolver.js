'use strict';

/**
 * Page Resolver - Preprocessing Step
 * 
 * Resolves all files that make up a "page" by:
 * 1. Starting from the route component's template
 * 2. Finding all child component selectors (<app-*, <my-*, etc.)
 * 3. Recursively resolving their templates and styles
 * 
 * This is a preprocessing step used by both sitemap and route analyzers.
 * 
 * ERROR HANDLING: This module is designed to be maximally error-tolerant.
 * Any failure falls back to "naive" mode (just the primary files).
 * It should NEVER crash the analysis - just degrade gracefully.
 */

const fs = require('fs');
const path = require('path');

// Lazy-load componentRegistry to catch import errors
let componentRegistryModule = null;

/**
 * Safely load the component registry module
 * @returns {object|null} The module or null if failed
 */
function getComponentRegistry() {
  if (componentRegistryModule === null) {
    try {
      componentRegistryModule = require('./componentRegistry');
    } catch (e) {
      console.warn('[PageResolver] Warning: Could not load componentRegistry:', e.message);
      componentRegistryModule = false; // Mark as failed, don't retry
    }
  }
  return componentRegistryModule || null;
}

/**
 * Preprocessor that builds context once and resolves pages on demand
 */
class PageResolver {
  /**
   * @param {string} projectDir - Angular project directory
   */
  constructor(projectDir) {
    this.projectDir = projectDir;
    this.registry = null;
    this.stats = null;
    this._initialized = false;
    this._initError = null;
  }

  /**
   * Initialize the component registry (call once before resolving pages)
   * Safe to call multiple times - will only initialize once.
   * Never throws - stores error for inspection if needed.
   * @returns {PageResolver} this for chaining
   */
  initialize() {
    if (this._initialized) return this;
    
    try {
      const registryModule = getComponentRegistry();
      
      if (!registryModule) {
        this._initError = 'Component registry module not available';
        this._initialized = true;
        return this;
      }

      if (typeof registryModule.buildComponentRegistry !== 'function') {
        this._initError = 'buildComponentRegistry is not a function';
        this._initialized = true;
        return this;
      }

      this.registry = registryModule.buildComponentRegistry(this.projectDir);
      
      if (this.registry && typeof registryModule.getRegistryStats === 'function') {
        this.stats = registryModule.getRegistryStats(this.registry);
      }
    } catch (e) {
      // Initialization failed - log and continue with naive mode
      console.warn('[PageResolver] Warning: Registry initialization failed:', e.message);
      this._initError = e.message;
      this.registry = null;
      this.stats = null;
    }
    
    this._initialized = true;
    return this;
  }

  /**
   * Check if initialized
   */
  get initialized() {
    return this._initialized;
  }

  /**
   * Check if initialization had an error (still usable in naive mode)
   */
  get initializationError() {
    return this._initError;
  }

  /**
   * Get registry statistics (safe - never throws)
   */
  getStats() {
    try {
      return this.stats || { total: 0, withTemplate: 0, withInlineTemplate: 0, withStyles: 0 };
    } catch (e) {
      return { total: 0, withTemplate: 0, withInlineTemplate: 0, withStyles: 0 };
    }
  }

  /**
   * Resolve all files for a page given its primary HTML template
   * NEVER throws - returns primary files only on any error
   * 
   * @param {string} htmlPath - Path to the route component's HTML template
   * @param {string} scssPath - Path to the route component's SCSS (optional)
   * @returns {object} Resolved page files
   */
  resolvePage(htmlPath, scssPath = null) {
    // Default result - this is the fallback for ANY error
    const result = {
      htmlFiles: [],
      scssFiles: [],
      inlineTemplates: [],
      components: [],
      primaryHtml: htmlPath,
      primaryScss: scssPath
    };

    try {
      // Always include primary files if they exist
      if (htmlPath && typeof htmlPath === 'string') {
        try {
          if (fs.existsSync(htmlPath)) {
            result.htmlFiles.push(htmlPath);
          }
        } catch (e) {
          // fs.existsSync failed - continue without this file
        }
      }
      
      if (scssPath && typeof scssPath === 'string') {
        try {
          if (fs.existsSync(scssPath)) {
            result.scssFiles.push(scssPath);
          }
        } catch (e) {
          // fs.existsSync failed - continue without this file
        }
      }

      // If not initialized or no registry, return just primary files (naive mode)
      if (!this._initialized || !this.registry || this.registry.size === 0) {
        return result;
      }

      // Try to resolve child components recursively
      const registryModule = getComponentRegistry();
      if (!registryModule || typeof registryModule.resolvePageComponents !== 'function') {
        return result;
      }

      if (htmlPath && typeof htmlPath === 'string') {
        try {
          if (!fs.existsSync(htmlPath)) {
            return result;
          }
        } catch (e) {
          return result;
        }

        try {
          const pageComponents = registryModule.resolvePageComponents(htmlPath, this.registry);
          
          if (!pageComponents || typeof pageComponents !== 'object') {
            return result;
          }

          // Merge results (avoiding duplicates) - defensive array handling
          if (Array.isArray(pageComponents.htmlFiles)) {
            for (const htmlFile of pageComponents.htmlFiles) {
              if (htmlFile && typeof htmlFile === 'string' && !result.htmlFiles.includes(htmlFile)) {
                result.htmlFiles.push(htmlFile);
              }
            }
          }
          
          if (Array.isArray(pageComponents.scssFiles)) {
            for (const scssFile of pageComponents.scssFiles) {
              if (scssFile && typeof scssFile === 'string' && !result.scssFiles.includes(scssFile)) {
                result.scssFiles.push(scssFile);
              }
            }
          }
          
          if (Array.isArray(pageComponents.inlineTemplates)) {
            result.inlineTemplates = pageComponents.inlineTemplates;
          }
          
          if (Array.isArray(pageComponents.components)) {
            result.components = pageComponents.components;
          }
        } catch (e) {
          // resolvePageComponents failed - return what we have (naive mode)
          console.warn('[PageResolver] Warning: Child resolution failed:', e.message);
        }
      }
    } catch (e) {
      // Unexpected error - return default result (naive mode)
      console.warn('[PageResolver] Warning: resolvePage failed:', e.message);
    }

    return result;
  }

  /**
   * Resolve files for a route object (from routeAnalyzer/sitemapAnalyzer)
   * NEVER throws - returns empty result on any error
   * 
   * @param {object} routeFiles - Object with { html, scss, component } from route resolution
   * @returns {object} Resolved page files
   */
  resolveRouteFiles(routeFiles) {
    const emptyResult = {
      htmlFiles: [],
      scssFiles: [],
      inlineTemplates: [],
      components: [],
      primaryHtml: null,
      primaryScss: null
    };

    try {
      if (!routeFiles || typeof routeFiles !== 'object') {
        return emptyResult;
      }

      return this.resolvePage(routeFiles.html, routeFiles.scss);
    } catch (e) {
      console.warn('[PageResolver] Warning: resolveRouteFiles failed:', e.message);
      return emptyResult;
    }
  }
}

/**
 * Create a page resolver for a project
 * NEVER throws - returns a resolver that works in naive mode on error
 * 
 * @param {string} projectDir - Angular project directory
 * @param {boolean} autoInit - Whether to initialize immediately (default: true)
 * @returns {PageResolver}
 */
function createPageResolver(projectDir, autoInit = true) {
  try {
    const resolver = new PageResolver(projectDir);
    if (autoInit) {
      resolver.initialize();
    }
    return resolver;
  } catch (e) {
    console.warn('[PageResolver] Warning: createPageResolver failed:', e.message);
    // Return a stub that works in naive mode
    return new PageResolver(projectDir);
  }
}

module.exports = {
  PageResolver,
  createPageResolver
};
