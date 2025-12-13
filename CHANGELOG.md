# Changelog

All notable changes to mat-a11y will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.1.0] - 2024-12-13

### Added
- **Parallel processing** with Node.js Worker Threads for significant performance gains on large codebases
- Worker modes: `auto` (default), `sync`, or specific number (e.g., `8`)
- Lazy worker initialization in `auto` mode - zero overhead for small projects
- Batch processing to minimize message passing overhead
- `tests/test-parallel.js` for verifying parallel correctness
- `dev-tools/benchmark.js` for testing different worker configurations
- Parallel Processing Architecture section in dev-tools/README.md

### Changed
- Default mode is now `auto` which intelligently decides:
  - < 100 files: runs single-threaded (identical to `sync`)
  - >= 100 files: uses optimal worker count (~50 files per worker)
- CLI flag `-w, --workers` now accepts `auto`, `sync`, or a number

### Performance
- ~500 files: 3.5x faster with `auto` mode vs `sync`
- ~100 files: identical performance (auto falls back to sync)
- Benchmarked on AMD Ryzen 9 8940HX (16 cores / 32 threads)

## [4.0.2] - 2024-12-12

### Fixed
- README documentation updates

## [4.0.1] - 2024-12-12

### Added
- Output path options for CLI (`-o, --output`)
- GitHub Actions workflow for CI self-test

### Changed
- Refactored delivery size calculations
- Improved documentation

## [4.0.0] - 2024-12-11

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

## [3.0.6] - 2024-12-10

### Changed
- Updated Node.js requirements

## [3.0.5] - 2024-12-10

### Fixed
- Minor bug fixes

## [3.0.4] - 2024-12-10

### Fixed
- README updates

## [3.0.3] - 2024-12-09

### Fixed
- Enhanced and fixed several checks

## [3.0.2] - 2024-12-09

### Changed
- Streamlined checks to focus on Material components

## [3.0.1] - 2024-12-09

### Changed
- Improved Material component focus detection

## [3.0.0] - 2024-12-08

### Changed
- Major refocus on Angular Material components
- Renamed from generic a11y linter to mat-a11y

## [2.0.2] - 2024-12-07

### Fixed
- README updates

## [2.0.1] - 2024-12-07

### Changed
- Package.json updates

## [2.0.0] - 2024-12-06

### Added
- Standardized communication patterns
- Enhanced usability features

### Changed
- Major refactoring and documentation improvements

## [1.0.0] - 2024-12-05

### Added
- Initial release
- 82 accessibility checks for Angular Material components
- Support for HTML and SCSS files
- Three-tier system: basic, material, full
- CLI tool with color output
- Self-test verification system
