# mat-a11y

**Lighthouse can't see your Angular Material components.** mat-a11y can.

82 accessibility checks for Angular + Material, scored per-page from your sitemap.

## Install & Run

```bash
npm install mat-a11y
mat-a11y ./src
```

Output:
```
URL SCORES (67 URLs from sitemap.xml):
  Passing (90-100%): 61 URLs
  Needs Work (50-89%): 6 URLs
  Failing (<50%): 0 URLs

FIX PRIORITIES:
  1. / (83%)
     - matIconAccessibility: 50 errors
     - colorContrast: 4 errors
```

## Tiers

```bash
mat-a11y ./src --basic     # Quick wins (default)
mat-a11y ./src --material  # ONLY mat-* checks (29)
mat-a11y ./src --angular   # ONLY Angular + CDK checks (10)
mat-a11y ./src --full      # Everything (82 checks)
```

## Output

```bash
# Built-in reports
mat-a11y ./src --json                    # mat-a11y-report.json
mat-a11y ./src --html                    # mat-a11y-report.html

# 14 CI/CD formats
mat-a11y ./src -f sarif -o report.sarif  # GitHub Security
mat-a11y ./src -f junit -o report.xml    # Jenkins/GitLab
mat-a11y ./src -f slack -o slack.json    # Slack webhook
```

All formats: `sarif`, `junit`, `checkstyle`, `gitlab-codequality`, `github-annotations`, `sonarqube`, `csv`, `markdown`, `prometheus`, `grafana-json`, `datadog`, `slack`, `discord`, `teams`

## CI/CD

```yaml
# .github/workflows/a11y.yml
- run: npx mat-a11y ./src --full --json
- uses: actions/upload-artifact@v4
  with:
    name: a11y-report
    path: mat-a11y-report.json
```

Exit codes: `0` passing, `1` failing, `2` error

## Checks

| Category | Count | Examples |
|----------|-------|----------|
| HTML | 29 | `imageAlt`, `buttonNames`, `formLabels` |
| Material | 29 | `matFormFieldLabel`, `matDialogFocus`, `matIconAccessibility` |
| SCSS | 14 | `colorContrast`, `focusStyles`, `touchTargets` |
| Angular | 7 | `clickWithoutKeyboard`, `routerLinkNames` |
| CDK | 3 | `cdkTrapFocusDialog`, `cdkLiveAnnouncer` |

```bash
mat-a11y --list-checks  # Show all 82 checks
```

## Programmatic API

```javascript
const { analyzeBySitemap, formatters } = require('mat-a11y');

const results = analyzeBySitemap('./my-app', { tier: 'full' });
console.log(`Score: ${results.urls[0].auditScore}%`);

// Export to any format
const sarif = formatters.format('sarif', results);
```

## Requirements

- Node.js >= 16
- Angular >= 12
- Angular Material >= 12

## Limitations

- Static analysis only (no runtime)
- CSS variables not resolved in contrast checks
- Use alongside Lighthouse and manual testing

---

# Reference

<details>
<summary><strong>CLI Options</strong></summary>

```
mat-a11y <path> [options]

Tiers:
  --basic              Quick wins (default)
  --material           ONLY mat-* checks (29)
  --angular            ONLY Angular + CDK checks (10)
  --full               Everything (82 checks)

Output:
  --json               Write mat-a11y-report.json
  --html               Write mat-a11y-report.html
  -f, --format <name>  Output format (sarif, junit, etc.)
  -o, --output <path>  Custom output path

Options:
  -i, --ignore <pat>   Ignore pattern (repeatable)
  --check <name>       Run single check only
  --list-checks        List all checks
  --file-based         Legacy file analysis
  -h, --help           Show help
  -v, --version        Show version
```

</details>

<details>
<summary><strong>All 82 Checks</strong></summary>

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

<details>
<summary><strong>Output Formats (14)</strong></summary>

| Format | Category | Description |
|--------|----------|-------------|
| `sarif` | CI/CD | SARIF 2.1.0 for GitHub Security |
| `junit` | CI/CD | JUnit XML for Jenkins/GitLab |
| `github-annotations` | CI/CD | GitHub Actions annotations |
| `gitlab-codequality` | CI/CD | GitLab Code Quality |
| `sonarqube` | Quality | SonarQube issues |
| `checkstyle` | Quality | Checkstyle XML |
| `markdown` | Docs | Markdown report |
| `csv` | Data | CSV spreadsheet |
| `prometheus` | Monitoring | Prometheus metrics |
| `grafana-json` | Monitoring | Grafana datasource |
| `datadog` | Monitoring | DataDog metrics |
| `slack` | Notify | Slack Block Kit |
| `discord` | Notify | Discord embed |
| `teams` | Notify | MS Teams Card |

See [`example-outputs/`](./example-outputs) for samples.

</details>

<details>
<summary><strong>Programmatic API</strong></summary>

### Analysis Functions

```javascript
const {
  analyzeBySitemap,  // Sitemap-based (recommended)
  analyzeByRoute,    // Route-based
  analyze,           // File-based (legacy)
  basic, material, angular, full  // Quick shortcuts
} = require('mat-a11y');

// Sitemap analysis
const results = analyzeBySitemap('./app', { tier: 'full' });
// Returns: { urlCount, distribution, urls[], worstUrls[], internal }

// Route analysis
const routes = analyzeByRoute('./app', { tier: 'material' });
// Returns: { routeCount, distribution, routes[] }

// Direct content
const { checkHTML, checkSCSS } = require('mat-a11y');
const issues = checkHTML('<button></button>', 'material');
```

### Formatters

```javascript
const { formatters } = require('mat-a11y');

formatters.listFormatters();           // ['sarif', 'junit', ...]
formatters.format('sarif', results);   // Returns formatted string
formatters.getFormatter('junit');      // Get formatter module
```

### Color Utilities

```javascript
const { colors } = require('mat-a11y');

colors.getContrastRatio('#fff', '#000');  // 21
colors.meetsWCAG_AA(4.5);                 // true
colors.getContrastRating(7);              // 'AAA'
```

</details>

<details>
<summary><strong>TypeScript Types</strong></summary>

```typescript
import {
  // Analysis functions
  analyze, analyzeBySitemap, analyzeByRoute,
  basic, material, angular, full,
  checkHTML, checkSCSS,

  // Types
  Tier, AnalysisResult, SitemapAnalysisResult, RouteAnalysisResult,
  UrlResult, CheckResult, Issue, AuditResult,

  // Formatters
  formatters, Formatter, FormatterCategory,

  // Utilities
  colors, verifyChecks, getCheckInfo
} from 'mat-a11y';
```

### Core Types

```typescript
type Tier = 'basic' | 'material' | 'angular' | 'full';
type FileType = 'html' | 'scss';
type Severity = 'error' | 'warning' | 'info';

interface AnalyzeOptions {
  tier?: Tier;
  ignore?: string[];
  check?: string | null;      // Run single check
  verified?: boolean;         // Self-test before analysis
  workers?: number | 'auto';  // Parallel execution
}
```

### Analysis Results

```typescript
interface SitemapAnalysisResult {
  tier: Tier;
  sitemapPath: string;
  urlCount: number;
  resolved: number;
  unresolved: number;
  distribution: { passing: number; warning: number; failing: number };
  urls: UrlResult[];
  worstUrls: WorstUrl[];
  internal: InternalPagesResult;
}

interface UrlResult {
  url: string;
  path: string;
  auditScore: number;               // 0-100 Lighthouse-style
  auditsTotal: number;
  auditsPassed: number;
  auditsFailed: number;
  issues: Issue[];
  audits: AuditResult[];
}

interface Issue {
  message: string;
  file?: string;
  check?: string;
  line?: number;
}

interface AuditResult {
  name: string;
  weight: number;                   // 1-10
  passed: boolean;
  elementsFound: number;
  issues: number;
}
```

### Formatters

```typescript
type FormatterCategory = 'cicd' | 'code-quality' | 'docs' |
                         'monitoring' | 'notifications' | 'data';

interface Formatter {
  name: string;
  description: string;
  category: FormatterCategory;
  output: 'json' | 'xml' | 'text' | 'html';
  fileExtension?: string;
  format(results: SitemapAnalysisResult | RouteAnalysisResult | AnalysisResult): string;
}

// Usage
formatters.format('sarif', results);
formatters.listFormatters();  // ['sarif', 'junit', 'slack', ...]
```

### Color Utilities

```typescript
interface ColorUtils {
  getContrastRatio(color1: string, color2: string): number | null;
  meetsWCAG_AA(ratio: number, isLargeText?: boolean): boolean;
  meetsWCAG_AAA(ratio: number, isLargeText?: boolean): boolean;
  getContrastRating(ratio: number): 'fail' | 'AA-large' | 'AA' | 'AAA';
}

colors.getContrastRatio('#fff', '#000');  // 21
colors.meetsWCAG_AA(4.5);                 // true
```

Full types: [`src/index.d.ts`](./src/index.d.ts)

</details>

<details>
<summary><strong>Scoring Algorithm</strong></summary>

Lighthouse-compatible weighted scoring:

```
Score = (sum of passing audit weights) / (sum of all audit weights) × 100
```

- Each check has weight 1-10
- Check passes if 0 errors (warnings don't fail)
- Only applicable checks affect score

Example:
```
buttonNames (10): 0 errors → +10
imageAlt (10): 2 errors → +0
colorContrast (7): 0 errors → +7

Score = (10 + 7) / (10 + 10 + 7) × 100 = 63%
```

</details>

---

## Contributing

Clone the repo for dev tools, self-tests, and example outputs (not shipped to npm):

```bash
git clone https://github.com/robspan/traufix-a11y
cd traufix-a11y
npm test           # Structure + formatter verification
npm run dev-check  # Full dev check including self-test
```

### What's in the Repo vs npm

| Folder | npm | Description |
|--------|-----|-------------|
| `src/` | Yes | 82 checks, 14 formatters, core analysis engine |
| `bin/` | Yes | CLI entry point |
| `dev-tools/` | No | Verification scripts, fixtures, contributor guide |
| `example-outputs/` | No | Sample outputs for all 14 formats |
| `tests/` | No | Test runner |
| `src/checks/**/verify.*` | No | Self-test files for each check |

### Dev Tools

| Script | Purpose |
|--------|---------|
| `npm test` | Verify structure + verify formatters |
| `npm run dev-check` | Full verification including self-test |
| `npm run verify-structure` | Validate all verify files have required sections |
| `npm run verify-formatters` | Test all formatters against 21 fixtures |

### Adding a Check

1. Create `src/checks/myCheck/index.js`:
   ```javascript
   module.exports = {
     name: 'myCheck',
     description: 'Description',
     type: 'html',  // or 'scss'
     tier: 'basic', // or 'material', 'full'
     weight: 7,     // 1-10 (Lighthouse-style)
     wcag: '4.1.2', // or null
     check(content) {
       const issues = [];
       // ... check logic
       return { pass: issues.length === 0, issues, elementsFound: 0 };
     }
   };
   ```

2. Create `src/checks/myCheck/verify.html` with 4 required sections:
   ```html
   <!-- @a11y-pass -->
   <!-- Cases that should NOT trigger issues -->

   <!-- @a11y-fail -->
   <!-- Cases that SHOULD trigger issues -->

   <!-- @a11y-false-positive -->
   <!-- Accessible code that naive checks might incorrectly flag -->

   <!-- @a11y-false-negative -->
   <!-- Inaccessible code that naive checks might miss -->
   ```

3. Run `npm test` to verify.

### Adding a Formatter

1. Create `src/formatters/myFormat/index.js`:
   ```javascript
   module.exports = {
     name: 'my-format',
     description: 'Description',
     category: 'cicd',      // cicd|monitoring|notifications|code-quality|docs|data
     output: 'json',        // json|xml|text|html
     fileExtension: '.json',
     format(results, options = {}) {
       // results can be SitemapAnalysisResult, RouteAnalysisResult, or AnalysisResult
       return JSON.stringify({ /* ... */ }, null, 2);
     }
   };
   ```

2. Run `npm run verify-formatters` to test against all fixtures.

### Example Outputs

See [example-outputs/](https://github.com/robspan/traufix-a11y/tree/main/example-outputs) for sample outputs of all 14 formats:

- **CI/CD**: `sarif`, `junit`, `github-annotations`, `gitlab-codequality`
- **Quality**: `sonarqube`, `checkstyle`
- **Monitoring**: `prometheus`, `grafana-json`, `datadog`
- **Notifications**: `slack`, `discord`, `teams`
- **Docs/Data**: `markdown`, `csv`

Generate your own from a real project:
```bash
node dev-tools/generate-examples.js ../my-angular-app
```

Full contributor docs: [`dev-tools/README.md`](./dev-tools/README.md)

---

## Background

Built for [traufix.de](https://traufix.de) — a German wedding planning platform with 60+ guides at [traufix.de/guide](https://traufix.de/guide). Created to ensure all Angular Material components meet WCAG accessibility standards at scale.

## License

[MIT + Commons Clause](./LICENSE) - Free to use, modify, and distribute. Not for resale.

[Robin Spanier](https://robspan.de) · [robin.spanier@robspan.de](mailto:robin.spanier@robspan.de)
