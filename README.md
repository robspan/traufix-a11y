# mat-a11y

[![npm version](https://img.shields.io/npm/v/mat-a11y.svg)](https://www.npmjs.com/package/mat-a11y)
[![license](https://img.shields.io/npm/l/mat-a11y.svg)](./LICENSE)
[![node](https://img.shields.io/node/v/mat-a11y.svg)](https://nodejs.org)

**Accessibility linter for Angular Material.** 82 checks. AI-optimized output. Validated with Claude Opus 4.5.

```bash
npx mat-a11y
```

Generates `mat-a11y.todo.txt` — paste into Claude/ChatGPT/Cursor and let AI fix the issues.

```bash
npx mat-a11y --html   # → mat-a11y.html
npx mat-a11y --json   # → mat-a11y.json
```

<details>
<summary><strong>📊 14 more formats</strong></summary>

```bash
# CI/CD
npx mat-a11y --sarif       # GitHub Security tab
npx mat-a11y --junit       # Jenkins, GitLab, any CI
npx mat-a11y --github      # GitHub PR annotations
npx mat-a11y --gitlab      # GitLab Code Quality

# Code Quality
npx mat-a11y --sonar       # SonarQube
npx mat-a11y --checkstyle  # Checkstyle XML

# Monitoring
npx mat-a11y --prometheus  # Prometheus
npx mat-a11y --grafana     # Grafana
npx mat-a11y --datadog     # Datadog

# Notifications
npx mat-a11y --slack       # Slack
npx mat-a11y --discord     # Discord
npx mat-a11y --teams       # MS Teams

# Docs
npx mat-a11y --markdown    # Markdown
npx mat-a11y --csv         # CSV/Excel
```

</details>

---

## The Problem

Accessibility is important, but fixing it is expensive. Manual audits, expert consultants, endless backlogs. Most teams know they *should* do better, but ship inaccessible apps because the cost is too high.

**We built mat-a11y to change that.**

The workflow:
1. **mat-a11y finds** every accessibility issue in your codebase (static analysis)
2. **mat-a11y generates** a structured TODO list optimized for AI
3. **Your AI fixes** the issues (we validated with Claude Opus 4.5)

---

## Why mat-a11y?

**Traditional tools are too slow for AI workflows.**

Tools like Lighthouse, axe, and WAVE run in the browser against compiled, rendered HTML. That means: build your app, launch a browser, navigate to each page, wait for rendering, run the audit. For a 50-page app, that's 10+ minutes just to get a list of issues.

**In the age of AI, that's unacceptable.** When Claude can fix 100 issues in 30 seconds, you can't spend 10 minutes waiting for the audit.

mat-a11y analyzes your **source code directly** — no build, no browser, no waiting:

| | Traditional (Lighthouse) | mat-a11y |
|--|-------------------------|----------|
| **Analyzes** | Compiled HTML in browser | Source templates directly |
| **Speed** | ~10 min for 50 pages | ~3 sec for 50 pages |
| **Sees** | `<div class="mat-form-field">` | `<mat-form-field>` |
| **AI-ready** | Copy/paste from browser | Direct TODO output |

**Plus, mat-a11y understands Angular Material:**

| What Lighthouse Sees | What mat-a11y Sees |
|---------------------|-------------------|
| `<div class="mat-form-field">` | `<mat-form-field>` missing a label |
| `<span class="mat-icon">` | `<mat-icon>` without `aria-label` or `aria-hidden` |
| Generic button markup | `<button mat-button>` missing accessible name |
| Rendered dialog HTML | `<mat-dialog>` not trapping keyboard focus |

**Key features:**
- **82 accessibility checks** across HTML, SCSS, Angular, Material, and CDK
- **Lighthouse-style 0-100 scoring** per page from your sitemap
- **AI-optimized output** — designed for Claude Opus 4.5, GPT-4, and other LLMs to fix automatically

---

## Quick Start

```bash
npx mat-a11y
```

That's it. Scans current directory, runs all 82 checks, outputs `mat-a11y.todo.txt`.

```
ACCESSIBILITY TODO: 1750 issues in 72 files
Mark [x] when fixed. Re-run linter to verify.

────────────────────────────────────────
FILE: app/components/header/header.html
────────────────────────────────────────
[ ] matIconAccessibility: <mat-icon>menu</mat-icon> (×3)
    → Add aria-hidden="true" OR aria-label="description"
[ ] buttonNames: <button mat-icon-button> (×2)
    → Add aria-label OR visible text
```

Paste the output into your AI assistant and let it fix the issues file-by-file.

---

## Core Concepts

### Scoring

mat-a11y provides **two complementary metrics**:

| Metric | Formula | Purpose |
|--------|---------|---------|
| **Audit Score** | `(passing audit weights) / (total weights) × 100` | Severity-weighted, Lighthouse-compatible |
| **Element Coverage** | `elementsPassed / elementsChecked × 100` | Actual fix progress |

**Audit Score (0-100%)** — Used by all formatters, CI thresholds, and reports:

| Score | Status | Meaning |
|-------|--------|---------|
| 90-100% | Passing | Good shape, minor issues only |
| 50-89% | Needs Work | Has accessibility problems to fix |
| < 50% | Failing | Significant issues blocking users |

**Why two metrics?** Audit Score tells you *severity* — fixing one critical button issue (weight 10) improves your score more than fixing ten minor heading issues (weight 3). Element Coverage tells you *progress* — how many actual elements you've fixed. Use Audit Score for CI gates, Element Coverage for tracking cleanup work.

### Tiers

Choose a tier based on what you're working on:

| Tier | Checks | When to Use |
|------|--------|-------------|
| `--full` | 82 | **Default.** Comprehensive scan |
| `--basic` | 43 | Quick wins for daily development |
| `--material` | 29 | Only Angular Material component issues |
| `--angular` | 10 | Only template and event binding issues |

```bash
mat-a11y              # Full scan (default)
mat-a11y --basic      # Quick 43-check scan
```

### Analysis Mode

mat-a11y automatically detects the best analysis approach:

| Priority | Mode | When Used |
|----------|------|-----------|
| 1 | **Sitemap** | `sitemap.xml` found — analyzes exactly what Google crawls |
| 2 | **Route** | No sitemap — detects Angular routes from `app-routing.module.ts` |
| 3 | **File** | No routes — scans all HTML/SCSS files |

```bash
mat-a11y                    # Auto-detect (sitemap → route → file)
mat-a11y --file-based       # Force file-based analysis
```

**Why sitemap-first?** Your sitemap defines what search engines crawl. Pages not in your sitemap won't rank. Analyzing sitemap URLs ensures your SEO-critical pages are accessible.

### Deep Component Resolution

**Real accessibility testing requires analyzing entire pages, not just single components.**

When Lighthouse runs on your deployed app, it sees the complete rendered page — your header, navigation, content, and footer all together. But static analysis tools typically only see the route component's template, missing all the child components that make up the actual page.

**mat-a11y solves this with deep component resolution:**

```
Route: /home → HomeComponent
                    │
                    ├── <app-header>     → header.component.html ✓
                    ├── <app-navigation> → navigation.component.html ✓
                    ├── <app-hero>       → hero.component.html ✓
                    └── <app-footer>     → footer.component.html ✓
                    
Traditional tools: analyze 1 file
mat-a11y:          analyze 5 files (the real page)
```

**How it works:**
1. **Preprocessing**: Scans all `.ts` files to build a registry of component selectors
2. **Resolution**: For each page, finds `<app-*>` tags and recursively resolves their templates
3. **Analysis**: Runs accessibility checks on all templates that make up the page

This means if your `<app-header>` has an inaccessible button, it will be reported on every page that uses that header — just like a real user would experience it.

```javascript
// See what mat-a11y resolves for a page
const { createPageResolver } = require('mat-a11y');

const resolver = createPageResolver('./my-angular-app');
console.log(`Found ${resolver.getStats().total} components`);

const page = resolver.resolvePage('./src/app/home/home.component.html');
console.log('Child components:', page.components);
// ['app-header', 'app-nav', 'app-hero', 'app-footer']
console.log('Files analyzed:', page.htmlFiles.length);
// 5 (home + 4 children)
```

**Disable if needed:** `analyzeBySitemap(dir, { deepResolve: false })`

### Checks

82 checks across 5 categories:

| Category | Count | What It Covers |
|----------|-------|----------------|
| **HTML** | 29 | Images, buttons, forms, links, ARIA, headings, tables |
| **Material** | 29 | Form fields, dialogs, icons, menus, tabs, steppers, trees |
| **SCSS** | 14 | Color contrast, focus styles, touch targets, font sizes |
| **Angular** | 7 | Click handlers, keyboard events, routerLinks |
| **CDK** | 3 | Focus trapping, live announcer, aria describer |

```bash
mat-a11y --list-checks  # See all 82 with descriptions
```

---

## Usage Guide

### CLI

```bash
# Just run it (scans current dir, full checks, AI output)
mat-a11y

# Different formats
mat-a11y --html                   # Visual HTML report
mat-a11y --sarif                  # GitHub Security tab
mat-a11y --junit                  # CI/CD pipelines

# Options
mat-a11y ./other-dir              # Custom path
mat-a11y --basic                  # Quick 43-check scan
mat-a11y -i "**/*.spec.ts"        # Ignore patterns
mat-a11y --check imageAlt         # Run single check
mat-a11y -w auto                  # Parallel workers
```

<details>
<summary><strong>Full CLI Reference</strong></summary>

```
mat-a11y [path] [options]

Defaults: scans current directory, full tier (82 checks), AI format → mat-a11y.todo.txt

Formats (shortcut flags):
  --html, --json, --sarif, --junit, --github, --gitlab
  --sonar, --checkstyle, --prometheus, --grafana, --datadog
  --slack, --discord, --teams, --markdown, --csv

Tiers:
  --full               All 82 checks (default)
  --basic              Quick 43 checks
  --material           Only mat-* checks (29)
  --angular            Only Angular + CDK checks (10)

Output:
  -f, --format <name>  Output format (ai, json, sarif, etc.)
  -o, --output <path>  Custom output path

Performance:
  -w, --workers <mode> sync (default), auto, or number

Options:
  -i, --ignore <pat>   Ignore pattern (repeatable)
  --check <name>       Run single check only
  --list-checks        List all checks
  --file-based         Force file-based analysis
  -h, --help           Show help
  -v, --version        Show version
```

</details>

### Parallel Processing

For large codebases (500+ files):

```bash
mat-a11y              # Single-threaded (default)
mat-a11y -w auto      # Auto-optimized workers
mat-a11y -w 8         # Exactly 8 workers
```

| Project Size | Sync | Auto (`-w auto`) |
|--------------|------|------------------|
| ~100 files   | ~60ms | ~60ms (same) |
| ~500 files   | ~2.8s | ~0.8s (3.5x faster) |

*Benchmarked on AMD Ryzen 9 8940HX (16 cores / 32 threads)*

**How it works:** In `auto` mode, the runner calculates the optimal worker count (~50 files per worker). For 500 files, it uses ~10 workers regardless of CPU count, avoiding overhead from too many workers. For small projects (<100 files), `auto` falls back to single-threaded mode.

**When to use:**
- **`sync` (default):** Predictable, no async - works everywhere
- **`-w auto`:** Large codebases (500+ files) for significant speedup
- **`-w <number>`:** When you want explicit control

### Output Formats

17 formats. All work as `--shortcut` flags:

| Category | Shortcuts |
|----------|----------|
| **Reports** | `--json`, `--html` |
| **AI** | (default) |
| **CI/CD** | `--sarif`, `--junit`, `--github`, `--gitlab` |
| **Quality** | `--sonar`, `--checkstyle` |
| **Monitoring** | `--prometheus`, `--grafana`, `--datadog` |
| **Notifications** | `--slack`, `--discord`, `--teams` |
| **Data** | `--markdown`, `--csv` |

Custom output: `mat-a11y -f sarif -o custom-name.sarif`

### AI-Assisted Fixing

The default output (`mat-a11y.todo.txt`) is designed for AI to fix:

**Tips:**
- **Parallel sessions** — Open the TODO, let AI work through files
- **File-by-file** — Issues grouped by file for systematic fixing
- **Counts** — `(×67)` means 67 identical issues; fix pattern once
- **Verify** — Re-run `mat-a11y` after fixes; list shrinks

**Prompt example:**
```
Read mat-a11y.todo.txt. For each file, apply the fixes and mark [x] done.
```

**Validated models:**

| Model | Status |
|-------|--------|
| Claude Opus 4.5 | ✅ Validated (our daily driver) |
| Claude Sonnet 4 | ✅ Validated |
| GPT-4o | Should work |
| Cursor / Windsurf | Should work |

*mat-a11y does not include or require any AI. Bring your own.*

### CI/CD Integration

```yaml
# .github/workflows/a11y.yml
name: Accessibility
on: [push, pull_request]

jobs:
  a11y:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npx mat-a11y --json
      - uses: actions/upload-artifact@v4
        with:
          name: a11y-report
          path: mat-a11y-report.json
```

**Exit codes:** `0` = passing, `1` = failing, `2` = error

---

## Programmatic API

<details>
<summary><strong>Analysis Functions</strong></summary>

```javascript
const {
  analyzeBySitemap,  // Sitemap-based (recommended)
  analyzeByRoute,    // Route-based
  analyze,           // File-based (legacy)
  basic, material, angular, full  // Shortcuts
} = require('mat-a11y');

const results = analyzeBySitemap('./app', { tier: 'full' });
console.log(`Score: ${results.urls[0].auditScore}%`);

// Control parallelization
const syncResults = analyze('./app', { tier: 'full' }); // sync (default)
const autoResults = await analyze('./app', { tier: 'full', workers: 'auto' }); // auto (async)
const fixedResults = await analyze('./app', { tier: 'full', workers: 8 }); // 8 workers (async)
```

</details>

<details>
<summary><strong>Formatters</strong></summary>

```javascript
const { formatters } = require('mat-a11y');

formatters.listFormatters();           // ['sarif', 'junit', ...]
formatters.format('sarif', results);   // Formatted string
formatters.getFormatter('junit');      // Formatter module
```

</details>

<details>
<summary><strong>TypeScript Types</strong></summary>

```typescript
import {
  analyze, analyzeBySitemap, analyzeByRoute,
  Tier, AnalysisResult, SitemapAnalysisResult,
  UrlResult, Issue, AuditResult,
  formatters, Formatter
} from 'mat-a11y';

type Tier = 'basic' | 'material' | 'angular' | 'full';

interface UrlResult {
  url: string;
  auditScore: number;  // 0-100
  issues: Issue[];
  audits: AuditResult[];
}
```

Full types: [`src/index.d.ts`](./src/index.d.ts)

</details>

<details>
<summary><strong>All 82 Checks Reference</strong></summary>

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
| `headingOrder` | 3 | 1.3.1 | Headings in logical order |
| `tableHeaders` | 7 | 1.3.1 | Tables must have headers |
| `iframeTitles` | 7 | 2.4.1 | Iframes must have titles |
| `listStructure` | 3 | 1.3.1 | Lists use proper structure |
| `dlStructure` | 3 | 1.3.1 | Definition lists structured |
| `videoCaptions` | 10 | 1.2.2 | Videos must have captions |
| `objectAlt` | 7 | 1.1.1 | Objects need text alternatives |
| `accesskeyUnique` | 3 | 4.1.1 | Accesskeys must be unique |
| `tabindex` | 3 | 2.4.3 | No positive tabindex |
| `ariaHiddenBody` | 10 | 4.1.2 | Body not aria-hidden |
| `htmlHasLang` | 7 | 3.1.1 | HTML has lang attribute |
| `metaViewport` | 7 | 1.4.4 | Viewport allows zoom |
| `skipLink` | 3 | 2.4.1 | Page has skip link |
| `inputImageAlt` | 7 | 1.1.1 | Input images need alt |
| `autoplayMedia` | 3 | 1.4.2 | No autoplay media |
| `marqueeElement` | 7 | 2.2.2 | No marquee element |
| `blinkElement` | 7 | 2.2.2 | No blink element |
| `metaRefresh` | 3 | 2.2.1 | No auto-refresh |
| `duplicateIdAria` | 7 | 4.1.1 | ARIA IDs unique |
| `emptyTableHeader` | 3 | 1.3.1 | Table headers not empty |
| `scopeAttrMisuse` | 3 | 1.3.1 | Scope used correctly |
| `formFieldName` | 7 | 4.1.2 | Form fields have names |

### Angular Material Checks (29)

| Check | Weight | Description |
|-------|--------|-------------|
| `matFormFieldLabel` | 10 | mat-form-field has label |
| `matSelectPlaceholder` | 7 | mat-select has placeholder/label |
| `matAutocompleteLabel` | 7 | mat-autocomplete has label |
| `matDatepickerLabel` | 7 | mat-datepicker has label |
| `matRadioGroupLabel` | 7 | mat-radio-group has label |
| `matSlideToggleLabel` | 7 | mat-slide-toggle has label |
| `matCheckboxLabel` | 7 | mat-checkbox has label |
| `matChipListLabel` | 7 | mat-chip-list has label |
| `matSliderLabel` | 7 | mat-slider has label |
| `matButtonType` | 3 | mat-button has type |
| `matIconAccessibility` | 10 | mat-icon has aria-label/hidden |
| `matButtonToggleLabel` | 7 | mat-button-toggle has label |
| `matProgressBarLabel` | 7 | mat-progress-bar has label |
| `matProgressSpinnerLabel` | 7 | mat-progress-spinner has label |
| `matBadgeDescription` | 3 | mat-badge has description |
| `matMenuTrigger` | 7 | mat-menu trigger has aria |
| `matSidenavA11y` | 7 | mat-sidenav accessible |
| `matTabLabel` | 7 | mat-tab has label |
| `matStepLabel` | 7 | mat-step has label |
| `matExpansionHeader` | 7 | mat-expansion-panel has header |
| `matTreeA11y` | 7 | mat-tree accessible |
| `matListSelectionLabel` | 7 | mat-selection-list has label |
| `matTableHeaders` | 7 | mat-table has headers |
| `matPaginatorLabel` | 3 | mat-paginator has labels |
| `matSortHeaderAnnounce` | 3 | mat-sort-header announces |
| `matDialogFocus` | 10 | mat-dialog manages focus |
| `matBottomSheetA11y` | 7 | mat-bottom-sheet accessible |
| `matTooltipKeyboard` | 3 | mat-tooltip keyboard accessible |
| `matSnackbarPoliteness` | 3 | mat-snackbar politeness set |

### SCSS Checks (14)

| Check | Weight | Description |
|-------|--------|-------------|
| `colorContrast` | 7 | Text contrast >= 4.5:1 |
| `focusStyles` | 10 | Focus states visible |
| `touchTargets` | 7 | Touch targets >= 44x44px |
| `outlineNoneWithoutAlt` | 7 | outline:none has alternative |
| `prefersReducedMotion` | 3 | Respects reduced-motion |
| `userSelectNone` | 3 | user-select:none usage |
| `pointerEventsNone` | 3 | pointer-events:none usage |
| `visibilityHiddenUsage` | 3 | visibility:hidden usage |
| `focusWithinSupport` | 3 | :focus-within support |
| `hoverWithoutFocus` | 7 | :hover has :focus pair |
| `contentOverflow` | 3 | Content overflow handled |
| `smallFontSize` | 7 | Font size >= 12px |
| `lineHeightTight` | 3 | Line height >= 1.5 |
| `textJustify` | 3 | No text-align: justify |

### Angular Checks (7)

| Check | Weight | Description |
|-------|--------|-------------|
| `clickWithoutKeyboard` | 10 | (click) has keyboard handler |
| `clickWithoutRole` | 7 | (click) on non-button has role |
| `routerLinkNames` | 7 | routerLink has accessible name |
| `ngForTrackBy` | 3 | *ngFor uses trackBy |
| `innerHtmlUsage` | 3 | [innerHTML] security |
| `asyncPipeAria` | 3 | async pipe with aria |
| `autofocusUsage` | 3 | autofocus usage |

### CDK Checks (3)

| Check | Weight | Description |
|-------|--------|-------------|
| `cdkTrapFocusDialog` | 10 | Dialogs trap focus |
| `cdkAriaDescriber` | 7 | CDK aria describer |
| `cdkLiveAnnouncer` | 7 | CDK live announcer |

</details>

---

## Requirements

- **Node.js** >= 16
- **Angular** >= 12
- **Angular Material** >= 12

### Limitations

- **Static analysis only** — scans source code, not the running app
- **CSS variables** — can't resolve contrast for `var(--custom-color)`
- **Not a replacement** — use alongside Lighthouse and manual testing

---

## FAQ

**How is this different from Lighthouse?**

Lighthouse analyzes rendered HTML in a browser. mat-a11y analyzes your source code and understands Angular Material component patterns that Lighthouse can't see. Use both together.

**Does this replace manual testing?**

No. Automated tools catch ~30-50% of accessibility issues. mat-a11y finds what it can; you still need keyboard testing, screen reader testing, and user testing.

**Can I add custom checks?**

Yes. Create a check module in `src/checks/` following the existing pattern. See [Contributing](#contributing).

**Why static analysis instead of runtime?**

Static analysis runs fast (no browser needed), integrates easily into CI/CD, and catches issues before code is even compiled. Runtime testing is complementary, not a replacement.

---

## Contributing

All 82 checks and 17 formatters were developed using **Test-Driven Development (TDD)**. Each check has a verify file (`dev/tests/verify-files/<checkName>.html` or `.scss`) with `@a11y-pass` and `@a11y-fail` sections that define expected behavior. The full test fixtures and verification scripts are available in the [GitHub repository](https://github.com/robspan/mat-a11y).

```bash
git clone https://github.com/robspan/mat-a11y
cd mat-a11y
npm test           # Structure + formatter verification
npm run dev-check  # Full verification including self-test
```

### What's in the Repo vs npm

| Folder | In npm? | Description |
|--------|---------|-------------|
| `src/` | Yes | 82 checks, 17 formatters, core engine |
| `bin/` | Yes | CLI entry point |
| `dev/` | No | Verification scripts, tests, contributor guide |
| `example-outputs/` | No | Sample outputs for all formats |

### Adding a Check

1. Create `src/checks/myCheck.js` with `name`, `type`, `tier`, `weight`, `check()`
2. Create `dev/tests/verify-files/myCheck.html` with `@a11y-pass`, `@a11y-fail`, `@a11y-false-positive`, `@a11y-false-negative` sections
3. Run `npm test`

### Adding a Formatter

1. Create `src/formatters/myFormat.js` with `name`, `category`, `output`, `format()`
2. Run `npm test`

Full docs: [`dev/README.md`](./dev/README.md)

---

## Community

- **Issues & Features:** [GitHub Issues](https://github.com/robspan/mat-a11y/issues)
- **Discussions:** [GitHub Discussions](https://github.com/robspan/mat-a11y/discussions)

---

## Author

Built for [traufix.de](https://traufix.de) — a German wedding planning platform with 60+ guides. Created to ensure Angular Material components meet WCAG standards at scale.

**Robin Spanier**
[robspan.de](https://robspan.de) · [robin.spanier@robspan.de](mailto:robin.spanier@robspan.de)

## License

[MIT + Commons Clause](./LICENSE) — Free to use, modify, and distribute. Not for resale.
