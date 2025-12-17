#!/usr/bin/env node
/**
 * mat-a11y GUI Server
 *
 * Web-based accessibility dashboard for testers and management.
 * Uses only Node.js built-in modules (no external dependencies).
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const os = require('os');
const { exec } = require('child_process');

// Temp directory for preview files
const TEMP_DIR = path.join(os.tmpdir(), 'mat-a11y-previews');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Clean up old preview files (older than 1 hour)
function cleanupOldPreviews() {
  try {
    const files = fs.readdirSync(TEMP_DIR);
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    for (const file of files) {
      const filepath = path.join(TEMP_DIR, file);
      const stat = fs.statSync(filepath);
      if (stat.mtimeMs < oneHourAgo) {
        fs.unlinkSync(filepath);
      }
    }
  } catch (err) {
    // Ignore cleanup errors
  }
}

// Import mat-a11y core
const { analyzeByComponent } = require('../src/core/componentAnalyzer');
const { analyzeBySitemap } = require('../src/core/sitemapAnalyzer');
const { analyze } = require('../src/index');
const { loadAllChecks } = require('../src/core/loader');
const { loadAllFormatters } = require('../src/formatters/index');
const { TIERS, DEFAULT_CONFIG } = require('../src/index');
const { optimizeIssues } = require('../src/core/issueOptimizer');

const DEFAULT_PORT = 3847;
const PUBLIC_DIR = path.join(__dirname, 'public');

// MIME types
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

/**
 * Plain-language descriptions for checks (non-technical users)
 */
const PLAIN_LANGUAGE = {
  buttonNames: {
    title: 'Buttons without labels',
    description: 'Some buttons have no text that screen readers can announce. Users with visual impairments won\'t know what these buttons do.',
    fix: 'Add descriptive text inside buttons, or add an aria-label attribute.',
    impact: 'critical'
  },
  linkNames: {
    title: 'Links without clear text',
    description: 'Some links don\'t describe where they lead. "Click here" or icon-only links are confusing for screen reader users.',
    fix: 'Use descriptive link text like "View pricing" instead of "Click here".',
    impact: 'critical'
  },
  imageAlt: {
    title: 'Images missing descriptions',
    description: 'Some images have no alternative text. People who can\'t see images won\'t know what they show.',
    fix: 'Add alt text describing the image, or use alt="" for decorative images.',
    impact: 'critical'
  },
  formLabels: {
    title: 'Form fields without labels',
    description: 'Some input fields have no labels. Users won\'t know what information to enter.',
    fix: 'Add a visible label for each form field.',
    impact: 'critical'
  },
  matFormFieldLabel: {
    title: 'Material form fields need labels',
    description: 'Some Material Design form fields are missing labels or placeholders.',
    fix: 'Add a mat-label inside each mat-form-field.',
    impact: 'high'
  },
  colorContrast: {
    title: 'Text hard to read (low contrast)',
    description: 'Some text doesn\'t stand out enough from its background. People with low vision may struggle to read it.',
    fix: 'Use darker text on light backgrounds, or lighter text on dark backgrounds. Aim for 4.5:1 contrast ratio.',
    impact: 'high'
  },
  focusStyles: {
    title: 'No visible keyboard focus',
    description: 'When using Tab to navigate, some elements don\'t show they\'re focused. Keyboard users get lost.',
    fix: 'Add visible focus styles (outline, border change, or highlight) to all interactive elements.',
    impact: 'high'
  },
  clickWithoutKeyboard: {
    title: 'Mouse-only interactions',
    description: 'Some actions only work with a mouse click. Keyboard users can\'t activate them.',
    fix: 'Add keyboard support (Enter/Space keys) alongside mouse clicks.',
    impact: 'critical'
  },
  headingOrder: {
    title: 'Heading levels skip numbers',
    description: 'Headings jump from H1 to H3, skipping H2. This confuses screen reader users navigating by headings.',
    fix: 'Use headings in order: H1, then H2, then H3, and so on.',
    impact: 'medium'
  },
  ariaRoles: {
    title: 'Invalid accessibility roles',
    description: 'Some elements have ARIA roles that don\'t exist or are misused.',
    fix: 'Use valid ARIA roles or remove incorrect ones.',
    impact: 'high'
  },
  ariaAttributes: {
    title: 'Invalid ARIA attributes',
    description: 'Some accessibility attributes are misspelled or have wrong values.',
    fix: 'Check ARIA attribute names and values are correct.',
    impact: 'high'
  },
  matDialogFocus: {
    title: 'Dialog focus problems',
    description: 'When popups open, keyboard focus can escape to the background. Users get confused.',
    fix: 'Ensure dialogs trap focus and return it when closed.',
    impact: 'high'
  },
  matIconAccessibility: {
    title: 'Icons without meaning',
    description: 'Icon buttons have no text alternative. Screen reader users hear nothing or meaningless text.',
    fix: 'Add aria-label to icon buttons describing their action.',
    impact: 'high'
  },
  touchTargets: {
    title: 'Touch targets too small',
    description: 'Some buttons and links are smaller than 44x44 pixels. Hard to tap on mobile devices.',
    fix: 'Make clickable areas at least 44x44 pixels.',
    impact: 'medium'
  },
  uniqueIds: {
    title: 'Duplicate element IDs',
    description: 'Multiple elements share the same ID. This breaks accessibility features and form labels.',
    fix: 'Give each element a unique ID.',
    impact: 'high'
  },
  tabindex: {
    title: 'Incorrect tab order',
    description: 'Some elements have tabindex values that disrupt natural keyboard navigation.',
    fix: 'Avoid positive tabindex values. Use 0 or -1 only.',
    impact: 'medium'
  },
  matSelectPlaceholder: {
    title: 'Dropdowns without labels',
    description: 'Some dropdown menus have no accessible label.',
    fix: 'Add a mat-label or aria-label to mat-select elements.',
    impact: 'high'
  },
  matCheckboxLabel: {
    title: 'Checkboxes without labels',
    description: 'Some checkboxes have no text describing what they control.',
    fix: 'Add text content inside mat-checkbox elements.',
    impact: 'high'
  },
  matRadioGroupLabel: {
    title: 'Radio buttons without group label',
    description: 'Groups of radio buttons have no label describing the choice.',
    fix: 'Add aria-label to mat-radio-group.',
    impact: 'high'
  },
  iframeTitles: {
    title: 'Embedded content without titles',
    description: 'Iframes (embedded content) have no title. Screen readers can\'t describe them.',
    fix: 'Add a title attribute to all iframes.',
    impact: 'medium'
  },
  skipLink: {
    title: 'No skip navigation link',
    description: 'Users can\'t skip past the navigation to reach main content quickly.',
    fix: 'Add a "Skip to content" link at the top of the page.',
    impact: 'medium'
  },
  prefersReducedMotion: {
    title: 'Animations ignore user preferences',
    description: 'Animations play even when users have requested reduced motion in their system settings.',
    fix: 'Use @media (prefers-reduced-motion) to disable or reduce animations.',
    impact: 'medium'
  }
};

function getPlainLanguage(checkName) {
  return PLAIN_LANGUAGE[checkName] || {
    title: checkName.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim(),
    description: 'An accessibility issue was detected.',
    fix: 'Review the technical details and apply the recommended fix.',
    impact: 'medium'
  };
}

function getAllChecks() {
  const registry = loadAllChecks();
  const checks = [];
  for (const [name, mod] of registry) {
    const plain = getPlainLanguage(name);
    // Determine category based on check type or name
    let category = 'General';
    if (name.startsWith('mat') || name.includes('Material')) {
      category = 'Angular Material';
    } else if (name.includes('cdk') || name.includes('Cdk')) {
      category = 'Angular CDK';
    } else if (mod.type === 'scss') {
      category = 'SCSS/Styling';
    } else if (name.includes('color') || name.includes('contrast') || name.includes('focus')) {
      category = 'Visual';
    } else if (name.includes('aria') || name.includes('role')) {
      category = 'ARIA';
    } else if (name.includes('form') || name.includes('label') || name.includes('input')) {
      category = 'Forms';
    } else if (name.includes('button') || name.includes('link') || name.includes('click')) {
      category = 'Interactive';
    }

    checks.push({
      id: name,
      name: plain.title || name,
      category,
      technicalDescription: mod.description,
      tier: mod.tier || 'full',
      type: mod.type || 'html',
      weight: mod.weight || 5,
      ...plain
    });
  }
  return checks;
}

function getTierInfo() {
  const count = (tier) => Object.values(tier).reduce((sum, arr) => sum + arr.length, 0);
  return {
    basic: { id: 'basic', name: 'Quick Scan', description: 'Essential checks for common issues. Fast and recommended for regular testing.', checkCount: count(TIERS.basic), recommended: true },
    material: { id: 'material', name: 'Material Components', description: 'Checks specific to Angular Material components.', checkCount: TIERS.material.material.length, recommended: false },
    angular: { id: 'angular', name: 'Angular Templates', description: 'Angular-specific accessibility patterns.', checkCount: TIERS.angular.angular.length + TIERS.angular.cdk.length, recommended: false },
    full: { id: 'full', name: 'Complete Audit', description: 'All 82 checks for a thorough accessibility review.', checkCount: count(TIERS.full), recommended: false }
  };
}

async function runScan(targetPath, options = {}) {
  const tier = options.tier || 'full';
  const ignore = [...DEFAULT_CONFIG.ignore, ...(options.ignore || [])];
  const analysisMode = options.analysisMode || 'component';

  // Build scan options
  const scanOptions = {
    tier,
    ignore,
    // Worker mode for parallel processing
    workers: options.workers === 'auto' ? 'auto' : (parseInt(options.workers) || undefined),
    // Single check mode
    singleCheck: options.singleCheck || undefined,
    // Deep resolve for sitemap mode
    deep: options.deep || false
  };

  try {
    let results;

    // Choose analysis strategy based on mode
    switch (analysisMode) {
      case 'sitemap':
        results = await analyzeBySitemap(targetPath, scanOptions);
        break;

      case 'file-based':
        // File-based uses the generic analyze function
        results = analyze(targetPath, scanOptions);
        break;

      case 'component':
      default:
        results = analyzeByComponent(targetPath, scanOptions);
        break;
    }

    if (results.error) return { error: results.error };

    // Apply SCSS root cause collapse unless disabled
    const collapseEnabled = !options.noCollapse;
    const optimized = optimizeIssues(results, targetPath, { enabled: collapseEnabled });
    return enhanceResults(optimized);
  } catch (err) {
    return { error: err.message };
  }
}

function enhanceResults(results) {
  if (!results.components) return results;

  const issuesByCheck = new Map();
  for (const comp of results.components) {
    for (const issue of (comp.issues || [])) {
      const check = issue.check || 'unknown';
      if (!issuesByCheck.has(check)) {
        issuesByCheck.set(check, { check, count: 0, components: new Set(), ...getPlainLanguage(check) });
      }
      const entry = issuesByCheck.get(check);
      entry.count++;
      entry.components.add(comp.name || comp.label);
    }
  }

  const issueSummary = Array.from(issuesByCheck.values())
    .map(e => ({ ...e, components: Array.from(e.components) }))
    .sort((a, b) => {
      const impactOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const impactDiff = (impactOrder[a.impact] || 2) - (impactOrder[b.impact] || 2);
      return impactDiff !== 0 ? impactDiff : b.count - a.count;
    });

  return { ...results, issueSummary };
}

function serveStatic(req, res) {
  let filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(err.code === 'ENOENT' ? 404 : 500);
      res.end(err.code === 'ENOENT' ? 'Not found' : 'Server error');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(content);
  });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

async function handleAPI(req, res, pathname) {
  res.setHeader('Content-Type', 'application/json');

  try {
    if (pathname === '/api/checks' && req.method === 'GET') {
      res.end(JSON.stringify({ checks: getAllChecks() }));
      return;
    }

    if (pathname === '/api/tiers' && req.method === 'GET') {
      res.end(JSON.stringify({ tiers: getTierInfo() }));
      return;
    }

    if (pathname === '/api/scan' && req.method === 'POST') {
      const body = await parseBody(req);
      const results = await runScan(body.path || process.cwd(), body);
      res.end(JSON.stringify(results));
      return;
    }

    if (pathname === '/api/formatters' && req.method === 'GET') {
      const formatters = loadAllFormatters();
      const list = [];
      for (const [name, f] of formatters) {
        list.push({ name, description: f.description, category: f.category, fileExtension: f.fileExtension });
      }
      res.end(JSON.stringify({ formatters: list }));
      return;
    }

    if (pathname === '/api/export' && req.method === 'POST') {
      const body = await parseBody(req);
      const formatters = loadAllFormatters();
      const formatter = formatters.get(body.format);
      if (!formatter) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: `Unknown format: ${body.format}` }));
        return;
      }
      const output = formatter.format(body.results);
      res.end(JSON.stringify({
        content: output,
        filename: `mat-a11y-report${formatter.fileExtension || '.txt'}`,
        mimeType: formatter.mimeType || 'text/plain'
      }));
      return;
    }

    if (pathname === '/api/cwd' && req.method === 'GET') {
      res.end(JSON.stringify({ cwd: process.cwd() }));
      return;
    }

    // Save HTML preview to temp file and return URL
    if (pathname === '/api/preview' && req.method === 'POST') {
      const body = await parseBody(req);
      const { content, format } = body;

      if (!content || format !== 'html') {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Only HTML preview is supported' }));
        return;
      }

      // Generate unique filename
      const filename = `preview-${Date.now()}.html`;
      const filepath = path.join(TEMP_DIR, filename);

      // Write HTML to temp file
      fs.writeFileSync(filepath, content, 'utf8');

      // Clean up old preview files (older than 1 hour)
      cleanupOldPreviews();

      res.end(JSON.stringify({ url: `/preview/${filename}` }));
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  } catch (err) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: err.message }));
  }
}

async function handleRequest(req, res) {
  const pathname = url.parse(req.url).pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (pathname.startsWith('/api/')) {
    return handleAPI(req, res, pathname);
  }

  // Serve preview files from temp directory
  if (pathname.startsWith('/preview/')) {
    const filename = pathname.replace('/preview/', '');
    // Security: only allow .html files with expected naming pattern
    if (!/^preview-\d+\.html$/.test(filename)) {
      res.writeHead(400);
      res.end('Invalid preview file');
      return;
    }
    const filepath = path.join(TEMP_DIR, filename);
    fs.readFile(filepath, (err, content) => {
      if (err) {
        res.writeHead(404);
        res.end('Preview not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(content);
    });
    return;
  }

  serveStatic(req, res);
}

function openBrowser(url) {
  const platform = process.platform;
  let cmd;
  if (platform === 'win32') cmd = `start "" "${url}"`;
  else if (platform === 'darwin') cmd = `open "${url}"`;
  else cmd = `xdg-open "${url}"`;

  exec(cmd, (err) => {
    if (err) console.log(`Open ${url} in your browser`);
  });
}

function start(options = {}) {
  const port = options.port || DEFAULT_PORT;
  const server = http.createServer(handleRequest);

  server.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log(`
  mat-a11y Accessibility Dashboard
  ================================

  Dashboard: ${url}

  Press Ctrl+C to stop
`);
    if (options.open !== false) {
      openBrowser(url);
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} in use, trying ${port + 1}...`);
      start({ ...options, port: port + 1 });
    } else {
      console.error('Server error:', err.message);
    }
  });

  return server;
}

if (require.main === module) {
  start();
}

module.exports = { start, runScan, getAllChecks, getTierInfo, getPlainLanguage };
