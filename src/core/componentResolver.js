'use strict';

/**
 * Angular Component Resolver
 *
 * Resolves Angular component names/paths to their actual file paths.
 * Handles various Angular naming conventions and file structures.
 */

const fs = require('fs');
const path = require('path');

/**
 * Resolve component files from a route's loadComponent
 * @param {object} route - Route object with loadComponent
 * @param {string} baseDir - Base directory of the Angular project
 * @returns {object} { html: string|null, scss: string|null, folder: string|null }
 */
function resolveComponentFiles(route, baseDir) {
  const result = {
    html: null,
    scss: null,
    folder: null,
    component: null
  };

  if (!route.loadComponent && !route.component) {
    return result;
  }

  // Get the import path from loadComponent or try to resolve from component name
  let importPath = null;
  let componentName = null;

  if (route.loadComponent) {
    importPath = route.loadComponent.importPath;
    componentName = route.loadComponent.exportName;
  } else if (route.component) {
    componentName = route.component;
    // Try to resolve from imports in routing file (would need to pass imports)
  }

  result.component = componentName;

  if (!importPath) {
    return result;
  }

  // Resolve the import path relative to the routing file directory
  const routingDir = route._routingFileDir || baseDir;
  let componentDir;

  if (importPath.startsWith('./') || importPath.startsWith('../')) {
    componentDir = path.resolve(routingDir, importPath);
  } else {
    // Absolute or aliased import - try from baseDir
    componentDir = path.resolve(baseDir, importPath);
  }

  // Normalize path separators
  componentDir = componentDir.replace(/\\/g, '/');

  // The import path usually points to the component file without extension
  // Try various naming conventions

  // Try to find the component folder and files
  const possibleFiles = findComponentFiles(componentDir);

  result.html = possibleFiles.html;
  result.scss = possibleFiles.scss;
  result.folder = possibleFiles.folder;

  return result;
}

/**
 * Find component files given a base path
 * Handles various Angular naming conventions
 * @param {string} basePath - Base path from import (without extension)
 * @returns {object} { html: string|null, scss: string|null, folder: string|null }
 */
function findComponentFiles(basePath) {
  const result = { html: null, scss: null, folder: null };

  // Patterns to try for finding component files
  // Import './pages/landing/landing' could mean:
  // - landing.component.html (Angular CLI convention)
  // - landing.html (shorter convention)
  // - landing-page.component.html (different naming)

  const baseDir = path.dirname(basePath);
  const baseName = path.basename(basePath);

  // Try: the directory exists and contains component files
  const possibleDirs = [
    basePath,  // Import path might be a directory
    baseDir    // Or parent directory
  ];

  for (const dir of possibleDirs) {
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
      const files = fs.readdirSync(dir);

      // Look for HTML files
      const htmlPatterns = [
        `${baseName}.component.html`,
        `${baseName}.html`,
        `${baseName}-page.component.html`,
        `${baseName}-page.html`
      ];

      for (const pattern of htmlPatterns) {
        if (files.includes(pattern)) {
          result.html = path.join(dir, pattern).replace(/\\/g, '/');
          break;
        }
      }

      // Also check if any .html file exists in directory
      if (!result.html) {
        const htmlFile = files.find(f => f.endsWith('.html'));
        if (htmlFile) {
          result.html = path.join(dir, htmlFile).replace(/\\/g, '/');
        }
      }

      // Look for SCSS/CSS files
      const scssPatterns = [
        `${baseName}.component.scss`,
        `${baseName}.scss`,
        `${baseName}.component.css`,
        `${baseName}.css`,
        `${baseName}-page.component.scss`,
        `${baseName}-page.scss`
      ];

      for (const pattern of scssPatterns) {
        if (files.includes(pattern)) {
          result.scss = path.join(dir, pattern).replace(/\\/g, '/');
          break;
        }
      }

      // Also check for any .scss or .css file
      if (!result.scss) {
        const scssFile = files.find(f => f.endsWith('.scss') || f.endsWith('.css'));
        if (scssFile) {
          result.scss = path.join(dir, scssFile).replace(/\\/g, '/');
        }
      }

      if (result.html || result.scss) {
        result.folder = dir.replace(/\\/g, '/');
        break;
      }
    }
  }

  // If nothing found, try direct file path variations
  if (!result.html) {
    const directHtmlPaths = [
      `${basePath}.component.html`,
      `${basePath}.html`
    ];
    for (const p of directHtmlPaths) {
      if (fs.existsSync(p)) {
        result.html = p.replace(/\\/g, '/');
        result.folder = path.dirname(p).replace(/\\/g, '/');
        break;
      }
    }
  }

  if (!result.scss) {
    const directScssPaths = [
      `${basePath}.component.scss`,
      `${basePath}.scss`,
      `${basePath}.component.css`,
      `${basePath}.css`
    ];
    for (const p of directScssPaths) {
      if (fs.existsSync(p)) {
        result.scss = p.replace(/\\/g, '/');
        if (!result.folder) {
          result.folder = path.dirname(p).replace(/\\/g, '/');
        }
        break;
      }
    }
  }

  return result;
}

/**
 * Resolve all routes to their component files
 * @param {object[]} routes - Array of parsed routes
 * @param {string} baseDir - Angular project base directory
 * @returns {object[]} Routes with resolved file paths
 */
function resolveAllRoutes(routes, baseDir) {
  return routes.map(route => {
    const files = resolveComponentFiles(route, baseDir);
    return {
      ...route,
      files: {
        html: files.html,
        scss: files.scss,
        folder: files.folder
      }
    };
  }).filter(route => route.files.html || route.files.scss);
}

/**
 * Group routes by their resolved folder (for aggregation)
 * @param {object[]} resolvedRoutes - Routes with resolved files
 * @returns {Map<string, object[]>} Map of folder -> routes
 */
function groupRoutesByFolder(resolvedRoutes) {
  const groups = new Map();

  for (const route of resolvedRoutes) {
    const folder = route.files.folder || 'unknown';
    if (!groups.has(folder)) {
      groups.set(folder, []);
    }
    groups.get(folder).push(route);
  }

  return groups;
}

module.exports = {
  resolveComponentFiles,
  findComponentFiles,
  resolveAllRoutes,
  groupRoutesByFolder
};
