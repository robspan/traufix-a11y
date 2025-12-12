# mat-a11y

**Lighthouse can't see your Angular Material components.** mat-a11y can.

82 accessibility checks for Angular + Material, scored per-page from your sitemap - exactly how Google sees your site.

```
mat-a11y ./my-angular-app
```
```
URL SCORES (67 URLs from sitemap.xml):
  🟢 Passing (90-100%): 61 URLs
  🟡 Needs Work (50-89%): 6 URLs
  🔴 Failing (<50%): 0 URLs

  🟡  83%  /
  🟡  87%  /about
  🟢 100%  /guide/how-to-plan
  ... and 64 more

FIX PRIORITIES:
  1. / (83%)
     - matIconAccessibility: 50 errors
     - colorContrast: 4 errors
```

## Quick Start

```bash
npm install mat-a11y
mat-a11y ./src
```

## Why mat-a11y?

| | Lighthouse | mat-a11y |
|---|:---:|:---:|
| Angular Material checks | ❌ | ✅ 29 checks |
| SCSS analysis (focus styles, contrast) | ❌ | ✅ |
| Source file + line numbers | ❌ | ✅ |
| Runs without browser | ❌ | ✅ |
| Scores each sitemap URL | ❌ | ✅ |
| CI/CD friendly | ⚠️ slow | ✅ fast |

**Sitemap-based scoring**: Google ranks pages independently. Your admin panel's score doesn't affect your landing page. mat-a11y reads `sitemap.xml` and scores exactly what Google crawls.

## Usage

```bash
# Analyze (uses sitemap.xml by default)
mat-a11y ./src

# Generate reports
mat-a11y ./src --json           # mat-a11y-report.json
mat-a11y ./src --html           # mat-a11y-report.html

# Tiers
mat-a11y ./src --basic          # Quick wins across all categories (default)
mat-a11y ./src --material       # ONLY mat-* checks (29 checks)
mat-a11y ./src --angular        # ONLY Angular + CDK checks (10 checks)
mat-a11y ./src --full           # Everything (82 checks)

# Debug
mat-a11y --list-checks          # Show all checks
mat-a11y ./src --check imageAlt # Run single check
```

### CI Integration

```yaml
# .github/workflows/a11y.yml
- name: A11y Check
  run: npx mat-a11y ./src --json

- uses: actions/upload-artifact@v3
  with:
    name: a11y-report
    path: mat-a11y-report.json
```

Exit codes: `0` = passing, `1` = failing pages exist, `2` = error

## Checks (82 total)

| Category | Count | Examples |
|----------|-------|----------|
| HTML | 29 | `imageAlt`, `buttonNames`, `formLabels`, `headingOrder` |
| Angular Material | 29 | `matFormFieldLabel`, `matDialogFocus`, `matIconAccessibility` |
| SCSS | 14 | `colorContrast`, `focusStyles`, `touchTargets` |
| Angular | 7 | `clickWithoutKeyboard`, `routerLinkNames` |
| CDK | 3 | `cdkTrapFocusDialog`, `cdkLiveAnnouncer` |

Run `mat-a11y --list-checks` for full list with descriptions.

## API Reference

### CLI

```
mat-a11y <path> [options]

Options:
  --basic              Quick wins (default)
  --material           ONLY mat-* checks (29)
  --angular            ONLY Angular + CDK (10)
  --full               Everything (82 checks)
  --json               Output mat-a11y-report.json
  --html               Output mat-a11y-report.html
  --file-based         Legacy file analysis (no sitemap)
  -i, --ignore <pat>   Ignore pattern
  --check <name>       Run single check
  --list-checks        List all available checks
  --self-test          Verify checks work
```

### Programmatic

```javascript
const { analyzeBySitemap, analyzeByRoute, analyze } = require('mat-a11y');

// Sitemap-based (recommended)
const results = analyzeBySitemap('./my-app', { tier: 'material' });
// Returns: { urlCount, distribution: { passing, warning, failing }, urls: [...] }

// Route-based (no sitemap)
const routeResults = analyzeByRoute('./my-app', { tier: 'full' });

// File-based (legacy)
const fileResults = analyze('./my-app');
```

### Result Structure

```javascript
{
  tier: 'material',
  sitemapPath: 'dist/browser/sitemap.xml',
  urlCount: 67,
  resolved: 67,
  unresolved: 0,
  distribution: { passing: 61, warning: 6, failing: 0 },
  urls: [
    {
      url: 'https://example.com/',
      path: '/',
      auditScore: 83,
      auditsTotal: 12,
      auditsPassed: 10,
      auditsFailed: 2,
      issues: [
        { check: 'matIconAccessibility', message: '[Error] mat-icon missing...', file: 'app.component.html' }
      ],
      audits: [
        { name: 'matIconAccessibility', weight: 10, passed: false, elementsFound: 50, errors: 50, warnings: 0, issues: 50 }
      ]
    }
  ],
  worstUrls: [
    { path: '/', score: 83, topIssues: [{ check: 'matIconAccessibility', count: 50 }] }
  ],
  internal: { count: 3, analyzed: 3, distribution: { passing: 1, warning: 1, failing: 1 }, routes: [...] }
}
```

## How It Works

### Analysis Priority

1. **Sitemap found** → Analyze each URL from `sitemap.xml`
2. **No sitemap** → Fall back to Angular route analysis
3. **No routes** → Fall back to file-based analysis

Sitemap locations checked: `public/sitemap.xml`, `src/sitemap.xml`, `dist/*/browser/sitemap.xml`

### Scoring

Lighthouse-compatible weighted scoring:

1. Each check has a weight (e.g., `buttonNames` = 10 points)
2. Check passes if 0 errors (warnings don't fail checks)
3. Score = (weighted passing) / (total weighted) × 100

### Dynamic Routes

Routes like `/guide/:slug` are expanded using your generated loaders:

```
sitemap.xml contains:     mat-a11y analyzes:
/guide/budget-tips    →   guide/budget-tips/budget-tips.component.html
/guide/venue-tips     →   guide/venue-tips/venue-tips.component.html
/guide/timeline       →   guide/timeline/timeline.component.html
```

Each URL gets its own score, not lumped together.

---

# Full API Documentation

Everything below is exhaustive reference documentation for programmatic use.

## Installation

```bash
npm install mat-a11y
```

**Requirements:**
- Node.js >= 16.0.0
- Angular >= 12 (for sitemap/route analysis)
- Angular Material >= 12 (for mat-* checks)

## Analysis Modes

mat-a11y supports three analysis modes with automatic fallback:

| Mode | Function | Use Case |
|------|----------|----------|
| Sitemap | `analyzeBySitemap()` | SEO focus - analyzes exactly what Google crawls |
| Route | `analyzeByRoute()` | Per-route scores without sitemap |
| File | `analyze()` | Legacy file-based analysis |

**Automatic fallback:** CLI uses sitemap → route → file fallback chain.

---

## `analyzeBySitemap(projectDir, options?)`

**Recommended for SEO.** Analyzes each URL in `sitemap.xml` independently.

```typescript
import { analyzeBySitemap } from 'mat-a11y';

const results = analyzeBySitemap('./my-angular-app', {
  tier: 'material',        // 'basic' | 'material' | 'full'
  sitemap: './custom/sitemap.xml'  // optional custom path
});
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `tier` | `'basic' \| 'material' \| 'full'` | `'material'` | Check tier |
| `sitemap` | `string` | auto-detect | Custom sitemap path |

### Return Type: `SitemapAnalysisResult`

```typescript
interface SitemapAnalysisResult {
  tier: 'basic' | 'material' | 'full';
  sitemapPath: string;           // Path to sitemap.xml used
  urlCount: number;              // Total URLs in sitemap
  resolved: number;              // URLs mapped to components
  unresolved: number;            // URLs that couldn't be mapped

  distribution: {
    passing: number;   // Score >= 90
    warning: number;   // Score 50-89
    failing: number;   // Score < 50
  };

  urls: UrlResult[];             // All URLs sorted by score (worst first)
  worstUrls: WorstUrl[];         // Top 5 worst with issue breakdown

  internal: {                    // Routes NOT in sitemap
    count: number;
    analyzed: number;
    distribution: { passing: number; warning: number; failing: number };
    routes: UrlResult[];
  };

  error?: string;                // Set if analysis failed
}

interface UrlResult {
  url: string;                   // Full URL from sitemap
  path: string;                  // URL path (e.g., /guide/my-page)
  priority: number;              // Sitemap priority (0-1)
  component: string | null;      // Component name if resolved
  files: string[];               // Files analyzed
  auditScore: number;            // 0-100 Lighthouse-style score
  auditsTotal: number;
  auditsPassed: number;
  auditsFailed: number;
  issues: Array<{
    message: string;
    file: string;
    check: string;
  }>;
  audits: Array<{
    name: string;
    weight: number;
    passed: boolean;
    elementsFound: number;
    errors: number;
    warnings: number;
    issues: number;
  }>;
  error?: string;
}

interface WorstUrl {
  url: string;
  path: string;
  score: number;
  topIssues: Array<{ check: string; count: number }>;
}
```

### Example: Full sitemap analysis

```javascript
const { analyzeBySitemap } = require('mat-a11y');

const results = analyzeBySitemap('./my-app', { tier: 'full' });

if (results.error) {
  console.error('Analysis failed:', results.error);
  process.exit(2);
}

console.log(`Analyzed ${results.urlCount} URLs from ${results.sitemapPath}`);
console.log(`Passing: ${results.distribution.passing}`);
console.log(`Warning: ${results.distribution.warning}`);
console.log(`Failing: ${results.distribution.failing}`);

// Get worst URLs
for (const url of results.worstUrls) {
  console.log(`\n${url.path} (${url.score}%)`);
  for (const issue of url.topIssues) {
    console.log(`  - ${issue.check}: ${issue.count} errors`);
  }
}

// Check internal pages (not in sitemap)
if (results.internal.distribution.failing > 0) {
  console.log(`\nWarning: ${results.internal.distribution.failing} internal pages failing`);
}

// Exit with failure if any sitemap URLs are failing
process.exit(results.distribution.failing > 0 ? 1 : 0);
```

---

## `analyzeByRoute(projectDir, options?)`

Analyzes Angular routes without requiring a sitemap.

```typescript
import { analyzeByRoute } from 'mat-a11y';

const results = analyzeByRoute('./my-angular-app', {
  tier: 'material'
});
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `tier` | `'basic' \| 'material' \| 'full'` | `'material'` | Check tier |

### Return Type: `RouteAnalysisResult`

```typescript
interface RouteAnalysisResult {
  tier: 'basic' | 'material' | 'full';
  routeCount: number;
  resolvedCount: number;
  unresolvedCount: number;

  distribution: {
    passing: number;
    warning: number;
    failing: number;
  };

  routes: RouteResult[];         // Sorted by score (worst first)
}

interface RouteResult {
  path: string;                  // Route path
  component: string | null;
  files: string[];
  auditScore: number;
  auditsTotal: number;
  auditsPassed: number;
  auditsFailed: number;
  elementsChecked: number;
  elementsPassed: number;
  elementsFailed: number;
  issues: Array<{ message: string; file: string; check: string }>;
  audits: Array<{ name: string; weight: number; passed: boolean; elementsFound: number; issues: number }>;
}
```

---

## `analyze(targetPath, options?)`

Legacy file-based analysis. Analyzes all HTML/SCSS files in directory.

```typescript
import { analyze } from 'mat-a11y';

// Synchronous (default)
const results = analyze('./src', { tier: 'material' });

// Async with parallel workers
const results = await analyze('./src', {
  tier: 'full',
  workers: 'auto'  // or number of workers
});
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `tier` | `'basic' \| 'material' \| 'full'` | `'material'` | Check tier |
| `ignore` | `string[]` | `['node_modules', '.git', 'dist', ...]` | Patterns to ignore |
| `check` | `string \| null` | `null` | Run single check only |
| `verified` | `boolean` | `false` | Run self-test first |
| `workers` | `number \| 'auto' \| null` | `null` | Parallel workers |
| `verbose` | `boolean` | `false` | Verbose output |
| `extensions.html` | `string[]` | `['.html', '.htm']` | HTML extensions |
| `extensions.scss` | `string[]` | `['.scss', '.css']` | SCSS extensions |

### Return Type: `AnalysisResult`

```typescript
interface AnalysisResult {
  tier: 'basic' | 'material' | 'full';
  check: string | null;
  files: Record<string, CheckResult[]>;
  summary: {
    totalFiles: number;
    elementsChecked: number;
    elementsPassed: number;
    elementsFailed: number;
    auditScore: number;          // 0-100
    auditsTotal: number;
    auditsPassed: number;
    auditsFailed: number;
    audits: AuditResult[];
    issues: Issue[];
  };
  timing?: { duration: number }; // When using workers
}

interface CheckResult {
  name: string;
  passed: boolean;
  issues: string[];
  count: number;
  elementsFound: number;
}

interface AuditResult {
  name: string;
  weight: number;
  passed: boolean;
  elementsFound: number;
  issues: number;
}

interface Issue {
  message: string;
  file: string;
  check: string;
  line?: number;
}
```

---

## Quick Analysis Functions

One-liner functions with sensible defaults:

```javascript
const { basic, material, angular, full } = require('mat-a11y');

// Quick wins - best value/effort (default)
const results = basic('./src');

// ONLY mat-* component checks (29)
const results = material('./src');

// ONLY Angular + CDK checks (10)
const results = angular('./src');

// Everything - all 82 checks
const results = full('./src');
```

---

## Direct Content Analysis

Analyze strings without file system:

```javascript
const { checkHTML, checkSCSS } = require('mat-a11y');

// Check HTML string
const htmlResults = checkHTML(`
  <button></button>
  <img src="photo.jpg">
`, 'material');

for (const result of htmlResults) {
  if (!result.passed) {
    console.log(`${result.name}: ${result.issues.join(', ')}`);
  }
}

// Check SCSS string
const scssResults = checkSCSS(`
  .button:focus { outline: none; }
`, 'material');
```

### Return Type: `CheckResult[]`

```typescript
interface CheckResult {
  name: string;           // Check name (e.g., 'buttonNames')
  passed: boolean;        // true if 0 issues
  issues: string[];       // Issue messages
  count: number;          // Number of issues
  elementsFound: number;  // Elements evaluated
}
```

---

## Check Information

```javascript
const { getCheckInfo } = require('mat-a11y');

const info = getCheckInfo('buttonNames');
// {
//   name: 'buttonNames',
//   description: 'Buttons must have accessible names',
//   tier: 'basic',
//   type: 'html',
//   weight: 10,
//   wcag: '4.1.2'
// }
```

---

## Verification (Self-Test)

Verify checks and formatters work correctly:

```bash
mat-a11y --self-test
# PART 1: Accessibility Checks (82/82)
# PART 2: Output Formatters (294/294)  ← 14 formatters × 21 fixtures
```

```javascript
const { verifyChecks } = require('mat-a11y');

const results = await verifyChecks('full');
console.log(`Verified: ${results.verified}/${results.total}`);
console.log(`Failed: ${results.failed}`);

// Check specific failures
for (const detail of results.details) {
  if (detail.status === 'failed') {
    console.log(`${detail.name}: ${detail.reason}`);
  }
}
```

---

## Parallel Runner

For large codebases, use the parallel runner:

```javascript
const { createRunner } = require('mat-a11y');

const runner = await createRunner({ workers: 4 });

try {
  const results = await runner.runChecks(
    files,      // Array of { path: string, content: string }
    'material', // tier
    { check: null }
  );

  console.log(`Score: ${results.summary.auditScore}%`);
} finally {
  await runner.shutdown();
}
```

---

## Output Formatting

```javascript
const { analyze, formatConsoleOutput, formatSitemapResults, formatRouteResults } = require('mat-a11y');

// File-based
const results = analyze('./src');
console.log(formatConsoleOutput(results));

// Sitemap-based
const sitemapResults = analyzeBySitemap('./src');
console.log(formatSitemapResults(sitemapResults));

// Route-based
const routeResults = analyzeByRoute('./src');
console.log(formatRouteResults(routeResults));
```

---

## Output Formatters

14 built-in formatters for CI/CD, monitoring, and notifications:

```javascript
const { formatters, analyzeBySitemap } = require('mat-a11y');

const results = analyzeBySitemap('./my-app');

// CI/CD Integration
const sarif = formatters.format('sarif', results);      // GitHub Security tab
const junit = formatters.format('junit', results);      // Jenkins, GitLab CI, etc.
const ghAnnotations = formatters.format('github-annotations', results);
const glCodeQuality = formatters.format('gitlab-codequality', results);

// Code Quality
const sonarqube = formatters.format('sonarqube', results);
const checkstyle = formatters.format('checkstyle', results);

// Documentation
const markdown = formatters.format('markdown', results);  // PR comments
const csv = formatters.format('csv', results);            // Spreadsheets

// Monitoring
const prometheus = formatters.format('prometheus', results);
const grafana = formatters.format('grafana-json', results);
const datadog = formatters.format('datadog', results);

// Notifications
const slack = formatters.format('slack', results);
const discord = formatters.format('discord', results);
const teams = formatters.format('teams', results);
```

### Available Formatters

| Formatter | Category | Output | Description |
|-----------|----------|--------|-------------|
| `sarif` | CI/CD | JSON | SARIF 2.1.0 for GitHub Security tab |
| `junit` | CI/CD | XML | JUnit XML for Jenkins, GitLab CI, CircleCI |
| `github-annotations` | CI/CD | Text | GitHub Actions workflow annotations |
| `gitlab-codequality` | CI/CD | JSON | GitLab Code Quality reports |
| `sonarqube` | Code Quality | JSON | SonarQube generic issue format |
| `checkstyle` | Code Quality | XML | Checkstyle XML format |
| `markdown` | Docs | Text | Markdown for PR comments, wikis |
| `csv` | Data | Text | CSV for spreadsheets |
| `prometheus` | Monitoring | Text | Prometheus exposition format |
| `grafana-json` | Monitoring | JSON | Grafana JSON datasource |
| `datadog` | Monitoring | JSON | DataDog metrics format |
| `slack` | Notifications | JSON | Slack Block Kit messages |
| `discord` | Notifications | JSON | Discord embed messages |
| `teams` | Notifications | JSON | Microsoft Teams Adaptive Cards |

**Example outputs:** See [`example-outputs/`](./example-outputs) for sample output from each formatter.

### Formatter API

```javascript
const { formatters } = require('mat-a11y');

// List all formatters
formatters.listFormatters();
// ['sarif', 'junit', 'github-annotations', ...]

// Get formatter info
formatters.listFormattersWithInfo();
// [{ name: 'sarif', description: '...', category: 'cicd', output: 'json' }, ...]

// Get by category
formatters.getFormattersByCategory('cicd');
formatters.getFormattersByCategory('monitoring');
formatters.getFormattersByCategory('notifications');

// Format with options
const junit = formatters.format('junit', results, {
  failThreshold: 80,      // Score below which test fails
  suiteName: 'a11y'       // Custom suite name
});

const slack = formatters.format('slack', results, {
  title: 'A11y Report',
  maxWorstUrls: 3
});
```

---

## Configuration Constants

```javascript
const { TIERS, DEFAULT_CONFIG, WEIGHTS } = require('mat-a11y');

// TIERS - check names by tier and category
console.log(TIERS.basic.html);     // ['buttonNames', 'imageAlt', ...]
console.log(TIERS.material.material); // ['matFormFieldLabel', ...]
console.log(TIERS.full.scss);      // ['colorContrast', ...]

// DEFAULT_CONFIG
// {
//   tier: 'material',
//   ignore: ['node_modules', '.git', 'dist', 'build', '.angular', 'coverage'],
//   extensions: { html: ['.html', '.htm'], scss: ['.scss', '.css'] },
//   verbose: false,
//   outputFormat: 'console',
//   verified: false,
//   workers: null,
//   check: null
// }

// WEIGHTS - Lighthouse-style audit weights
console.log(WEIGHTS.buttonNames);  // 10
console.log(WEIGHTS.imageAlt);     // 10
console.log(WEIGHTS.colorContrast); // 7
```

---

## Color Utilities

```javascript
const { colors } = require('mat-a11y');

// Parse color to RGB
const rgb = colors.parseColor('#ff5722'); // [255, 87, 34]
const rgb2 = colors.parseColor('rgb(33, 150, 243)'); // [33, 150, 243]

// Calculate contrast ratio
const ratio = colors.getContrastRatio('#ffffff', '#000000'); // 21

// Check WCAG compliance
colors.meetsWCAG_AA(ratio);           // true (>= 4.5)
colors.meetsWCAG_AA(ratio, true);     // true (large text >= 3)
colors.meetsWCAG_AAA(ratio);          // true (>= 7)

// Get rating
colors.getContrastRating(ratio);      // 'AAA'
colors.getContrastRating(4.5);        // 'AA'
colors.getContrastRating(3);          // 'AA-large'
colors.getContrastRating(2);          // 'fail'

// Luminance calculation
colors.getLuminance([255, 255, 255]); // 1
colors.getLuminance([0, 0, 0]);       // 0
```

---

## CLI Reference

```
mat-a11y <path> [options]

Analysis Modes:
  (default)              Sitemap-based (uses sitemap.xml)
  --file-based           Legacy file-based analysis

Tiers:
  --basic                Quick wins across all categories (default)
  --material             ONLY mat-* checks (29 checks)
  --angular              ONLY Angular + CDK checks (10 checks)
  --full                 Everything (82 checks)

Output:
  --json                 Write mat-a11y-report.json
  --html                 Write mat-a11y-report.html

Options:
  -b, --basic            Quick wins tier (default)
  -m, --material         ONLY mat-* checks
  -a, --angular          ONLY Angular + CDK checks
  -F, --full             All 82 checks
  -i, --ignore <pattern> Ignore pattern (can use multiple)
  --sitemap <path>       Custom sitemap.xml path
  --check <name>         Run single check only
  --list-checks          List all available checks
  --verified             Verify checks before running
  --full-verified        Full tier + verification (recommended for CI)
  --self-test            Only run self-test (no analysis)
  -w, --workers <n>      Parallel workers (auto or number)
  -h, --help             Show help
  -v, --version          Show version

Exit Codes:
  0                      Success (no failing pages)
  1                      Failure (has failing pages with score < 50)
  2                      Error (couldn't run analysis)
```

### Examples

```bash
# Analyze Angular app (sitemap-based)
mat-a11y ./my-app

# Fast CI check
mat-a11y ./my-app --basic

# Full audit with JSON report
mat-a11y ./my-app --full --json

# Ignore test files
mat-a11y ./my-app -i "*.spec.ts" -i "test"

# Single check debug
mat-a11y ./my-app --check buttonNames

# Custom sitemap
mat-a11y ./my-app --sitemap ./custom/sitemap.xml

# List all 82 checks
mat-a11y --list-checks

# Verify checks work
mat-a11y --self-test
```

---

## All 82 Checks

### HTML Checks (29)

| Check | Weight | WCAG | Description |
|-------|--------|------|-------------|
| `buttonNames` | 10 | 4.1.2 | Buttons must have accessible names |
| `imageAlt` | 10 | 1.1.1 | Images must have alt text |
| `formLabels` | 10 | 1.3.1 | Form inputs must have labels |
| `linkNames` | 10 | 2.4.4 | Links must have accessible names |
| `ariaRoles` | 7 | 4.1.2 | ARIA roles must be valid |
| `ariaAttributes` | 7 | 4.1.2 | ARIA attributes must be valid |
| `uniqueIds` | 7 | 4.1.1 | IDs must be unique |
| `headingOrder` | 3 | 1.3.1 | Headings must be in logical order |
| `tableHeaders` | 7 | 1.3.1 | Tables must have headers |
| `iframeTitles` | 7 | 2.4.1 | Iframes must have titles |
| `listStructure` | 3 | 1.3.1 | Lists must use proper structure |
| `dlStructure` | 3 | 1.3.1 | Definition lists must be structured |
| `videoCaptions` | 10 | 1.2.2 | Videos must have captions |
| `objectAlt` | 7 | 1.1.1 | Objects must have text alternatives |
| `accesskeyUnique` | 3 | 4.1.1 | Accesskeys must be unique |
| `tabindex` | 3 | 2.4.3 | Tabindex should not be positive |
| `ariaHiddenBody` | 10 | 4.1.2 | Body must not be aria-hidden |
| `htmlHasLang` | 7 | 3.1.1 | HTML must have lang attribute |
| `metaViewport` | 7 | 1.4.4 | Viewport must allow zoom |
| `skipLink` | 3 | 2.4.1 | Page should have skip link |
| `inputImageAlt` | 7 | 1.1.1 | Input images need alt |
| `autoplayMedia` | 3 | 1.4.2 | Media should not autoplay |
| `marqueeElement` | 7 | 2.2.2 | Marquee element not allowed |
| `blinkElement` | 7 | 2.2.2 | Blink element not allowed |
| `metaRefresh` | 3 | 2.2.1 | No auto-refresh |
| `duplicateIdAria` | 7 | 4.1.1 | IDs referenced by ARIA must be unique |
| `emptyTableHeader` | 3 | 1.3.1 | Table headers should not be empty |
| `scopeAttrMisuse` | 3 | 1.3.1 | Scope attribute used correctly |
| `formFieldName` | 7 | 4.1.2 | Form fields need names |

### Angular Material Checks (29)

| Check | Weight | Description |
|-------|--------|-------------|
| `matFormFieldLabel` | 10 | mat-form-field must have label |
| `matSelectPlaceholder` | 7 | mat-select needs placeholder or label |
| `matAutocompleteLabel` | 7 | mat-autocomplete needs label |
| `matDatepickerLabel` | 7 | mat-datepicker needs label |
| `matRadioGroupLabel` | 7 | mat-radio-group needs label |
| `matSlideToggleLabel` | 7 | mat-slide-toggle needs label |
| `matCheckboxLabel` | 7 | mat-checkbox needs label |
| `matChipListLabel` | 7 | mat-chip-list needs label |
| `matSliderLabel` | 7 | mat-slider needs label |
| `matButtonType` | 3 | mat-button should have type |
| `matIconAccessibility` | 10 | mat-icon needs aria-label or aria-hidden |
| `matButtonToggleLabel` | 7 | mat-button-toggle needs label |
| `matProgressBarLabel` | 7 | mat-progress-bar needs label |
| `matProgressSpinnerLabel` | 7 | mat-progress-spinner needs label |
| `matBadgeDescription` | 3 | mat-badge needs description |
| `matMenuTrigger` | 7 | mat-menu trigger needs aria |
| `matSidenavA11y` | 7 | mat-sidenav accessibility |
| `matTabLabel` | 7 | mat-tab needs label |
| `matStepLabel` | 7 | mat-step needs label |
| `matExpansionHeader` | 7 | mat-expansion-panel needs header |
| `matTreeA11y` | 7 | mat-tree accessibility |
| `matListSelectionLabel` | 7 | mat-selection-list needs label |
| `matTableHeaders` | 7 | mat-table needs headers |
| `matPaginatorLabel` | 3 | mat-paginator needs labels |
| `matSortHeaderAnnounce` | 3 | mat-sort-header announcements |
| `matDialogFocus` | 10 | mat-dialog focus management |
| `matBottomSheetA11y` | 7 | mat-bottom-sheet accessibility |
| `matTooltipKeyboard` | 3 | mat-tooltip keyboard access |
| `matSnackbarPoliteness` | 3 | mat-snackbar politeness |

### SCSS Checks (14)

| Check | Weight | Description |
|-------|--------|-------------|
| `colorContrast` | 7 | Text contrast ratio >= 4.5:1 |
| `focusStyles` | 10 | Focus states must be visible |
| `touchTargets` | 7 | Touch targets >= 44x44px |
| `outlineNoneWithoutAlt` | 7 | outline:none needs alternative |
| `prefersReducedMotion` | 3 | Respect prefers-reduced-motion |
| `userSelectNone` | 3 | user-select:none usage |
| `pointerEventsNone` | 3 | pointer-events:none usage |
| `visibilityHiddenUsage` | 3 | visibility:hidden usage |
| `focusWithinSupport` | 3 | :focus-within support |
| `hoverWithoutFocus` | 7 | :hover should have :focus |
| `contentOverflow` | 3 | Content overflow handling |
| `smallFontSize` | 7 | Font size >= 12px |
| `lineHeightTight` | 3 | Line height >= 1.5 |
| `textJustify` | 3 | Avoid text-align: justify |

### Angular Checks (7)

| Check | Weight | Description |
|-------|--------|-------------|
| `clickWithoutKeyboard` | 10 | (click) needs keyboard handler |
| `clickWithoutRole` | 7 | (click) on non-button needs role |
| `routerLinkNames` | 7 | routerLink needs accessible name |
| `ngForTrackBy` | 3 | *ngFor should use trackBy |
| `innerHtmlUsage` | 3 | [innerHTML] security |
| `asyncPipeAria` | 3 | async pipe with aria |
| `autofocusUsage` | 3 | autofocus attribute usage |

### CDK Checks (3)

| Check | Weight | Description |
|-------|--------|-------------|
| `cdkTrapFocusDialog` | 10 | Dialogs must trap focus |
| `cdkAriaDescriber` | 7 | CDK aria describer usage |
| `cdkLiveAnnouncer` | 7 | CDK live announcer usage |

---

## Scoring Algorithm

mat-a11y uses Lighthouse-compatible weighted scoring:

```
Score = (Σ passed_audit_weights) / (Σ all_audit_weights) × 100
```

**Rules:**
1. Each check has a weight (1-10)
2. A check **passes** if it has 0 errors (warnings don't fail)
3. A check is **applicable** if it found elements to test
4. Only applicable checks affect the score

**Example:**
```
buttonNames (weight 10): 0 errors → passes (+10)
imageAlt (weight 10): 2 errors → fails (+0)
colorContrast (weight 7): 0 errors → passes (+7)
focusStyles (weight 10): not applicable (no :focus rules)

Score = (10 + 0 + 7) / (10 + 10 + 7) × 100 = 63%
```

---

## Limitations

- **Static analysis only** - Cannot evaluate runtime behavior
- **CSS variables** - `colorContrast` cannot resolve CSS custom properties
- **Dynamic content** - Content loaded from APIs is not analyzed
- **Not a replacement** - Use alongside Lighthouse and manual testing

## License

MIT - [Robin Spanier](https://robspan.de)
