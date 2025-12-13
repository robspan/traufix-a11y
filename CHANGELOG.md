# Changelog

All notable changes to mat-a11y will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- **AI-first defaults** - Running `npx mat-a11y` now outputs AI-optimized TODO format by default
- **17 format shortcuts** - All formats now have simple flags: `--sarif`, `--junit`, `--sonar`, `--slack`, etc.
- **Smart defaults** - Scans `./src` (Angular convention), full 82 checks, auto-named output files
- New formatters: `ai.js` (TODO list), `json.js`, `html.js`

### Changed
- Default format changed from console to AI TODO list (`mat-a11y.todo.txt`)
- Default tier changed from `basic` to `full` (82 checks)
- Default path changed to `./src` when no path specified
- `--html` now outputs to `mat-a11y.html` (was `mat-a11y-report.html`)
- `--json` now outputs to `mat-a11y.json` (was `mat-a11y-report.json`)
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
