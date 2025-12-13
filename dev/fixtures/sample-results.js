/**
 * Sample Analysis Results - Comprehensive Test Fixtures
 *
 * These fixtures test all edge cases formatters must handle.
 * Used by formatter verification to ensure robust output.
 */

'use strict';

// ============================================
// STANDARD SITEMAP RESULT (typical usage)
// ============================================

const sitemapResult = {
  tier: 'material',
  sitemapPath: 'public/sitemap.xml',
  urlCount: 5,
  resolved: 5,
  unresolved: 0,

  distribution: {
    passing: 2,
    warning: 2,
    failing: 1
  },

  urls: [
    {
      url: 'https://example.com/',
      path: '/',
      priority: 1.0,
      component: 'HomeComponent',
      files: ['src/app/home/home.component.html', 'src/app/home/home.component.scss'],
      auditScore: 45,
      auditsTotal: 10,
      auditsPassed: 4,
      auditsFailed: 6,
      issues: [
        { check: 'imageAlt', message: '[Error] Image missing alt attribute', file: 'src/app/home/home.component.html', line: 15 },
        { check: 'imageAlt', message: '[Error] Image missing alt attribute', file: 'src/app/home/home.component.html', line: 23 },
        { check: 'buttonNames', message: '[Error] Button has no accessible name', file: 'src/app/home/home.component.html', line: 42 },
        { check: 'colorContrast', message: '[Warning] Color contrast ratio is 3.5:1, should be at least 4.5:1', file: 'src/app/home/home.component.scss', line: 28 },
        { check: 'matIconAccessibility', message: '[Error] mat-icon missing aria-label or aria-hidden', file: 'src/app/home/home.component.html', line: 67 }
      ],
      audits: [
        { name: 'imageAlt', weight: 10, passed: false, elementsFound: 3, errors: 2, warnings: 0, issues: 2 },
        { name: 'buttonNames', weight: 10, passed: false, elementsFound: 2, errors: 1, warnings: 0, issues: 1 },
        { name: 'colorContrast', weight: 7, passed: false, elementsFound: 5, errors: 0, warnings: 1, issues: 1 },
        { name: 'matIconAccessibility', weight: 10, passed: false, elementsFound: 4, errors: 1, warnings: 0, issues: 1 }
      ]
    },
    {
      url: 'https://example.com/about',
      path: '/about',
      priority: 0.8,
      component: 'AboutComponent',
      files: ['src/app/about/about.component.html'],
      auditScore: 72,
      auditsTotal: 8,
      auditsPassed: 6,
      auditsFailed: 2,
      issues: [
        { check: 'headingOrder', message: '[Warning] Heading levels should increase by one', file: 'src/app/about/about.component.html', line: 12 },
        { check: 'linkNames', message: '[Error] Link has no accessible name', file: 'src/app/about/about.component.html', line: 45 }
      ],
      audits: [
        { name: 'headingOrder', weight: 3, passed: false, elementsFound: 4, errors: 0, warnings: 1, issues: 1 },
        { name: 'linkNames', weight: 10, passed: false, elementsFound: 8, errors: 1, warnings: 0, issues: 1 }
      ]
    },
    {
      url: 'https://example.com/contact',
      path: '/contact',
      priority: 0.7,
      component: 'ContactComponent',
      files: ['src/app/contact/contact.component.html'],
      auditScore: 65,
      auditsTotal: 10,
      auditsPassed: 6,
      auditsFailed: 4,
      issues: [
        { check: 'formLabels', message: '[Error] Form input missing associated label', file: 'src/app/contact/contact.component.html', line: 18 },
        { check: 'formLabels', message: '[Error] Form input missing associated label', file: 'src/app/contact/contact.component.html', line: 24 },
        { check: 'matFormFieldLabel', message: '[Error] mat-form-field missing mat-label', file: 'src/app/contact/contact.component.html', line: 30 }
      ],
      audits: [
        { name: 'formLabels', weight: 10, passed: false, elementsFound: 4, errors: 2, warnings: 0, issues: 2 },
        { name: 'matFormFieldLabel', weight: 10, passed: false, elementsFound: 3, errors: 1, warnings: 0, issues: 1 }
      ]
    },
    {
      url: 'https://example.com/products',
      path: '/products',
      priority: 0.9,
      component: 'ProductsComponent',
      files: ['src/app/products/products.component.html'],
      auditScore: 95,
      auditsTotal: 12,
      auditsPassed: 12,
      auditsFailed: 0,
      issues: [],
      audits: [
        { name: 'imageAlt', weight: 10, passed: true, elementsFound: 10, errors: 0, warnings: 0, issues: 0 },
        { name: 'buttonNames', weight: 10, passed: true, elementsFound: 5, errors: 0, warnings: 0, issues: 0 }
      ]
    },
    {
      url: 'https://example.com/blog',
      path: '/blog',
      priority: 0.6,
      component: 'BlogComponent',
      files: ['src/app/blog/blog.component.html'],
      auditScore: 92,
      auditsTotal: 8,
      auditsPassed: 8,
      auditsFailed: 0,
      issues: [],
      audits: [
        { name: 'headingOrder', weight: 3, passed: true, elementsFound: 6, errors: 0, warnings: 0, issues: 0 }
      ]
    }
  ],

  worstUrls: [
    { url: 'https://example.com/', path: '/', score: 45, topIssues: [{ check: 'imageAlt', count: 2 }, { check: 'buttonNames', count: 1 }, { check: 'matIconAccessibility', count: 1 }] },
    { url: 'https://example.com/contact', path: '/contact', score: 65, topIssues: [{ check: 'formLabels', count: 2 }, { check: 'matFormFieldLabel', count: 1 }] },
    { url: 'https://example.com/about', path: '/about', score: 72, topIssues: [{ check: 'linkNames', count: 1 }, { check: 'headingOrder', count: 1 }] }
  ],

  internal: {
    count: 3,
    analyzed: 3,
    distribution: { passing: 1, warning: 1, failing: 1 },
    routes: [
      {
        url: '/admin',
        path: '/admin',
        priority: 0,
        component: 'AdminComponent',
        files: ['src/app/admin/admin.component.html'],
        auditScore: 40,
        auditsTotal: 5,
        auditsPassed: 2,
        auditsFailed: 3,
        issues: [{ check: 'buttonNames', message: '[Error] Button missing name', file: 'src/app/admin/admin.component.html', line: 10 }],
        audits: [{ name: 'buttonNames', weight: 10, passed: false, elementsFound: 3, errors: 1, warnings: 0, issues: 1 }]
      }
    ]
  }
};

// ============================================
// EMPTY RESULT (no URLs)
// ============================================

const emptyResult = {
  tier: 'material',
  sitemapPath: 'sitemap.xml',
  urlCount: 0,
  resolved: 0,
  unresolved: 0,
  distribution: { passing: 0, warning: 0, failing: 0 },
  urls: [],
  worstUrls: [],
  internal: {
    count: 0,
    analyzed: 0,
    distribution: { passing: 0, warning: 0, failing: 0 },
    routes: []
  }
};

// ============================================
// MINIMAL RESULT (single URL, perfect score)
// ============================================

const minimalResult = {
  tier: 'basic',
  sitemapPath: 'sitemap.xml',
  urlCount: 1,
  resolved: 1,
  unresolved: 0,
  distribution: { passing: 1, warning: 0, failing: 0 },
  urls: [
    {
      url: 'https://example.com/',
      path: '/',
      priority: 1.0,
      component: 'MinimalComponent',
      files: ['src/minimal.html'],
      auditScore: 100,
      auditsTotal: 1,
      auditsPassed: 1,
      auditsFailed: 0,
      issues: [],
      audits: [{ name: 'buttonNames', weight: 10, passed: true, elementsFound: 1, errors: 0, warnings: 0, issues: 0 }]
    }
  ],
  worstUrls: [],
  internal: { count: 0, analyzed: 0, distribution: { passing: 0, warning: 0, failing: 0 }, routes: [] }
};

// ============================================
// ALL FAILING (worst case scenario)
// ============================================

const allFailingResult = {
  tier: 'full',
  sitemapPath: 'sitemap.xml',
  urlCount: 2,
  resolved: 2,
  unresolved: 0,
  distribution: { passing: 0, warning: 0, failing: 2 },
  urls: [
    {
      url: 'https://example.com/',
      path: '/',
      priority: 1.0,
      component: 'FailingComponent',
      files: ['test.html'],
      auditScore: 0,
      auditsTotal: 3,
      auditsPassed: 0,
      auditsFailed: 3,
      issues: [
        { check: 'imageAlt', message: '[Error] Missing alt', file: 'test.html', line: 1 },
        { check: 'buttonNames', message: '[Error] Missing name', file: 'test.html', line: 2 },
        { check: 'formLabels', message: '[Error] Missing label', file: 'test.html', line: 3 }
      ],
      audits: [
        { name: 'imageAlt', weight: 10, passed: false, elementsFound: 1, errors: 1, warnings: 0, issues: 1 },
        { name: 'buttonNames', weight: 10, passed: false, elementsFound: 1, errors: 1, warnings: 0, issues: 1 },
        { name: 'formLabels', weight: 10, passed: false, elementsFound: 1, errors: 1, warnings: 0, issues: 1 }
      ]
    },
    {
      url: 'https://example.com/page',
      path: '/page',
      priority: 0.8,
      component: 'PageComponent',
      files: ['page.html'],
      auditScore: 0,
      auditsTotal: 2,
      auditsPassed: 0,
      auditsFailed: 2,
      issues: [{ check: 'linkNames', message: '[Error] Missing name', file: 'page.html', line: 5 }],
      audits: [{ name: 'linkNames', weight: 10, passed: false, elementsFound: 1, errors: 1, warnings: 0, issues: 1 }]
    }
  ],
  worstUrls: [
    { url: 'https://example.com/', path: '/', score: 0, topIssues: [{ check: 'imageAlt', count: 1 }, { check: 'buttonNames', count: 1 }] },
    { url: 'https://example.com/page', path: '/page', score: 0, topIssues: [{ check: 'linkNames', count: 1 }] }
  ],
  internal: { count: 0, analyzed: 0, distribution: { passing: 0, warning: 0, failing: 0 }, routes: [] }
};

// ============================================
// ALL PASSING (best case scenario)
// ============================================

const allPassingResult = {
  tier: 'full',
  sitemapPath: 'public/sitemap.xml',
  urlCount: 3,
  resolved: 3,
  unresolved: 0,
  distribution: { passing: 3, warning: 0, failing: 0 },
  urls: [
    {
      url: 'https://example.com/',
      path: '/',
      priority: 1.0,
      component: 'HomeComponent',
      files: ['src/app/home.component.html'],
      auditScore: 100,
      auditsTotal: 5,
      auditsPassed: 5,
      auditsFailed: 0,
      issues: [],
      audits: [
        { name: 'imageAlt', weight: 10, passed: true, elementsFound: 5, errors: 0, warnings: 0, issues: 0 },
        { name: 'buttonNames', weight: 10, passed: true, elementsFound: 3, errors: 0, warnings: 0, issues: 0 }
      ]
    },
    {
      url: 'https://example.com/about',
      path: '/about',
      priority: 0.8,
      component: 'AboutComponent',
      files: ['src/app/about.component.html'],
      auditScore: 100,
      auditsTotal: 4,
      auditsPassed: 4,
      auditsFailed: 0,
      issues: [],
      audits: [{ name: 'headingOrder', weight: 3, passed: true, elementsFound: 4, errors: 0, warnings: 0, issues: 0 }]
    },
    {
      url: 'https://example.com/contact',
      path: '/contact',
      priority: 0.7,
      component: 'ContactComponent',
      files: ['src/app/contact.component.html'],
      auditScore: 100,
      auditsTotal: 6,
      auditsPassed: 6,
      auditsFailed: 0,
      issues: [],
      audits: [{ name: 'formLabels', weight: 10, passed: true, elementsFound: 4, errors: 0, warnings: 0, issues: 0 }]
    }
  ],
  worstUrls: [],
  internal: { count: 0, analyzed: 0, distribution: { passing: 0, warning: 0, failing: 0 }, routes: [] }
};

// ============================================
// SCORE BOUNDARIES (49, 50, 89, 90)
// ============================================

const scoreBoundaryResult = {
  tier: 'material',
  sitemapPath: 'sitemap.xml',
  urlCount: 4,
  resolved: 4,
  unresolved: 0,
  distribution: { passing: 1, warning: 2, failing: 1 },
  urls: [
    {
      url: 'https://example.com/failing',
      path: '/failing',
      priority: 1.0,
      component: 'FailingComponent',
      files: ['failing.html'],
      auditScore: 49, // Just below warning threshold
      auditsTotal: 2,
      auditsPassed: 0,
      auditsFailed: 2,
      issues: [{ check: 'buttonNames', message: '[Error] Missing', file: 'failing.html', line: 1 }],
      audits: [{ name: 'buttonNames', weight: 10, passed: false, elementsFound: 1, errors: 1, warnings: 0, issues: 1 }]
    },
    {
      url: 'https://example.com/warning-low',
      path: '/warning-low',
      priority: 0.9,
      component: 'WarningLowComponent',
      files: ['warning-low.html'],
      auditScore: 50, // Just at warning threshold
      auditsTotal: 2,
      auditsPassed: 1,
      auditsFailed: 1,
      issues: [{ check: 'imageAlt', message: '[Warning] Consider adding', file: 'warning-low.html', line: 1 }],
      audits: [{ name: 'imageAlt', weight: 10, passed: false, elementsFound: 2, errors: 0, warnings: 1, issues: 1 }]
    },
    {
      url: 'https://example.com/warning-high',
      path: '/warning-high',
      priority: 0.8,
      component: 'WarningHighComponent',
      files: ['warning-high.html'],
      auditScore: 89, // Just below passing threshold
      auditsTotal: 3,
      auditsPassed: 2,
      auditsFailed: 1,
      issues: [{ check: 'headingOrder', message: '[Warning] Minor issue', file: 'warning-high.html', line: 5 }],
      audits: [{ name: 'headingOrder', weight: 3, passed: false, elementsFound: 3, errors: 0, warnings: 1, issues: 1 }]
    },
    {
      url: 'https://example.com/passing',
      path: '/passing',
      priority: 0.7,
      component: 'PassingComponent',
      files: ['passing.html'],
      auditScore: 90, // Just at passing threshold
      auditsTotal: 4,
      auditsPassed: 4,
      auditsFailed: 0,
      issues: [],
      audits: [{ name: 'buttonNames', weight: 10, passed: true, elementsFound: 2, errors: 0, warnings: 0, issues: 0 }]
    }
  ],
  worstUrls: [
    { url: 'https://example.com/failing', path: '/failing', score: 49, topIssues: [{ check: 'buttonNames', count: 1 }] },
    { url: 'https://example.com/warning-low', path: '/warning-low', score: 50, topIssues: [{ check: 'imageAlt', count: 1 }] },
    { url: 'https://example.com/warning-high', path: '/warning-high', score: 89, topIssues: [{ check: 'headingOrder', count: 1 }] }
  ],
  internal: { count: 0, analyzed: 0, distribution: { passing: 0, warning: 0, failing: 0 }, routes: [] }
};

// ============================================
// SPECIAL CHARACTERS (XML/HTML escaping)
// ============================================

const specialCharsResult = {
  tier: 'material',
  sitemapPath: 'sitemap.xml',
  urlCount: 1,
  resolved: 1,
  unresolved: 0,
  distribution: { passing: 0, warning: 0, failing: 1 },
  urls: [
    {
      url: 'https://example.com/page?foo=bar&baz=qux',
      path: '/page?foo=bar&baz=qux',
      priority: 1.0,
      component: 'Special<Component>',
      files: ['src/app/<special>/component.html', 'path with spaces/file.html'],
      auditScore: 30,
      auditsTotal: 3,
      auditsPassed: 0,
      auditsFailed: 3,
      issues: [
        { check: 'imageAlt', message: '[Error] Image <img src="test.jpg"> missing alt attribute', file: 'src/app/<special>/component.html', line: 10 },
        { check: 'buttonNames', message: '[Error] Button with text "Click & Subscribe" has no name', file: 'path with spaces/file.html', line: 20 },
        { check: 'ariaAttributes', message: '[Error] Invalid aria-label: "Say "Hello" to users"', file: 'src/app/<special>/component.html', line: 30 },
        { check: 'linkNames', message: "[Error] Link with href='/path?a=1&b=2' missing name", file: 'src/app/<special>/component.html', line: 40 }
      ],
      audits: [
        { name: 'imageAlt', weight: 10, passed: false, elementsFound: 1, errors: 1, warnings: 0, issues: 1 },
        { name: 'buttonNames', weight: 10, passed: false, elementsFound: 1, errors: 1, warnings: 0, issues: 1 },
        { name: 'ariaAttributes', weight: 7, passed: false, elementsFound: 1, errors: 1, warnings: 0, issues: 1 }
      ]
    }
  ],
  worstUrls: [
    { url: 'https://example.com/page?foo=bar&baz=qux', path: '/page?foo=bar&baz=qux', score: 30, topIssues: [{ check: 'imageAlt', count: 1 }] }
  ],
  internal: { count: 0, analyzed: 0, distribution: { passing: 0, warning: 0, failing: 0 }, routes: [] }
};

// ============================================
// UNICODE CHARACTERS
// ============================================

const unicodeResult = {
  tier: 'material',
  sitemapPath: 'sitemap.xml',
  urlCount: 1,
  resolved: 1,
  unresolved: 0,
  distribution: { passing: 0, warning: 1, failing: 0 },
  urls: [
    {
      url: 'https://example.com/日本語/页面',
      path: '/日本語/页面',
      priority: 1.0,
      component: 'UnicodeComponent',
      files: ['src/app/日本語/コンポーネント.html'],
      auditScore: 75,
      auditsTotal: 2,
      auditsPassed: 1,
      auditsFailed: 1,
      issues: [
        { check: 'imageAlt', message: '[Error] 画像に代替テキストがありません (Image missing alt text)', file: 'src/app/日本語/コンポーネント.html', line: 15 },
        { check: 'buttonNames', message: '[Warning] Кнопка без имени (Button without name) - émojis: 🎉✨🚀', file: 'src/app/日本語/コンポーネント.html', line: 25 }
      ],
      audits: [
        { name: 'imageAlt', weight: 10, passed: false, elementsFound: 2, errors: 1, warnings: 0, issues: 1 },
        { name: 'buttonNames', weight: 10, passed: false, elementsFound: 1, errors: 0, warnings: 1, issues: 1 }
      ]
    }
  ],
  worstUrls: [
    { url: 'https://example.com/日本語/页面', path: '/日本語/页面', score: 75, topIssues: [{ check: 'imageAlt', count: 1 }] }
  ],
  internal: { count: 0, analyzed: 0, distribution: { passing: 0, warning: 0, failing: 0 }, routes: [] }
};

// ============================================
// MISSING OPTIONAL FIELDS (robustness test)
// ============================================

const missingFieldsResult = {
  tier: 'material',
  sitemapPath: 'sitemap.xml',
  urlCount: 2,
  resolved: 1,
  unresolved: 1,
  // distribution intentionally missing - formatters must handle this
  urls: [
    {
      url: 'https://example.com/',
      path: '/',
      // priority missing
      component: null, // null component
      files: [], // empty files
      auditScore: 60,
      auditsTotal: 2,
      auditsPassed: 1,
      auditsFailed: 1,
      issues: [
        { check: 'buttonNames', message: '[Error] Missing name' }
        // file and line missing
      ],
      audits: [
        { name: 'buttonNames', weight: 10, passed: false, elementsFound: 1 }
        // errors, warnings, issues count missing
      ]
    },
    {
      url: 'https://example.com/unresolved',
      path: '/unresolved',
      priority: 0.5,
      component: null,
      files: [],
      auditScore: 0,
      auditsTotal: 0,
      auditsPassed: 0,
      auditsFailed: 0,
      issues: [],
      audits: [],
      error: 'Could not resolve component for route'
    }
  ]
  // worstUrls missing
  // internal missing
};

// ============================================
// WARNINGS ONLY (no errors)
// ============================================

const warningsOnlyResult = {
  tier: 'material',
  sitemapPath: 'sitemap.xml',
  urlCount: 1,
  resolved: 1,
  unresolved: 0,
  distribution: { passing: 0, warning: 1, failing: 0 },
  urls: [
    {
      url: 'https://example.com/',
      path: '/',
      priority: 1.0,
      component: 'WarningsComponent',
      files: ['warnings.html', 'warnings.scss'],
      auditScore: 85,
      auditsTotal: 4,
      auditsPassed: 2,
      auditsFailed: 2,
      issues: [
        { check: 'colorContrast', message: '[Warning] Contrast ratio 4.2:1, recommend 4.5:1', file: 'warnings.scss', line: 10 },
        { check: 'headingOrder', message: '[Warning] Skipped heading level h2 to h4', file: 'warnings.html', line: 20 },
        { check: 'tabindex', message: '[Info] Consider removing positive tabindex', file: 'warnings.html', line: 30 }
      ],
      audits: [
        { name: 'colorContrast', weight: 7, passed: false, elementsFound: 3, errors: 0, warnings: 1, issues: 1 },
        { name: 'headingOrder', weight: 3, passed: false, elementsFound: 5, errors: 0, warnings: 1, issues: 1 },
        { name: 'buttonNames', weight: 10, passed: true, elementsFound: 4, errors: 0, warnings: 0, issues: 0 },
        { name: 'imageAlt', weight: 10, passed: true, elementsFound: 6, errors: 0, warnings: 0, issues: 0 }
      ]
    }
  ],
  worstUrls: [
    { url: 'https://example.com/', path: '/', score: 85, topIssues: [{ check: 'colorContrast', count: 1 }, { check: 'headingOrder', count: 1 }] }
  ],
  internal: { count: 0, analyzed: 0, distribution: { passing: 0, warning: 0, failing: 0 }, routes: [] }
};

// ============================================
// LARGE RESULT (many URLs and issues)
// ============================================

const largeResult = (() => {
  const urls = [];
  const worstUrls = [];

  // Generate 50 URLs with varying scores
  for (let i = 0; i < 50; i++) {
    const score = Math.floor(Math.random() * 100);
    const issueCount = Math.max(0, Math.floor((100 - score) / 10));
    const issues = [];
    const checks = ['imageAlt', 'buttonNames', 'formLabels', 'linkNames', 'headingOrder', 'colorContrast'];

    for (let j = 0; j < issueCount; j++) {
      issues.push({
        check: checks[j % checks.length],
        message: `[Error] Issue ${j + 1} on page ${i + 1}`,
        file: `src/app/page-${i}/component.html`,
        line: (j + 1) * 10
      });
    }

    urls.push({
      url: `https://example.com/page-${i}`,
      path: `/page-${i}`,
      priority: 1 - (i * 0.02),
      component: `Page${i}Component`,
      files: [`src/app/page-${i}/component.html`],
      auditScore: score,
      auditsTotal: 10,
      auditsPassed: Math.floor(score / 10),
      auditsFailed: 10 - Math.floor(score / 10),
      issues,
      audits: checks.slice(0, 3).map((name, idx) => ({
        name,
        weight: 10,
        passed: idx < Math.floor(score / 30),
        elementsFound: 5,
        errors: idx < Math.floor(score / 30) ? 0 : 1,
        warnings: 0,
        issues: idx < Math.floor(score / 30) ? 0 : 1
      }))
    });

    if (score < 80) {
      worstUrls.push({
        url: `https://example.com/page-${i}`,
        path: `/page-${i}`,
        score,
        topIssues: issues.slice(0, 3).map(iss => ({ check: iss.check, count: 1 }))
      });
    }
  }

  // Sort by score ascending (worst first)
  urls.sort((a, b) => a.auditScore - b.auditScore);
  worstUrls.sort((a, b) => a.score - b.score);

  const passing = urls.filter(u => u.auditScore >= 90).length;
  const failing = urls.filter(u => u.auditScore < 50).length;
  const warning = urls.length - passing - failing;

  return {
    tier: 'full',
    sitemapPath: 'public/sitemap.xml',
    urlCount: 50,
    resolved: 50,
    unresolved: 0,
    distribution: { passing, warning, failing },
    urls,
    worstUrls: worstUrls.slice(0, 10),
    internal: { count: 5, analyzed: 5, distribution: { passing: 2, warning: 2, failing: 1 }, routes: [] }
  };
})();

// ============================================
// ROUTE ANALYSIS RESULT (different structure)
// ============================================

const routeResult = {
  tier: 'material',
  routeCount: 3,
  resolvedCount: 3,
  unresolvedCount: 0,
  distribution: { passing: 1, warning: 1, failing: 1 },
  routes: [
    {
      path: '/',
      component: 'HomeComponent',
      files: ['src/app/home/home.component.html'],
      auditScore: 45,
      auditsTotal: 5,
      auditsPassed: 2,
      auditsFailed: 3,
      elementsChecked: 20,
      elementsPassed: 15,
      elementsFailed: 5,
      issues: [
        { check: 'buttonNames', message: '[Error] Button missing name', file: 'src/app/home/home.component.html' }
      ],
      audits: [
        { name: 'buttonNames', weight: 10, passed: false, elementsFound: 3, issues: 1 }
      ]
    },
    {
      path: '/about',
      component: 'AboutComponent',
      files: ['src/app/about/about.component.html'],
      auditScore: 75,
      auditsTotal: 4,
      auditsPassed: 3,
      auditsFailed: 1,
      elementsChecked: 15,
      elementsPassed: 12,
      elementsFailed: 3,
      issues: [
        { check: 'headingOrder', message: '[Warning] Heading order', file: 'src/app/about/about.component.html' }
      ],
      audits: [
        { name: 'headingOrder', weight: 3, passed: false, elementsFound: 4, issues: 1 }
      ]
    },
    {
      path: '/contact',
      component: 'ContactComponent',
      files: ['src/app/contact/contact.component.html'],
      auditScore: 95,
      auditsTotal: 6,
      auditsPassed: 6,
      auditsFailed: 0,
      elementsChecked: 25,
      elementsPassed: 25,
      elementsFailed: 0,
      issues: [],
      audits: [
        { name: 'formLabels', weight: 10, passed: true, elementsFound: 4, issues: 0 }
      ]
    }
  ]
};

// ============================================
// FILE-BASED ANALYSIS RESULT (legacy format)
// ============================================

const fileBasedResult = {
  tier: 'basic',
  check: null,
  files: {
    'src/app/app.component.html': [
      { name: 'buttonNames', passed: false, issues: ['[Error] Button missing name at line 10'], count: 1, elementsFound: 3 },
      { name: 'imageAlt', passed: true, issues: [], count: 0, elementsFound: 5 }
    ],
    'src/app/home/home.component.html': [
      { name: 'buttonNames', passed: true, issues: [], count: 0, elementsFound: 2 },
      { name: 'imageAlt', passed: false, issues: ['[Error] Image missing alt at line 15', '[Error] Image missing alt at line 22'], count: 2, elementsFound: 4 }
    ]
  },
  summary: {
    totalFiles: 2,
    elementsChecked: 14,
    elementsPassed: 11,
    elementsFailed: 3,
    auditScore: 70,
    auditsTotal: 4,
    auditsPassed: 2,
    auditsFailed: 2,
    audits: [
      { name: 'buttonNames', weight: 10, passed: false, elementsFound: 5, issues: 1 },
      { name: 'imageAlt', weight: 10, passed: false, elementsFound: 9, issues: 2 }
    ],
    issues: [
      { message: '[Error] Button missing name at line 10', file: 'src/app/app.component.html', check: 'buttonNames' },
      { message: '[Error] Image missing alt at line 15', file: 'src/app/home/home.component.html', check: 'imageAlt' },
      { message: '[Error] Image missing alt at line 22', file: 'src/app/home/home.component.html', check: 'imageAlt' }
    ]
  }
};

// ============================================
// VERY LONG STRINGS (truncation test)
// ============================================

const longStringsResult = {
  tier: 'material',
  sitemapPath: 'sitemap.xml',
  urlCount: 1,
  resolved: 1,
  unresolved: 0,
  distribution: { passing: 0, warning: 0, failing: 1 },
  urls: [
    {
      url: 'https://example.com/' + 'very-long-path-segment/'.repeat(20),
      path: '/' + 'very-long-path-segment/'.repeat(20),
      priority: 1.0,
      component: 'VeryLongComponentNameThatGoesOnAndOnAndOnForeverAndEver'.repeat(3),
      files: ['src/app/' + 'deeply/nested/'.repeat(15) + 'component.html'],
      auditScore: 25,
      auditsTotal: 1,
      auditsPassed: 0,
      auditsFailed: 1,
      issues: [
        {
          check: 'imageAlt',
          message: '[Error] ' + 'This is a very long error message that contains lots of detail about what went wrong. '.repeat(10),
          file: 'src/app/' + 'deeply/nested/'.repeat(15) + 'component.html',
          line: 999
        }
      ],
      audits: [
        { name: 'imageAlt', weight: 10, passed: false, elementsFound: 1, errors: 1, warnings: 0, issues: 1 }
      ]
    }
  ],
  worstUrls: [
    {
      url: 'https://example.com/' + 'very-long-path-segment/'.repeat(20),
      path: '/' + 'very-long-path-segment/'.repeat(20),
      score: 25,
      topIssues: [{ check: 'imageAlt', count: 1 }]
    }
  ],
  internal: { count: 0, analyzed: 0, distribution: { passing: 0, warning: 0, failing: 0 }, routes: [] }
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Standard results
  sitemapResult,
  routeResult,
  fileBasedResult,

  // Edge cases - emptiness
  emptyResult,
  minimalResult,

  // Edge cases - score extremes
  allFailingResult,
  allPassingResult,
  scoreBoundaryResult,

  // Edge cases - special content
  specialCharsResult,
  unicodeResult,
  longStringsResult,

  // Edge cases - robustness
  missingFieldsResult,
  warningsOnlyResult,

  // Edge cases - scale
  largeResult,

  // All fixtures as array for iteration
  all: [
    { name: 'sitemapResult', data: sitemapResult, type: 'sitemap' },
    { name: 'routeResult', data: routeResult, type: 'route' },
    { name: 'fileBasedResult', data: fileBasedResult, type: 'file' },
    { name: 'emptyResult', data: emptyResult, type: 'sitemap' },
    { name: 'minimalResult', data: minimalResult, type: 'sitemap' },
    { name: 'allFailingResult', data: allFailingResult, type: 'sitemap' },
    { name: 'allPassingResult', data: allPassingResult, type: 'sitemap' },
    { name: 'scoreBoundaryResult', data: scoreBoundaryResult, type: 'sitemap' },
    { name: 'specialCharsResult', data: specialCharsResult, type: 'sitemap' },
    { name: 'unicodeResult', data: unicodeResult, type: 'sitemap' },
    { name: 'longStringsResult', data: longStringsResult, type: 'sitemap' },
    { name: 'missingFieldsResult', data: missingFieldsResult, type: 'sitemap' },
    { name: 'warningsOnlyResult', data: warningsOnlyResult, type: 'sitemap' },
    { name: 'largeResult', data: largeResult, type: 'sitemap' }
  ]
};
