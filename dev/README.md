# mat-a11y Development Guide

This folder contains development tools for maintaining and extending mat-a11y. These files are **not shipped to npm** - only available when you clone the repository.

## Quick Start

```bash
# Clone the repo
git clone https://github.com/nicobrinkkemper/mat-a11y
cd mat-a11y

# Run all development tests (quick summary)
npm test

# Run with full output
npm test -- --verbose

# Run full dev checks (includes self-test on repo)
npm run dev-check
```

## Parallel Execution Architecture

mat-a11y supports parallel check execution via worker threads for significant performance gains on larger projects.

### Worker Pool Design

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CheckRunner (runner.js)                           │
│                                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ Worker 1 │  │ Worker 2 │  │ Worker 3 │  │ Worker 4 │  │ Worker N │     │
│  │  Batch   │  │  Batch   │  │  Batch   │  │  Batch   │  │  Batch   │     │
│  │ Check A  │  │ Check A  │  │ Check A  │  │ Check A  │  │ Check A  │     │
│  │ Check B  │  │ Check B  │  │ Check B  │  │ Check B  │  │ Check B  │     │
│  │   ...    │  │   ...    │  │   ...    │  │   ...    │  │   ...    │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Worker Modes

| Mode | Workers | Use Case |
|------|---------|----------|
| `'sync'` | 0 | Default, single-threaded (API compatibility) |
| `'auto'` | 4-24 | Smart scaling based on CPU cores and file count |
| `16` | 16 | Explicit worker count (respects user's hardware) |

### Auto Mode Calculation

```javascript
// Auto mode: smart scaling (capped at 24 for safety)
const cpuBasedWorkers = cpuCount - 2;  // Leave room for system + Node
const workBasedWorkers = Math.floor(files / 10);  // ~10 files per worker
const actualWorkers = Math.min(
  Math.max(4, workBasedWorkers),
  cpuBasedWorkers,
  24  // Auto mode cap
);
```

### Performance Benchmarks (noro-wedding: 212 components, 952 issues)

| Workers | Time | Speedup |
|---------|------|---------|
| Sync | 2600ms | 1.00x |
| Auto (21) | 700ms | **3.7x** |
| 32 | 800ms | 3.3x |

### Parity Test

The `verify-parallel-parity.js` test ensures sync and async modes produce **identical results** using SHA-256 hash comparison:

```bash
node dev/tests/verify-parallel-parity.js

# Output:
# Sync hash:  74581d8c6af244c104ad85e0e7e5fd12aefe...
# Async hash: 74581d8c6af244c104ad85e0e7e5fd12aefe...
# ✓ Output hashes match (strict equality)
```

### varContext Serialization

SCSS checks (like `colorContrast`) need variable context for resolving `$variables` and CSS custom properties. Since `Map` objects can't cross worker boundaries, we serialize:

```javascript
// In runner.js (main thread)
const serializedVarContext = {
  scssVars: Array.from(varContext.scssVars),
  cssVars: Array.from(varContext.cssVars),
  maps: Array.from(varContext.maps).map(([k, v]) => [k, Array.from(v)])
};

// In worker.js (worker thread)
function deserializeVarContext(serialized) {
  return {
    scssVars: new Map(serialized.scssVars),
    cssVars: new Map(serialized.cssVars),
    maps: new Map(serialized.maps.map(([k, v]) => [k, new Map(v)]))
  };
}
```

## Project Structure

```
mat-a11y/
├── src/                      # Core source (shipped to npm)
│   ├── checks/               # 82 accessibility checks (flat .js files)
│   ├── formatters/           # 17 output formatters (flat .js files)
│   ├── core/                 # Analysis engine
│   └── index.js              # Main exports
├── bin/
│   └── cli.js                # CLI entry point
├── dev/                      # Development tools (NOT shipped)
│   ├── tests/
│   │   ├── run-all.js        # Test runner (npm test)
│   │   ├── verify-checks.js  # Tests 82 checks against verify files
│   │   ├── verify-parallel-parity.js  # Ensures sync/async produce identical results
│   │   ├── verify-page-resolver.js  # Tests component resolution (51 tests)
│   │   ├── test-error-robustness.js # Edge case handling (82 tests)
│   │   └── verify-files/     # Test files for each check (82 files)
│   ├── verify-structure.js   # Validates verify file sections
│   ├── verify-formatters.js  # Tests formatters (17×17 = 289 tests)
│   ├── benchmark.js          # Performance testing
│   └── fixtures/             # Test fixtures for formatters
└── example-outputs/          # Sample formatter outputs (NOT shipped)
```

## Architecture & Program Flow

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLI ENTRY POINT                                │
│                              bin/cli.js                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            COMPONENT DISCOVERY                              │
│                       src/core/componentAnalyzer.js                         │
│                                                                             │
│  1. Scans project for *.component.ts files                                  │
│  2. Parses @Component decorator to extract:                                 │
│     • templateUrl → external HTML file                                      │
│     • template: `...` → inline HTML                                         │
│     • styleUrls → external SCSS/CSS files                                   │
│     • styles: [`...`] → inline CSS                                          │
│  3. Returns array of component metadata                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CHECK EXECUTION                                  │
│                          src/core/checkRunner.js                            │
│                                                                             │
│  For each component:                                                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │  HTML Checks    │  │  SCSS Checks    │  │  TS Checks      │             │
│  │  (82 checks)    │  │  (colorContrast │  │  (asyncPipeAria │             │
│  │                 │  │   focusStyles   │  │   innerHtmlUsage│             │
│  │  • imageAlt     │  │   lineHeight)   │  │   etc.)         │             │
│  │  • buttonNames  │  │                 │  │                 │             │
│  │  • formLabels   │  │                 │  │                 │             │
│  │  • ariaRoles    │  │                 │  │                 │             │
│  │  • matDialog... │  │                 │  │                 │             │
│  │  • etc.         │  │                 │  │                 │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SCSS ROOT CAUSE ANALYSIS                           │
│                                                                             │
│  ┌─────────────────────────┐    ┌─────────────────────────────────────┐    │
│  │  src/core/scssGraph.js  │    │  src/core/issueOptimizer.js         │    │
│  │                         │    │                                     │    │
│  │  Builds dependency      │───▶│  Collapses duplicate issues:        │    │
│  │  graph from:            │    │                                     │    │
│  │  • @import              │    │  Before: 677 issues                 │    │
│  │  • @use                 │    │  After:  568 issues (16% reduction) │    │
│  │  • @forward             │    │                                     │    │
│  │  • @import url()        │    │  "Fix in _variables.scss instead    │    │
│  │                         │    │   of 50 individual files"           │    │
│  └─────────────────────────┘    └─────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             OUTPUT FORMATTERS                               │
│                            src/formatters/*.js                              │
│                                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  JSON    │ │  HTML    │ │  SARIF   │ │ Markdown │ │  JUnit   │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  Slack   │ │  Teams   │ │ Discord  │ │ GitLab   │ │ SonarQube│          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ DataDog  │ │ Grafana  │ │Prometheus│ │Checkstyle│ │   CSV    │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Project    │     │  Component   │     │    Issues    │     │  Optimized   │
│   Folder     │────▶│   Metadata   │────▶│    Array     │────▶│   Report     │
│              │     │              │     │              │     │              │
│ *.ts         │     │ className    │     │ id, message  │     │ Collapsed    │
│ *.html       │     │ templateFile │     │ file, line   │     │ to root      │
│ *.scss       │     │ styleFiles   │     │ severity     │     │ cause files  │
│              │     │ inlineXXX    │     │ wcag, impact │     │              │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

### File Types Analyzed

| Source Type | Detection | Reported As |
|-------------|-----------|-------------|
| External HTML | `templateUrl: './x.html'` | `x.component.html:15` |
| Inline HTML | `template: \`...\`` | `MyComponent (inline template)` |
| External SCSS | `styleUrls: ['./x.scss']` | `x.component.scss:42` |
| Inline CSS | `styles: [\`...\`]` | `MyComponent (inline styles)` |
| TypeScript | `*.component.ts` | `my.component.ts:88` |

### Core Modules

| Module | Purpose |
|--------|---------|
| `src/core/componentAnalyzer.js` | Discovers Angular components and extracts metadata |
| `src/core/checkRunner.js` | Executes checks in parallel using worker threads |
| `src/core/scssGraph.js` | Builds SCSS/CSS dependency graph from imports |
| `src/core/issueOptimizer.js` | Collapses duplicate issues to root cause files |
| `src/core/pageResolver.js` | Resolves page→component relationships |
| `src/core/errors.js` | Formats error objects with line numbers |

### SCSS Root Cause Analysis

When the same SCSS issue (e.g., low contrast color) appears in multiple components, the optimizer traces back through the import graph to find the shared source:

```
_variables.scss          ← Root cause (fix here once)
    ↓ @import
_theme.scss
    ↓ @use
styles.scss
    ↓ @import
├── header.component.scss    → Issue reported
├── footer.component.scss    → Issue reported  
├── sidebar.component.scss   → Issue reported
└── ... (47 more files)      → Issues reported
```

Instead of reporting 50 separate issues, the optimizer reports 1 issue pointing to `_variables.scss`.

## npm Scripts

| Command | Description |
|---------|-------------|
| `npm test` | Run all dev tests (quick summary) |
| `npm test -- --verbose` | Run all dev tests (full output) |
| `npm run dev-check` | Full check: all tests + self-test on this repo |

## Development Tests

All internal verification lives in `dev/`. Quick summary by default:

```
mat-a11y dev tests (use --verbose for details)

  ✓ Verify Files (82 files)
  ✓ Formatters (17×17)
  ✓ A11y Checks (82 checks)
  ✓ Page Resolver (51 tests)
  ✓ Error Handling (82 edge cases)

✓ All 5 test suites passed
```

### Test Suites

| Suite | What it tests |
|-------|---------------|
| **Verify Files** | All 82 verify files have `@a11y-pass`, `@a11y-fail`, `@a11y-false-positive`, `@a11y-false-negative` sections |
| **Formatters** | 17 formatters × 17 fixtures = 289 format validation tests |
| **A11y Checks** | Each of the 82 checks works correctly against its verify file |
| **Page Resolver** | Component registry building and recursive resolution (51 tests) |
| **Error Handling** | PageResolver and ComponentRegistry handle bad inputs gracefully (82 edge cases) |

### Individual Test Scripts

```bash
# All tests (quick)
npm test

# All tests (verbose)
npm test -- --verbose

# Individual suites
node dev/verify-structure.js
node dev/verify-formatters.js
node dev/tests/verify-checks.js
node dev/tests/verify-page-resolver.js
node dev/tests/test-error-robustness.js
```

## Other Dev Tools

### generate-examples.js

Generates example outputs for all 17 formatters from a real Angular project:

```bash
node dev/generate-examples.js <path-to-angular-project>
```

Outputs go to `example-outputs/`.

### run-checks.js

Runs all development checks in sequence:

```bash
node dev/run-checks.js
node dev/run-checks.js --verbose
```

### benchmark.js

Benchmarks parallel worker performance across different configurations (sync, 1, 4, 8, 16, max workers).

See [Parallel Processing Architecture](#parallel-processing-architecture) below for how the system works internally.

```bash
# Benchmark the src folder (default)
node dev/benchmark.js

# Benchmark a custom path
node dev/benchmark.js ./path/to/project

# Benchmark with fewer runs (faster)
node dev/benchmark.js ./path/to/project 5
```

Example output:
```
============================================================
PARALLEL WORKER BENCHMARK
============================================================

Target:          ./src
Files:           547
CPU threads:     32
Runs per config: 10
Optimal workers: 10 (files / 50)

Testing sync (no workers) .......... 2834ms
Testing 1 worker .......... 2156ms
Testing 4 workers .......... 1463ms
Testing 8 workers .......... 987ms
Testing 16 workers .......... 823ms
Testing max (31 workers) .......... 800ms

============================================================
RESULTS
============================================================

Config                        Avg       Min       Max   vs Sync
-----------------------------------------------------------------
sync (no workers)          2834ms    2801ms    2890ms     1.00x
1 worker                   2156ms    2100ms    2200ms     1.31x
4 workers                  1463ms    1437ms    1495ms     1.94x
8 workers                   987ms     950ms    1020ms     2.87x
16 workers                  823ms     800ms     850ms     3.44x
max (31 workers)            800ms     792ms     811ms     3.54x <-- best

Winner: max (31 workers) (800ms)
Speedup vs sync: 3.54x faster
```

The benchmark automatically calculates optimal worker count based on file count (~50 files per worker).

## Adding a New Check

1. **Create the check file:**
   ```
   src/checks/myNewCheck.js
   ```

2. **Create the verify file** in `dev/tests/verify-files/`:
   ```
   dev/tests/verify-files/myNewCheck.html  # (or .scss for SCSS checks)
   ```

3. **Implement the check** (`src/checks/myNewCheck.js`):
   ```javascript
   'use strict';

   const { format } = require('../core/errors');

   module.exports = {
     name: 'myNewCheck',
     description: 'Human-readable description',
     tier: 'basic',  // basic, material, or full
     type: 'html',   // or 'scss'
     weight: 7,      // 1-10 (Lighthouse-style)
     wcag: '4.1.2',  // WCAG criterion or null

     check(content) {
       const issues = [];
       let elementsFound = 0;

       // Your check logic here
       // Parse content, find issues, push to issues[]

       return { issues, elementsFound };
     }
   };
   ```

4. **Create the verify file** (`dev/tests/verify-files/myNewCheck.html`):
   ```html
   <!-- @a11y-pass -->
   <!-- Obvious good cases -->
   <button aria-label="Save">Save</button>

   <!-- @a11y-fail -->
   <!-- Obvious bad cases -->
   <button></button>

   <!-- @a11y-false-positive -->
   <!-- Tricky accessible code that naive checks might flag -->
   <button><span class="sr-only">Save</span></button>

   <!-- @a11y-false-negative -->
   <!-- Tricky inaccessible code that naive checks might miss -->
   <button aria-label="">Save</button>
   ```

5. **Add to TIERS** in `src/index.js`:
   ```javascript
   const TIERS = {
     basic: {
       html: ['myNewCheck', ...],
     },
     // ...
   };
   ```

6. **Add weight** in `src/core/weights.js`:
   ```javascript
   const WEIGHTS = {
     myNewCheck: 7,
     // ...
   };
   ```

7. **Verify:**
   ```bash
   npm test  # Full test (includes structure verification)
   ```

## Adding a New Formatter

1. **Create the formatter file:**
   ```
   src/formatters/myFormatter.js
   ```

2. **Implement the formatter:**
   ```javascript
   'use strict';

   module.exports = {
     name: 'myFormatter',  // must match filename (without .js)
     description: 'Human-readable description',
     category: 'cicd',        // cicd|monitoring|notifications|code-quality|docs|data
     output: 'json',          // json|xml|text|html
     fileExtension: '.json',
     mimeType: 'application/json',

     format(results, options = {}) {
       // results can be SitemapAnalysisResult, RouteAnalysisResult, or AnalysisResult

       // Normalize to array of URLs/routes
       const urls = results.urls || results.routes || [];

       // Your formatting logic
       const output = {
         // ...
       };

       return JSON.stringify(output, null, 2);
     }
   };
   ```

3. **Test:**
   ```bash
   npm run verify-formatters  # Tests against 21 fixtures
   ```

## Fixture System

### Static Fixtures (`fixtures/sample-results.js`)

Hand-crafted edge cases:
- Empty results
- Single URL
- Multiple URLs
- All passing / all failing / mixed
- Edge cases (no issues, special characters, etc.)

### Generated Fixtures (`fixtures/generateFixtures.js`)

Dynamically generated from real check output:
- Runs actual checks against verify files
- Mixes different categories (HTML, SCSS, Angular, Material, CDK)
- Mixes different severities (Error, Warning)
- Creates realistic test data

## Self-Test System

The self-test verifies:

1. **Check verification** (82 checks):
   - Each check's verify file has pass/fail sections
   - Check finds 0 issues in pass section
   - Check finds >0 issues in fail section

2. **Formatter verification** (14 formatters x 21 fixtures = 294 tests):
   - No crashes with any input type
   - Valid output format (JSON parseable, XML well-formed, etc.)
   - Non-empty output

Run from CLI:
```bash
mat-a11y --self-test
mat-a11y --self-test --full  # Test all 82 checks
```

## GitHub Actions CI

PRs are automatically blocked if self-test fails. See `.github/workflows/ci.yml`.

The CI runs:
1. Structure verification
2. Formatter verification
3. Full self-test

## Package Publishing

### What ships to npm:

- `src/` - Core logic, checks (index.js only), formatters
- `bin/` - CLI
- `README.md`, `CHANGELOG.md`, `LICENSE`

### What stays in git only:

- `dev/` - Development scripts, fixtures, verify files
- `example-outputs/` - Sample formatter outputs
- `.github/` - CI workflows

This is controlled by `package.json`:
```json
"files": [
  "src",
  "bin",
  "README.md",
  "CHANGELOG.md",
  "LICENSE"
]
```

## Debugging Tips

### Run single check:
```bash
mat-a11y ./my-app --check buttonNames
```

### Verbose output:
```bash
mat-a11y ./my-app --verbose
```

### Test formatter output:
```javascript
const { formatters, analyzeBySitemap } = require('./src');
const results = analyzeBySitemap('./my-app');
console.log(formatters.format('sarif', results));
```

### Check fixture generation:
```bash
node dev/fixtures/generateFixtures.js
```

## Parallel Processing Architecture

mat-a11y uses Node.js Worker Threads for parallel check execution. This section documents the internals for contributors.

### Core Files

| File | Purpose |
|------|---------|
| `src/core/runner.js` | `CheckRunner` class - worker pool management, task distribution |
| `src/core/worker.js` | Worker thread - loads checks, processes batches |

### Worker Modes

The `workers` option controls parallelization:

| Mode | Behavior |
|------|----------|
| `'sync'` (default) | Single-threaded, no workers. No overhead. |
| `'auto'` | Calculates optimal workers based on file count. Falls back to sync for small projects. |
| `<number>` | Fixed worker count (e.g., `8`). Workers created immediately on init. |

### Auto Mode Logic

Auto mode intelligently decides whether to use workers:

```
Files < 100  → Run single-threaded (no worker overhead)
Files >= 100 → Calculate optimal workers, initialize lazily, run parallel
```

The threshold is based on `MIN_FILES_PER_WORKER = 50`:
- 82 files → `Math.floor(82/50) = 1` worker → **falls back to sync** (1 worker has no parallelism benefit)
- 547 files → `Math.floor(547/50) = 10` workers → **uses 10 workers**

### Lazy Worker Initialization

In `auto` mode, workers are **not** created during `init()`. They're created lazily in `runChecks()` only when the file count justifies parallelization:

```javascript
// auto mode: init() does nothing
await runner.init();  // No workers created yet

// Only creates workers if file count >= 100
await runner.runChecks(files);  // Workers created here (if needed)
```

This ensures small projects have **zero worker overhead** - identical performance to `sync` mode.

### Batch Processing

Workers process files in batches to minimize message passing overhead:

```
Old approach (per-file):  ~5000 messages for 500 files × 10 checks
New approach (batched):   ~10 messages (one per worker)
```

Each worker receives a chunk of files and all check names, processes them locally, and returns aggregated results:

```javascript
// Worker receives:
{
  type: 'runBatch',
  files: [{ path: '...', content: '...' }, ...],  // ~50-100 files
  htmlCheckNames: ['buttonNames', 'imageAlt', ...],
  scssCheckNames: ['colorContrast', ...]
}

// Worker returns:
{
  type: 'result',
  result: {
    files: [{ path: '...', checks: { ... } }, ...]
  }
}
```

### Performance Characteristics

| Files | Optimal Workers | Speedup vs Sync |
|-------|-----------------|-----------------|
| < 100 | 0 (sync) | 1.0x |
| ~200 | 4 | ~2x |
| ~500 | 10 | ~3.5x |
| ~1000 | 20 | ~4x |

Diminishing returns above ~20 workers due to:
- Worker initialization overhead
- Message serialization cost
- OS scheduling overhead

### Testing Parallel Correctness

To verify parallel and sync modes produce identical results, you can run both modes on the same codebase and compare file count, issue count, and audit score. Any mismatch would indicate a bug in the parallel implementation.

### Testing Page Resolver

The `dev/tests/verify-page-resolver.js` file verifies the deep component resolution feature:

```bash
node dev/tests/verify-page-resolver.js
```

This creates a mock Angular project and tests:
- Component registry building (scanning `.ts` files for `@Component`)
- Selector parsing from HTML templates
- Recursive resolution of child components
- Inline template handling
- Circular reference detection (prevents infinite loops)
- PageResolver class initialization and API

All 51 tests ensure that when analyzing a page like `/home`, we correctly resolve not just `home.component.html` but also `<app-header>`, `<app-nav>`, `<app-footer>`, etc. that make up the real page.
