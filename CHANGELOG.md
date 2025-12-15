# Changelog

All notable changes to mat-a11y will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [6.0.0] - 2025-12-15

### Added
- **Parallel check execution via worker threads** — New `workers` option enables multi-threaded analysis for significant performance gains on larger projects. Use `'auto'` for smart scaling (up to 2x speedup), or specify exact worker count for full control.
- **Smart auto-scaling** — Auto mode calculates optimal worker count based on CPU cores and file count: `min(cpuCount - 2, fileCount / 10, 24)`. Conservative enough for CI/shared hosts, powerful enough for workstations.
- **Early exit optimization for all 82 checks** — Each check now tests for element presence before running expensive regex operations. If no `<button>` exists, `buttonNames` returns immediately.
- **SHA-256 parity test** — New `verify-parallel-parity.js` ensures sync and async modes produce byte-identical results. Uses internal fixtures by default, or accepts a project path argument for testing against real codebases.
- **SCSS variable context in workers** — `colorContrast` and other SCSS checks now receive full variable context (`$vars`, `--custom-props`, SCSS maps) in parallel mode via serialization/deserialization.

### Changed
- **`analyzeByComponentAsync()` function** — New async entry point for parallel analysis. Original `analyzeByComponent()` remains synchronous for backwards compatibility.
- **Worker pool lifecycle** — Workers are lazily initialized only when needed, and terminate after task completion (no persistent background processes).
- **Check execution order** — Cheap presence tests run before expensive regex parsing.
- **Pre-compiled regex patterns** — Top 9 most expensive checks now use module-level compiled patterns instead of creating regex per-call. Eliminates repeated regex compilation overhead.
- **Binary search for line numbers** — Checks that report line numbers now use O(log n) binary search on a lazily-built line index instead of O(n) substring splits.
- **Consolidated regex patterns** — Multiple similar patterns combined into single alternation patterns (e.g., three aria-label variants → one pattern with `|` alternation).
- **Label cache for form checks** — `formLabels` now builds a Set of all `<label for="id">` elements once, enabling O(1) lookups instead of O(n) regex search per input.

### Performance
Benchmarks on noro-wedding (217 components, 1036 issues):

| Mode | Time | vs v5.6 |
|------|------|---------|
| v5.6 sync | ~2600ms | baseline |
| v6.0 sync (optimized checks) | 1671ms | **1.6x faster** |
| v6.0 parallel (auto) | 798ms | **3.3x faster** |

**Individual check improvements (top 9):**

| Check | Before | After | Improvement |
|-------|--------|-------|-------------|
| buttonNames | 91µs | 75µs | 18% faster |
| colorContrast | 86µs | 79µs | 8% faster |
| formLabels | 83µs | 70µs | 16% faster |
| linkNames | 59µs | 53µs | 10% faster |
| matIconAccessibility | 56µs | 49µs | 13% faster |
| matCheckboxLabel | 54µs | 49µs | 9% faster |
| imageAlt | 37µs | 33µs | 11% faster |
| smallFontSize | 34µs | 32µs | 6% faster |
| lineHeightTight | 34µs | 23µs | 32% faster |

### Migration
- **No breaking API changes** — Default behavior unchanged (`workers: 'sync'`).
- **Opt-in parallelism** — Use `workers: 'auto'` or `workers: N` to enable.
- **CLI unchanged** — Parallel execution coming in future CLI update.

## [5.6.0] - 2025-12-15

### Added
- **SCSS/CSS variable resolution for color contrast** — The `colorContrast` check now resolves SCSS variables (`$primary-color`), CSS custom properties (`var(--bg)`), SCSS maps (`map-get($colors, 'primary')`), and color functions (`lighten()`, `darken()`, `mix()`, etc.) before checking contrast ratios. Previously, rules using variables were skipped entirely — a blind spot in well-architected projects using design tokens.
- **New `src/core/colorMath.js`** — RGB ↔ HSL ↔ HEX color conversions with `parseToRgb()` supporting hex, rgb(), rgba(), hsl(), hsla(), and 147 named CSS colors.
- **New `src/core/scssColorFunctions.js`** — Implements 20+ SCSS color functions: `lighten`, `darken`, `saturate`, `desaturate`, `adjust-hue`, `complement`, `invert`, `mix`, `rgba`, `rgb`, `hsl`, `hsla`, `transparentize`, `opacify`, `grayscale`, `adjust-color`, `scale-color`, `change-color`.
- **New `src/core/scssParser.js`** — Parses `$variable` and `--custom-property` definitions from SCSS/CSS files, handles `!default`, and extracts SCSS maps.
- **New `src/core/scssMapResolver.js`** — Resolves `map-get()`, `map-has-key()`, `map-keys()`, `map-values()`, and `map-merge()` expressions.
- **New `src/core/cssCustomProperties.js`** — Resolves `var(--name)` and `var(--name, fallback)` expressions with proper fallback handling.
- **New `src/core/variableResolver.js`** — Main orchestrator that builds variable context from SCSS files and resolves chained variable references.
- **New test suites** — `test-scss-functions.js` (43 tests), `test-variable-resolver.js` (27 tests), `test-color-contrast-variables.js` (20 tests for integration testing against false positives/negatives).
- **Verifier variable context** — The check verifier now builds variable context from verify files, enabling SCSS checks to be tested with inline variable definitions.

### Changed
- **`colorContrast` check accuracy** — Now catches contrast issues in SCSS using design tokens. Before: skipped all variable-based colors. After: resolves to actual color values and checks contrast.
- **`componentAnalyzer`** — Now builds variable context once per analysis run and passes it to SCSS checks for accurate resolution.
- **`buildContext()` flexibility** — Now accepts either a project directory path OR an array of SCSS content strings, enabling both runtime analysis and unit testing.

## [5.5.0] - 2025-12-15

### Added
- **SCSS root cause analysis** - When multiple components have the same SCSS issue (e.g. missing `prefers-reduced-motion`), mat-a11y traces `@import`/`@use` dependencies to find the shared source file. Instead of 10 duplicate issues, you get 1 issue pointing to the root cause with "(fixes 10 files)" annotation. Reduces backlog by 50-80% on typical projects.
- **New `src/core/scssGraph.js`** - Builds SCSS dependency graph by parsing `@import`, `@use`, and `@forward` statements. Handles partials (`_file.scss`), index files, and circular imports.
- **New `src/core/issueOptimizer.js`** - Post-processor that collapses duplicate issues to their common ancestor in the SCSS graph.
- **`--no-collapse` CLI flag** - Disable root cause analysis if you need the raw issue list.

## [5.4.2] - 2025-12-14

### Changed
- **Underscore prefix for generated files** - All output files now use `_mat-a11y.*` prefix (e.g. `_mat-a11y.backlog.txt`, `_mat-a11y.html`) to clearly indicate they are generated and should not be edited
- **Renamed TODO to backlog** - Default AI output renamed from `.todo.txt` to `.backlog.txt` - reflects that issues can be fixed in any order and the file regenerates on each run
- **Generated file headers** - All formatters now include appropriate "Generated by mat-a11y" notices (XML comments, JSON `_generated` metadata, HTML meta tags, etc.)

## [5.4.1] - 2025-12-14

### Changed
- **AI TODO output no longer uses checkboxes** - Removed `[ ]` / “mark [x]” wording; TODO items are now plain list lines and instruct re-running `npx mat-a11y` to regenerate the TODO

## [5.4.0] - 2025-12-14

### Added
- **Result normalization contract for formatters** - Formatters now consume a stable `{ total, distribution, entities, issues }` shape regardless of analysis mode (component / sitemap / file-based)
- **Normalization fixtures + tests** - Ensures consistent formatter inputs across result shapes
- **CLI matrix dev test** - Runs a bounded set of CLI configurations and verifies they produce outputs
- **Package contents dev test** - Verifies `npm pack --dry-run` does not include dev-only folders (e.g. `dev/`, `.github/`, `.husky/`)
- **Pre-commit tests (Husky)** - `npm test` runs automatically on `git commit`

### Changed
- **CLI output responsibility** - CLI is orchestration-only; formatting is routed through formatters (removed legacy inline formatting code)
- **Component analysis semantics** - Totals/distribution reflect all analyzed components; the component list remains “failing only” to keep outputs small
- **Formatter wording** - Outputs no longer assume entities are URLs when running component analysis

### Fixed
- **Formatter loader crash from AI formatter syntax error** - AI formatter now loads reliably in all CLI runs
- **CLI shortcut output naming precedence** - `-o` always wins; shortcuts set correct default filenames
- **Pre-commit reliability across shells** - Husky hook no longer depends on direct `npm` execution, improving compatibility on Windows Git Bash, WSL, and macOS/Linux

## [5.3.1] - 2025-12-14

### Fixed
- **AI formatter empty output** - Now correctly handles component-based results (was showing "No issues found")
- **Removed static analysis warning from AI report** - Cleaner output for AI assistants to process

## [5.3.0] - 2025-12-14

### Added
- **New `analyzeByComponent()` function** - Scans all `@Component` files directly for complete coverage
- **Component-based analysis as default** - CLI now uses component-based analysis by default (was sitemap-based)
- **`--sitemap` flag** - Use sitemap + routes analysis for SEO/Google crawl view
- **Clean component count** - Output now shows both clean and problematic components

### Changed
- **Default analysis mode** - Now scans all `@Component` files instead of relying on sitemap/routes
  - Before: 35 components found (sitemap-based)
  - After: 307 components found (complete coverage)
- **Sitemap analyzer improvements**:
  - Removed 50-route limit on internal routes (now analyzes all)
  - Clean components now properly counted and displayed
  - Output shows: `🟢 Clean (no issues): 115` / `🟡 Has Issues: 52`
- **README updated** with new analysis modes, Real-World Results section, and traufix.de case study

### Fixed
- **Missing components in sitemap mode** - Internal routes were limited to 50, now analyzes all
- **Clean count always showing 0** - `groupByComponent()` now tracks components without issues

## [5.2.2] - 2025-12-14

### Fixed
- **Route analyzer default mode** - Now correctly defaults to component-level (`deepResolve: false`), was incorrectly defaulting to page-level
- **CLI `--deep` flag** - Now correctly passed to route analyzer (was being ignored)

### Changed
- **Console output now component-based** - Default mode shows components with issue counts instead of routes with scores
  - `COMPONENT SCORES (35 components)` instead of `ROUTE SCORES (67 routes)`
  - `COMPONENTS WITH ISSUES:` lists components sorted by issue count
  - `FIX PRIORITIES:` shows component name, affected routes, and top issues
- **Page-level output (`--deep`)** - Shows `PAGE SCORES` and `PAGES:` with per-page scores (Lighthouse-like)

## [5.2.1] - 2025-12-13

### Changed
- **Console output terminology updated** for clarity:
  - Header: `SITEMAP ANALYSIS` → `COMPONENT ANALYSIS` / `PAGE ANALYSIS` (based on mode)
  - Scores: `URL SCORES` → `ROUTE SCORES` / `PAGE SCORES`
  - Lists: `URLS:` → `ROUTES:`
  - Internal: `INTERNAL PAGES` → `INTERNAL ROUTES`
- **HTML report** - Title and labels now reflect analysis mode
- **Route analyzer** - Now shows mode information like sitemap analyzer

## [5.2.0] - 2025-12-13

### Changed
- **Component-level analysis by default** - Each component analyzed independently (better for fixing)
- **AI formatter groups by component name** - Shows `COMPONENT: ImagePreviewComponent` instead of file paths
- **Realistic issue counts** - Same issue in same file counts once (no URL multiplication)
- **AFFECTS line** - Shows which routes are impacted by each component

### Added
- `--deep` flag for page-level analysis (bundles parent + child components, Lighthouse-like scores)
- Static analysis warning in AI report (explains *ngIf, *ngFor limitations)

### Breaking Change
- Default mode changed from `deepResolve: true` to `deepResolve: false`
- This dramatically reduces issue counts (e.g., 3303 → 541) by not bundling child components
- Use `--deep` flag to restore previous behavior

## [5.1.3] - 2025-12-13

### Fixed
- AI formatter now correctly handles route-based analysis results (was showing "No issues found")

### Changed
- Default path changed from `./src` to `.` (project root) — sitemap.xml now found automatically

## [5.1.2] - 2025-12-13

### Changed
- DRYed up README (removed duplicate examples and redundant sections)

## [5.1.1] - 2025-12-13

### Changed
- Improved README intro clarity

## [5.1.0] - 2025-12-13

### Added
- **AI-first defaults** - Running `npx mat-a11y` now outputs AI-optimized backlog format by default
- **17 format shortcuts** - All formats now have simple flags: `--sarif`, `--junit`, `--sonar`, `--slack`, etc.
- **Smart defaults** - Scans `./src` (Angular convention), full 82 checks, auto-named output files
- New formatters: `ai.js` (TODO list), `json.js`, `html.js`

### Changed
- Default format changed from console to AI backlog (`_mat-a11y.backlog.txt`)
- Default tier changed from `basic` to `full` (82 checks)
- Default path changed to `./src` when no path specified
- `--html` now outputs to `_mat-a11y.html` (was `mat-a11y-report.html`)
- `--json` now outputs to `_mat-a11y.json` (was `mat-a11y-report.json`)
- Simplified CLI help with format grid and clear defaults section
- README rewritten with AI-first focus and one-liner usage

### Format Shortcuts
All formats now work as simple flags (full scan on ./src, auto filename):
- CI/CD: `--sarif`, `--junit`, `--github`, `--gitlab`
- Quality: `--sonar`, `--checkstyle`
- Monitoring: `--prometheus`, `--grafana`, `--datadog`
- Notifications: `--slack`, `--discord`, `--teams`
- Docs: `--markdown`, `--csv`

## [4.2.0] - 2025-12-13

### Added
- **Deep Component Resolution** - Pages now analyzed with all child components, not just the route component
- `PageResolver` class - Preprocessing step that builds component registry and resolves page dependencies
- `createPageResolver()` - Factory function for easy page resolution
- `buildComponentRegistry()` - Scans all `.ts` files to find `@Component` decorators and their selectors
- Support for inline templates (`template:`) in addition to `templateUrl:`
- `childComponents` array in analysis results showing which components were found
- `deepResolve` stats in results: `componentsInRegistry`, `childComponentsAnalyzed`

### Changed
- Both `analyzeBySitemap()` and `analyzeByRoute()` now use PageResolver as preprocessing
- Deep resolution enabled by default (disable with `{ deepResolve: false }`)
- Refactored component resolution into shared `pageResolver.js` module
- **Flattened project structure**: Checks and formatters are now single `.js` files instead of folders
  - `src/checks/buttonNames.js` instead of `src/checks/buttonNames/index.js`
  - `src/formatters/sarif.js` instead of `src/formatters/sarif/index.js`
- Verify files moved to `dev/tests/verify-files/<checkName>.html|scss`
- All internal tests consolidated in `dev/tests/`

### Architecture
- Preprocessing is now a shared step for both sitemap and route analysis
- Component registry built once, reused for all pages
- Recursive resolution handles nested components (prevents infinite loops)

## [4.1.2] - 2025-12-13

### Improved
- README now explains both scoring metrics (Audit Score + Element Coverage)
- Clarified why Lighthouse-style scoring is used
- Added Analysis Mode section explaining sitemap → route → file priority
- Documented why sitemap-first approach (SEO-critical pages)

## [4.1.1] - 2025-12-13

### Fixed
- Default worker mode changed to `sync` for backwards compatibility
- `analyze()` now returns value (not Promise) by default
- Use `-w auto` to opt-in to parallel processing

## [4.1.0] - 2025-12-13

### Added
- **Parallel processing** with Node.js Worker Threads for significant performance gains on large codebases
- Worker modes: `sync` (default), `auto`, or specific number (e.g., `8`)
- Lazy worker initialization in `auto` mode - zero overhead for small projects
- Batch processing to minimize message passing overhead
- `dev/benchmark.js` for testing different worker configurations
- Parallel Processing Architecture section in dev/README.md

### Changed
- CLI flag `-w, --workers` now accepts `sync`, `auto`, or a number
- Default remains `sync` for backwards compatibility (no breaking changes)
- Use `-w auto` to enable parallel processing

### Performance
- ~500 files: 3.5x faster with `-w auto` vs default sync
- ~100 files: identical performance (auto falls back to sync)
- Benchmarked on AMD Ryzen 9 8940HX (16 cores / 32 threads)

## [4.0.2] - 2025-12-13

### Fixed
- README documentation updates

## [4.0.1] - 2025-12-13

### Added
- Output path options for CLI (`-o, --output`)
- GitHub Actions workflow for CI self-test

### Changed
- Refactored delivery size calculations
- Improved documentation

## [4.0.0] - 2025-12-12

### Added
- **14 output formatters** for CI/CD integration:
  - CI/CD: SARIF, JUnit, GitHub Annotations, GitLab Code Quality, Checkstyle
  - Monitoring: Datadog, Prometheus, Grafana JSON
  - Notifications: Slack, Discord, Microsoft Teams
  - Code Quality: SonarQube, CSV
  - Documentation: Markdown
- Lighthouse-style scoring with weighted checks
- `elementsFound` tracking for accurate audit scores
- Formatter verification system (294 tests across 21 fixtures)
- TDD-based development for all checks and formatters

### Changed
- Scoring now uses elements found, not total tests
- Major improvements to reporting accuracy

## [3.0.6] - 2025-12-12

### Changed
- Updated Node.js requirements

## [3.0.5] - 2025-12-12

### Fixed
- Minor bug fixes

## [3.0.4] - 2025-12-12

### Fixed
- README updates

## [3.0.3] - 2025-12-12

### Fixed
- Enhanced and fixed several checks

## [3.0.2] - 2025-12-12

### Changed
- Streamlined checks to focus on Material components

## [3.0.1] - 2025-12-12

### Changed
- Improved Material component focus detection

## [3.0.0] - 2025-12-12

### Changed
- Major refocus on Angular Material components
- Renamed from generic a11y linter to mat-a11y

## [2.0.2] - 2025-12-11

### Fixed
- README updates

## [2.0.1] - 2025-12-11

### Changed
- Package.json updates

## [2.0.0] - 2025-12-11

### Added
- Standardized communication patterns
- Enhanced usability features

### Changed
- Major refactoring and documentation improvements

## [1.0.0] - 2025-12-11

### Added
- Initial release
- 82 accessibility checks for Angular Material components
- Support for HTML and SCSS files
- Three-tier system: basic, material, full
- CLI tool with color output
- Self-test verification system
