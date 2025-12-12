'use strict';

/**
 * Angular Route Parser
 *
 * Parses Angular routing files to extract route definitions.
 * Supports both NgModule and standalone routing styles.
 *
 * Handles:
 * - NgModule routing (RouterModule.forRoot/forChild)
 * - Standalone routing (provideRouter, app.routes.ts)
 * - Lazy loading (loadChildren, loadComponent)
 * - Nested children routes
 * - Route parameters (:id, :slug)
 */

const fs = require('fs');
const path = require('path');

/**
 * Find all routing files in a directory
 * @param {string} dir - Directory to search
 * @returns {string[]} Array of routing file paths
 */
function findRoutingFiles(dir) {
  const routingFiles = [];

  const patterns = [
    /app\.routes\.ts$/,
    /app-routing\.module\.ts$/,
    /-routing\.module\.ts$/,
    /\.routes\.ts$/
  ];

  function walk(currentDir) {
    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (e) {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      // Skip node_modules, dist, etc.
      if (entry.isDirectory()) {
        if (['node_modules', 'dist', '.git', '.angular', 'coverage'].includes(entry.name)) {
          continue;
        }
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        for (const pattern of patterns) {
          if (pattern.test(entry.name)) {
            routingFiles.push(fullPath);
            break;
          }
        }
      }
    }
  }

  walk(dir);
  return routingFiles;
}

/**
 * Parse a single routing file
 * @param {string} filePath - Path to routing file
 * @returns {object} Parsed routing data { routes: [], imports: {} }
 */
function parseRoutingFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const dirPath = path.dirname(filePath);

  // Extract imports for component resolution
  const imports = parseImports(content);

  // Find routes array
  const routes = parseRoutes(content, dirPath);

  return {
    filePath,
    dirPath,
    imports,
    routes
  };
}

/**
 * Parse import statements from TypeScript file
 * @param {string} content - File content
 * @returns {object} Map of import name to path
 */
function parseImports(content) {
  const imports = {};

  // Match: import { Foo, Bar } from './path'
  // Match: import { Foo as Bar } from './path'
  const importRegex = /import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g;
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    const names = match[1].split(',').map(s => s.trim());
    const importPath = match[2];

    for (const name of names) {
      // Handle "Foo as Bar" syntax
      const aliasMatch = name.match(/(\w+)\s+as\s+(\w+)/);
      if (aliasMatch) {
        imports[aliasMatch[2]] = { original: aliasMatch[1], path: importPath };
      } else if (name) {
        imports[name] = { original: name, path: importPath };
      }
    }
  }

  return imports;
}

/**
 * Parse routes array from content
 * @param {string} content - File content
 * @param {string} dirPath - Directory of routing file
 * @returns {object[]} Array of route objects
 */
function parseRoutes(content, dirPath) {
  const routes = [];

  // Find the routes array - handles various patterns:
  // const routes: Routes = [...]
  // export const routes: Routes = [...]
  // export const appRoutes = [...]
  // const routes = [...]

  // First, try to find a Routes-typed array
  let routesMatch = content.match(/(?:export\s+)?const\s+\w+\s*:\s*Routes\s*=\s*\[/);

  if (!routesMatch) {
    // Try RouterModule.forRoot/forChild
    routesMatch = content.match(/RouterModule\.for(?:Root|Child)\s*\(\s*\[/);
  }

  if (!routesMatch) {
    return routes;
  }

  // Extract the routes array content
  const startIndex = routesMatch.index + routesMatch[0].length - 1;
  const routesContent = extractBalancedBrackets(content, startIndex);

  if (!routesContent) {
    return routes;
  }

  // Parse individual route objects
  const parsedRoutes = parseRouteObjects(routesContent, dirPath);

  return parsedRoutes;
}

/**
 * Extract content between balanced brackets
 * @param {string} content - Full content
 * @param {number} startIndex - Index of opening bracket
 * @returns {string|null} Content between brackets
 */
function extractBalancedBrackets(content, startIndex) {
  if (content[startIndex] !== '[') {
    return null;
  }

  let depth = 0;
  let i = startIndex;

  while (i < content.length) {
    if (content[i] === '[') depth++;
    if (content[i] === ']') depth--;
    if (depth === 0) {
      return content.substring(startIndex, i + 1);
    }
    i++;
  }

  return null;
}

/**
 * Parse route objects from routes array content
 * @param {string} routesContent - Content of routes array
 * @param {string} dirPath - Directory path for resolving imports
 * @returns {object[]} Array of route objects
 */
function parseRouteObjects(routesContent, dirPath) {
  const routes = [];

  // Track both array [] and object {} depths separately
  let arrayDepth = 0;
  let objectDepth = 0;
  let objectStart = -1;

  for (let i = 0; i < routesContent.length; i++) {
    const char = routesContent[i];

    if (char === '[') arrayDepth++;
    if (char === ']') arrayDepth--;

    if (char === '{') {
      // Start of a top-level route object (inside the routes array, not nested)
      if (arrayDepth === 1 && objectDepth === 0) {
        objectStart = i;
      }
      objectDepth++;
    }

    if (char === '}') {
      objectDepth--;
      // End of a top-level route object
      if (arrayDepth === 1 && objectDepth === 0 && objectStart !== -1) {
        const objectContent = routesContent.substring(objectStart, i + 1);
        const route = parseRouteObject(objectContent, dirPath);
        if (route) {
          routes.push(route);
        }
        objectStart = -1;
      }
    }
  }

  return routes;
}

/**
 * Parse a single route object
 * @param {string} objectContent - Content of route object
 * @param {string} dirPath - Directory path
 * @returns {object|null} Parsed route object
 */
function parseRouteObject(objectContent, dirPath) {
  const route = {
    path: null,
    component: null,
    loadComponent: null,
    loadChildren: null,
    children: [],
    data: null
  };

  // First, find and extract children array to avoid matching child properties
  let contentWithoutChildren = objectContent;
  const childrenMatch = objectContent.match(/children\s*:\s*\[/);
  if (childrenMatch) {
    const childrenStart = objectContent.indexOf('[', childrenMatch.index);
    const childrenContent = extractBalancedBrackets(objectContent, childrenStart);
    if (childrenContent) {
      route.children = parseRouteObjects(childrenContent, dirPath);
      // Remove children from content to avoid matching child loadComponents
      contentWithoutChildren = objectContent.substring(0, childrenMatch.index) +
        objectContent.substring(childrenStart + childrenContent.length);
    }
  }

  // Extract path (from original - path is always at top level)
  const pathMatch = objectContent.match(/path\s*:\s*['"]([^'"]*)['"]/);
  if (pathMatch) {
    route.path = pathMatch[1];
  } else {
    return null; // Path is required
  }

  // Extract component (NgModule style) - from content WITHOUT children
  const componentMatch = contentWithoutChildren.match(/component\s*:\s*(\w+)/);
  if (componentMatch) {
    route.component = componentMatch[1];
  }

  // Extract loadComponent (Standalone style) - from content WITHOUT children
  // Pattern: loadComponent: () => import('./path/file').then(m => m.ComponentName)
  const loadComponentMatch = contentWithoutChildren.match(
    /loadComponent\s*:\s*\(\)\s*=>\s*import\s*\(\s*['"]([^'"]+)['"]\s*\)\.then\s*\(\s*\w+\s*=>\s*\w+\.(\w+)\s*\)/
  );
  if (loadComponentMatch) {
    route.loadComponent = {
      importPath: loadComponentMatch[1],
      exportName: loadComponentMatch[2]
    };
  }

  // Extract loadChildren (Lazy loading) - from content WITHOUT children
  // Pattern: loadChildren: () => import('./path/module').then(m => m.ModuleName)
  const loadChildrenMatch = contentWithoutChildren.match(
    /loadChildren\s*:\s*\(\)\s*=>\s*import\s*\(\s*['"]([^'"]+)['"]\s*\)/
  );
  if (loadChildrenMatch) {
    route.loadChildren = loadChildrenMatch[1];
  }

  // Extract data - from content WITHOUT children
  const dataMatch = contentWithoutChildren.match(/data\s*:\s*\{[^}]+\}/);
  if (dataMatch) {
    route.data = dataMatch[0];
  }

  return route;
}

/**
 * Flatten nested routes into full paths
 * @param {object[]} routes - Array of parsed routes
 * @param {string} parentPath - Parent path prefix
 * @returns {object[]} Flattened routes with full paths
 */
function flattenRoutes(routes, parentPath = '') {
  const flattened = [];

  for (const route of routes) {
    const fullPath = parentPath
      ? (route.path ? `${parentPath}/${route.path}` : parentPath)
      : (route.path || '/');

    // Normalize path
    const normalizedPath = '/' + fullPath.replace(/^\/+/, '').replace(/\/+/g, '/');

    // Add this route if it has a component
    if (route.component || route.loadComponent) {
      flattened.push({
        path: normalizedPath,
        component: route.component,
        loadComponent: route.loadComponent,
        loadChildren: route.loadChildren,
        data: route.data
      });
    }

    // Recursively flatten children
    if (route.children && route.children.length > 0) {
      const childRoutes = flattenRoutes(route.children, normalizedPath);
      flattened.push(...childRoutes);
    }
  }

  return flattened;
}

/**
 * Parse all routes from an Angular project
 * @param {string} projectDir - Angular project directory
 * @returns {object} { routes: [], routingFiles: [] }
 */
function parseAngularRoutes(projectDir) {
  // Find all routing files
  const routingFiles = findRoutingFiles(projectDir);

  if (routingFiles.length === 0) {
    return { routes: [], routingFiles: [], error: 'No Angular routing files found' };
  }

  // Parse each routing file
  const allRoutes = [];
  const parsedFiles = [];

  for (const file of routingFiles) {
    try {
      const parsed = parseRoutingFile(file);
      parsedFiles.push({
        file,
        routeCount: parsed.routes.length
      });

      // Flatten and add routes
      const flattened = flattenRoutes(parsed.routes);

      // Add directory context for component resolution
      for (const route of flattened) {
        route._routingFileDir = parsed.dirPath;
        route._routingFile = file;
      }

      allRoutes.push(...flattened);
    } catch (e) {
      parsedFiles.push({
        file,
        error: e.message
      });
    }
  }

  // Deduplicate routes (same path + component)
  const uniqueRoutes = [];
  const seen = new Set();

  for (const route of allRoutes) {
    const key = route.path + '|' + (route.component || route.loadComponent?.exportName || '');
    if (!seen.has(key)) {
      seen.add(key);
      uniqueRoutes.push(route);
    }
  }

  return {
    routes: uniqueRoutes,
    routingFiles: parsedFiles
  };
}

module.exports = {
  findRoutingFiles,
  parseRoutingFile,
  parseAngularRoutes,
  flattenRoutes
};
