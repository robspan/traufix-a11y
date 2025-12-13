'use strict';

/**
 * Angular Component Registry
 * 
 * Builds a registry of all Angular components in a project by scanning
 * .ts files for @Component decorators. This enables resolving custom
 * element selectors (like <app-header>) to their template/style files.
 * 
 * ERROR HANDLING: This module is designed to be maximally error-tolerant.
 * All functions return empty/default values on error rather than throwing.
 * It should NEVER crash the analysis - just degrade gracefully.
 */

const fs = require('fs');
const path = require('path');

/**
 * Safely check if a path exists
 * @param {string} p - Path to check
 * @returns {boolean}
 */
function safeExists(p) {
  try {
    return p && typeof p === 'string' && fs.existsSync(p);
  } catch (e) {
    return false;
  }
}

/**
 * Safely read a file
 * @param {string} p - Path to read
 * @returns {string|null}
 */
function safeReadFile(p) {
  try {
    if (!safeExists(p)) return null;
    return fs.readFileSync(p, 'utf-8');
  } catch (e) {
    return null;
  }
}

/**
 * Build a component registry from all .ts files in a project
 * NEVER throws - returns empty Map on any error
 * 
 * @param {string} projectDir - Project directory
 * @returns {Map<string, object>} Map of selector -> { selector, templateUrl, styleUrls, filePath, componentDir }
 */
function buildComponentRegistry(projectDir) {
  const registry = new Map();
  
  try {
    if (!projectDir || typeof projectDir !== 'string') {
      return registry;
    }
    
    const srcDir = path.join(projectDir, 'src');
    
    if (!safeExists(srcDir)) {
      return registry;
    }

    scanDirectory(srcDir, registry);
  } catch (e) {
    console.warn('[ComponentRegistry] Warning: buildComponentRegistry failed:', e.message);
  }
  
  return registry;
}

/**
 * Recursively scan directory for .ts files
 * NEVER throws - silently skips problematic directories/files
 */
function scanDirectory(dir, registry) {
  let entries;
  try {
    if (!dir || typeof dir !== 'string') return;
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return;
  }

  if (!Array.isArray(entries)) return;

  for (const entry of entries) {
    try {
      if (!entry || !entry.name) continue;
      
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory && entry.isDirectory()) {
        // Skip common non-source directories
        if (['node_modules', 'dist', '.git', '.angular', 'e2e', 'coverage'].includes(entry.name)) {
          continue;
        }
        scanDirectory(fullPath, registry);
      } else if (entry.isFile && entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
        parseComponentFile(fullPath, registry);
      }
    } catch (e) {
      // Skip this entry on error, continue with others
      continue;
    }
  }
}

/**
 * Parse a TypeScript file for @Component decorator
 * NEVER throws - silently skips problematic files
 */
function parseComponentFile(filePath, registry) {
  try {
    const content = safeReadFile(filePath);
    if (!content) return;

    // Quick check - skip files without @Component
    if (!content.includes('@Component')) {
      return;
    }

    // Match @Component decorator with its configuration
    // Handles both single-line and multi-line decorators
    const componentRegex = /@Component\s*\(\s*\{([\s\S]*?)\}\s*\)/g;
    
    let match;
    while ((match = componentRegex.exec(content)) !== null) {
      try {
        const decoratorContent = match[1];
        const componentInfo = parseDecoratorContent(decoratorContent, filePath);
        
        if (componentInfo && componentInfo.selector && typeof componentInfo.selector === 'string') {
          registry.set(componentInfo.selector, componentInfo);
        }
      } catch (e) {
        // Skip this component on error, continue with others
        continue;
      }
    }
  } catch (e) {
    // File parsing failed entirely - skip
    return;
  }
}

/**
 * Parse @Component decorator content to extract metadata
 * NEVER throws - returns partial info on parse errors
 */
function parseDecoratorContent(content, filePath) {
  const info = {
    filePath,
    componentDir: null,
    selector: null,
    templateUrl: null,
    template: null,
    styleUrls: [],
    styles: null
  };

  try {
    info.componentDir = path.dirname(filePath);
  } catch (e) {
    return info;
  }

  try {
    // Extract selector
    const selectorMatch = content.match(/selector\s*:\s*['"`]([^'"`]+)['"`]/);
    if (selectorMatch && selectorMatch[1]) {
      info.selector = selectorMatch[1];
    }
  } catch (e) {
    // Continue without selector
  }

  try {
    // Extract templateUrl
    const templateUrlMatch = content.match(/templateUrl\s*:\s*['"`]([^'"`]+)['"`]/);
    if (templateUrlMatch && templateUrlMatch[1]) {
      info.templateUrl = resolveRelativePath(templateUrlMatch[1], info.componentDir);
    }
  } catch (e) {
    // Continue without templateUrl
  }

  try {
    // Extract inline template (for components without templateUrl)
    if (!info.templateUrl) {
      const templateMatch = content.match(/template\s*:\s*`([\s\S]*?)`/);
      if (templateMatch && templateMatch[1]) {
        info.template = templateMatch[1];
      }
    }
  } catch (e) {
    // Continue without inline template
  }

  try {
    // Extract styleUrls (array)
    const styleUrlsMatch = content.match(/styleUrls\s*:\s*\[([\s\S]*?)\]/);
    if (styleUrlsMatch && styleUrlsMatch[1]) {
      const urlsContent = styleUrlsMatch[1];
      const urlRegex = /['"`]([^'"`]+)['"`]/g;
      let urlMatch;
      while ((urlMatch = urlRegex.exec(urlsContent)) !== null) {
        if (urlMatch[1]) {
          const resolved = resolveRelativePath(urlMatch[1], info.componentDir);
          if (resolved) info.styleUrls.push(resolved);
        }
      }
    }
  } catch (e) {
    // Continue without styleUrls
  }

  try {
    // Extract single styleUrl (Angular 17+ can use styleUrl singular)
    const styleUrlMatch = content.match(/styleUrl\s*:\s*['"`]([^'"`]+)['"`]/);
    if (styleUrlMatch && styleUrlMatch[1]) {
      const resolved = resolveRelativePath(styleUrlMatch[1], info.componentDir);
      if (resolved) info.styleUrls.push(resolved);
    }
  } catch (e) {
    // Continue without styleUrl
  }

  return info;
}

/**
 * Resolve a relative path from component directory
 * NEVER throws - returns null on error
 */
function resolveRelativePath(relativePath, componentDir) {
  try {
    if (!relativePath || typeof relativePath !== 'string') return null;
    if (!componentDir || typeof componentDir !== 'string') return null;
    
    if (relativePath.startsWith('./') || relativePath.startsWith('../')) {
      return path.resolve(componentDir, relativePath).replace(/\\/g, '/');
    }
    return path.join(componentDir, relativePath).replace(/\\/g, '/');
  } catch (e) {
    return null;
  }
}

/**
 * Find all component selectors used in HTML content
 * NEVER throws - returns empty array on error
 * 
 * @param {string} htmlContent - HTML template content
 * @returns {string[]} Array of component selectors found
 */
function findComponentSelectorsInHtml(htmlContent) {
  const selectors = new Set();
  
  try {
    if (!htmlContent || typeof htmlContent !== 'string') {
      return [];
    }
    
    // Match custom element tags (app-*, mat-*, cdk-*, etc.)
    // Also matches any tag with a hyphen (Web Components convention)
    const tagRegex = /<([a-z][a-z0-9]*-[a-z0-9-]+)[\s>\/]/gi;
    
    let match;
    while ((match = tagRegex.exec(htmlContent)) !== null) {
      try {
        const tag = match[1].toLowerCase();
        // Skip known HTML elements and Angular structural elements
        if (!isKnownHtmlElement(tag)) {
          selectors.add(tag);
        }
      } catch (e) {
        // Skip this match on error
        continue;
      }
    }
  } catch (e) {
    // Return empty array on any error
    return [];
  }

  return Array.from(selectors);
}

/**
 * Check if a tag is a known HTML element (not a component)
 */
function isKnownHtmlElement(tag) {
  const knownElements = new Set([
    // Standard HTML elements with hyphens
    'annotation-xml', 'color-profile', 'font-face', 'font-face-src',
    'font-face-uri', 'font-face-format', 'font-face-name', 'missing-glyph',
    // SVG elements
    'linear-gradient', 'radial-gradient', 'clip-path', 'color-interpolation',
    'color-rendering', 'flood-color', 'flood-opacity', 'font-family',
    'font-size', 'font-style', 'font-variant', 'font-weight',
    // Angular structural (ng-container, ng-template, ng-content)
    'ng-container', 'ng-template', 'ng-content'
  ]);
  return knownElements.has(tag);
}

/**
 * Recursively resolve all component files for a page
 * NEVER throws - returns partial/empty result on errors
 * 
 * @param {string} htmlPath - Path to the page's HTML template
 * @param {Map} registry - Component registry
 * @param {Set} visited - Set of already visited selectors (to prevent cycles)
 * @returns {object} { htmlFiles: string[], scssFiles: string[], components: string[] }
 */
function resolvePageComponents(htmlPath, registry, visited = new Set()) {
  const result = {
    htmlFiles: [],
    scssFiles: [],
    components: [],
    inlineTemplates: []
  };

  try {
    // Validate inputs
    if (!htmlPath || typeof htmlPath !== 'string') {
      return result;
    }
    
    if (!registry || !(registry instanceof Map)) {
      return result;
    }

    if (!safeExists(htmlPath)) {
      return result;
    }

    result.htmlFiles.push(htmlPath);

    const htmlContent = safeReadFile(htmlPath);
    if (!htmlContent) {
      return result;
    }

    // Find all component selectors in this template
    const selectors = findComponentSelectorsInHtml(htmlContent);
    if (!Array.isArray(selectors)) {
      return result;
    }

    for (const selector of selectors) {
      try {
        // Skip if already visited (prevent infinite loops)
        if (!selector || typeof selector !== 'string') continue;
        if (visited.has(selector)) continue;
        visited.add(selector);

        const componentInfo = registry.get(selector);
        if (!componentInfo) {
          // Component not found in registry - might be from a library
          continue;
        }

        result.components.push(selector);

        // Add this component's template
        if (componentInfo.templateUrl && safeExists(componentInfo.templateUrl)) {
          // Recursively resolve this component's children
          try {
            const childResult = resolvePageComponents(componentInfo.templateUrl, registry, visited);
            if (childResult) {
              if (Array.isArray(childResult.htmlFiles)) result.htmlFiles.push(...childResult.htmlFiles);
              if (Array.isArray(childResult.scssFiles)) result.scssFiles.push(...childResult.scssFiles);
              if (Array.isArray(childResult.components)) result.components.push(...childResult.components);
              if (Array.isArray(childResult.inlineTemplates)) result.inlineTemplates.push(...childResult.inlineTemplates);
            }
          } catch (e) {
            // Child resolution failed - continue with other components
          }
        } else if (componentInfo.template && typeof componentInfo.template === 'string') {
          // Inline template - store it for analysis
          result.inlineTemplates.push({
            selector,
            template: componentInfo.template
          });
          
          // Also check inline template for nested components
          try {
            const nestedSelectors = findComponentSelectorsInHtml(componentInfo.template);
            if (Array.isArray(nestedSelectors)) {
              for (const nested of nestedSelectors) {
                try {
                  if (!nested || typeof nested !== 'string') continue;
                  if (visited.has(nested)) continue;
                  visited.add(nested);
                  
                  const nestedInfo = registry.get(nested);
                  if (nestedInfo) {
                    result.components.push(nested);
                    if (nestedInfo.templateUrl && safeExists(nestedInfo.templateUrl)) {
                      const nestedResult = resolvePageComponents(nestedInfo.templateUrl, registry, visited);
                      if (nestedResult) {
                        if (Array.isArray(nestedResult.htmlFiles)) result.htmlFiles.push(...nestedResult.htmlFiles);
                        if (Array.isArray(nestedResult.scssFiles)) result.scssFiles.push(...nestedResult.scssFiles);
                        if (Array.isArray(nestedResult.components)) result.components.push(...nestedResult.components);
                        if (Array.isArray(nestedResult.inlineTemplates)) result.inlineTemplates.push(...nestedResult.inlineTemplates);
                      }
                    }
                    if (Array.isArray(nestedInfo.styleUrls)) {
                      for (const styleUrl of nestedInfo.styleUrls) {
                        if (styleUrl && safeExists(styleUrl)) {
                          result.scssFiles.push(styleUrl);
                        }
                      }
                    }
                  }
                } catch (e) {
                  // Nested resolution failed - continue
                  continue;
                }
              }
            }
          } catch (e) {
            // Inline template parsing failed - continue
          }
        }

        // Add this component's styles
        if (Array.isArray(componentInfo.styleUrls)) {
          for (const styleUrl of componentInfo.styleUrls) {
            try {
              if (styleUrl && safeExists(styleUrl)) {
                result.scssFiles.push(styleUrl);
              }
            } catch (e) {
              // Style file check failed - continue
              continue;
            }
          }
        }
      } catch (e) {
        // Component resolution failed - continue with others
        continue;
      }
    }

    // Deduplicate - wrap in try-catch for safety
    try {
      result.htmlFiles = [...new Set(result.htmlFiles)];
      result.scssFiles = [...new Set(result.scssFiles)];
      result.components = [...new Set(result.components)];
    } catch (e) {
      // Deduplication failed - return as-is
    }
  } catch (e) {
    console.warn('[ComponentRegistry] Warning: resolvePageComponents failed:', e.message);
  }

  return result;
}

/**
 * Get registry statistics
 * NEVER throws - returns zero stats on error
 */
function getRegistryStats(registry) {
  const defaultStats = {
    total: 0,
    withTemplate: 0,
    withInlineTemplate: 0,
    withStyles: 0
  };

  try {
    if (!registry || !(registry instanceof Map)) {
      return defaultStats;
    }

    let withTemplate = 0;
    let withInlineTemplate = 0;
    let withStyles = 0;

    for (const [, info] of registry) {
      try {
        if (info && info.templateUrl) withTemplate++;
        if (info && info.template) withInlineTemplate++;
        if (info && Array.isArray(info.styleUrls) && info.styleUrls.length > 0) withStyles++;
      } catch (e) {
        // Skip this entry on error
        continue;
      }
    }

    return {
      total: registry.size || 0,
      withTemplate,
      withInlineTemplate,
      withStyles
    };
  } catch (e) {
    return defaultStats;
  }
}

module.exports = {
  buildComponentRegistry,
  findComponentSelectorsInHtml,
  resolvePageComponents,
  getRegistryStats
};
