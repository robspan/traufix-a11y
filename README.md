# traufix-a11y

Static accessibility analyzer for Angular/HTML templates with full Lighthouse audit coverage.

**82 checks** | **3 tiers** | **100% Angular Material coverage** | **WCAG 2.1 contrast calculation**

## Quick Start

```bash
# Install
npm install traufix-a11y

# Run on your project
npx traufix-a11y ./src/app
```

## Simple One-Liner API

```javascript
const { basic, enhanced, full } = require('traufix-a11y');

// Quick check (20 checks)
const results = basic('./src/app/media');

// Recommended for Angular (40 checks)
const results = enhanced('./src/app/media');

// Maximum coverage (67 checks)
const results = full('./src/app/media');
```

## Architecture

### Modular Check Structure

Each accessibility check is a self-contained module in its own folder:

```
src/checks/
├── buttonNames/
│   ├── index.js      # Check module with name, description, tier, type, and check function
│   └── verify.html   # Test file with @a11y-pass and @a11y-fail sections
├── colorContrast/
│   ├── index.js
│   └── verify.scss
├── matIconAccessibility/
│   ├── index.js
│   └── verify.html
└── ...
```

### Verify Files

Each check has a verify file (`verify.html` or `verify.scss`) containing:

- `@a11y-pass` section: Code that should pass the check (no issues)
- `@a11y-fail` section: Code that should fail the check (has issues)

Example verify file:

```html
<!-- @a11y-pass -->
<button>Click me</button>
<button aria-label="Close dialog">X</button>

<!-- @a11y-fail -->
<button></button>
<button>   </button>
```

### Parallel Execution

For large codebases, traufix-a11y supports parallel execution using worker threads:

- Automatically determines optimal worker count based on CPU cores
- Distributes checks across workers for faster analysis
- Falls back to single-threaded execution if workers fail

### Core Modules

```
src/core/
├── loader.js    # Dynamically loads check modules from folders
├── parser.js    # Parses verify files for testing
├── runner.js    # Executes checks with parallel support
├── verifier.js  # Self-tests checks against verify files
└── worker.js    # Worker thread for parallel execution
```

## Tiers

| Tier | Checks | Best For |
|------|--------|----------|
| **basic** | 20 | Quick CI checks, small projects |
| **enhanced** | 37 | Angular apps, daily development (default) |
| **full** | 82 | Production audits, maximum coverage |

### Basic (20 checks)
Core Lighthouse accessibility audits:
- HTML: buttons, images, forms, ARIA, headings, links, tables, iframes, videos
- SCSS: color contrast, focus styles, touch targets

### Enhanced (37 checks)
Basic + Angular + common Material:
- Angular: `(click)` handlers, `routerLink`, `*ngFor` trackBy
- Material: `mat-icon`, `mat-form-field`, `mat-button`, `mat-table`
- Extra HTML: viewport, skip links, autoplay media

### Full (82 checks)
Everything including 100% Angular Material coverage:
- All Material components (29 checks): autocomplete, datepicker, radio, checkbox, slider, progress, badge, sidenav, tree, paginator, and more
- CDK: focus trapping, aria describer, live announcer
- All SCSS: animations, font sizes, line heights, text-align

## CLI Usage

```bash
# Basic check (fastest)
traufix-a11y ./src --basic

# Enhanced check (default)
traufix-a11y ./src

# Full audit
traufix-a11y ./src --full

# Check specific folder only
traufix-a11y ./src/app/media

# JSON output for CI
traufix-a11y ./src -f json -o report.json

# HTML report
traufix-a11y ./src -f html -o report.html

# Ignore additional paths
traufix-a11y ./src -i "test" -i "mock"

# Run with self-test verification first
traufix-a11y ./src --full-verified

# Parallel execution (auto-detect workers)
traufix-a11y ./src --workers auto

# Parallel execution (specific worker count)
traufix-a11y ./src --workers 4

# Self-test only (verify all checks work)
traufix-a11y --self-test
```

### CLI Options

```
-b, --basic           Basic tier (20 checks)
-e, --enhanced        Enhanced tier (40 checks) [default]
-F, --full            Full tier (67 checks)
-f, --format          Output: console, json, html
-o, --output          Write to file
-i, --ignore          Ignore pattern (repeatable)
-c, --check           Run only a single specific check
-l, --list-checks     List all available checks
-V, --verbose         Verbose output
-v, --version         Show version
-h, --help            Show help
    --full-verified   Run full tier with self-test verification first
    --workers <n>     Parallel execution (number or 'auto')
    --self-test       Run only self-test verification on all checks
```

### Single Check Mode

Test individual checks in isolation:

```bash
# Run only the buttonNames check
traufix-a11y ./src --check buttonNames

# Run only the matIconAccessibility check
traufix-a11y ./src --check matIconAccessibility

# List all available checks by name
traufix-a11y --list-checks
```

This is useful for:
- Debugging specific accessibility issues
- Running focused audits
- Testing your own fixes

## Programmatic API

```javascript
const { analyze, checkHTML, checkSCSS, formatConsoleOutput } = require('traufix-a11y');

// Analyze directory
const results = analyze('./src/app/media', {
  tier: 'enhanced',
  ignore: ['node_modules', 'dist', 'test']
});

console.log(formatConsoleOutput(results));

// Run a single check only
const buttonResults = analyze('./src/app', {
  tier: 'full',
  check: 'buttonNames'
});

// Check HTML string directly
const htmlResults = checkHTML('<button></button>', 'enhanced');

// Check SCSS string directly
const scssResults = checkSCSS('button { outline: none; }', 'full');

// Verified mode (self-test all checks before running)
const results = await analyze('./src', { tier: 'full', verified: true });

// Parallel execution
const results = await analyze('./src', { workers: 'auto' });

// Get info about a specific check
const { getCheckInfo } = require('traufix-a11y');
const info = getCheckInfo('buttonNames');
console.log(info.description);
console.log(info.tier);

// Verify checks work correctly
const { verifyChecks } = require('traufix-a11y');
const verifyResults = await verifyChecks('full');
console.log(verifyResults.summary);
```

## Default Ignores

These paths are ignored by default:
- `node_modules`
- `.git`
- `dist`
- `build`
- `.angular`
- `coverage`

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All checks passed |
| 1 | Accessibility issues found |
| 2 | Error during analysis |

## CI Integration

### GitHub Actions

```yaml
- name: Accessibility Check
  run: npx traufix-a11y ./src --enhanced

# With verification
- name: Verified Accessibility Check
  run: npx traufix-a11y ./src --full-verified

# Parallel execution for faster CI
- name: Fast Accessibility Check
  run: npx traufix-a11y ./src --full --workers auto
```

### Pre-commit Hook

```json
{
  "scripts": {
    "a11y": "traufix-a11y ./src",
    "precommit": "npm run a11y"
  }
}
```

## Testing

The library uses a self-testing verification system. Each check module has its own verify file that tests the check works correctly.

```bash
# Run the verification suite
node tests/run-tests.js

# Or use CLI self-test
traufix-a11y --self-test
```

### How Verification Works

1. Each check folder contains a `verify.html` or `verify.scss` file
2. The file has two sections marked with comments:
   - `@a11y-pass`: Code that should NOT trigger issues
   - `@a11y-fail`: Code that SHOULD trigger issues
3. The verifier runs the check on both sections
4. Verification passes if:
   - Pass section has 0 issues
   - Fail section has >0 issues

### Verification Output

```
============================================================
VERIFICATION RESULTS
============================================================

Total checks: 67
  Verified:   65
  Failed:     0
  Skipped:    2

----------------------------------------
VERIFIED CHECKS:
  [PASS] buttonNames
  [PASS] colorContrast
  [PASS] imageAlt
  ...

----------------------------------------
SKIPPED CHECKS:
  [SKIP] cdkLiveAnnouncer
         Verify file not found
```

## Contributing

Contributions welcome! Here's how to add a new check:

### Adding a New Check

1. **Create the check folder:**
   ```bash
   mkdir src/checks/myNewCheck
   ```

2. **Create index.js with check module:**
   ```javascript
   module.exports = {
     name: 'myNewCheck',
     description: 'Description of what this check does',
     tier: 'enhanced', // 'basic', 'enhanced', or 'full'
     type: 'html',     // 'html' or 'scss'
     check: function(content) {
       const issues = [];
       // Your check logic here
       // Add issues when problems are found
       return { pass: issues.length === 0, issues };
     }
   };
   ```

3. **Create verify file (verify.html or verify.scss):**
   ```html
   <!-- @a11y-pass -->
   <!-- Good code that should NOT trigger issues -->
   <button>Click me</button>

   <!-- @a11y-fail -->
   <!-- Bad code that SHOULD trigger issues -->
   <button></button>
   ```

4. **Run self-test to verify your check works:**
   ```bash
   traufix-a11y --self-test
   ```

5. **Test on a real codebase:**
   ```bash
   traufix-a11y ./src --check myNewCheck
   ```

### Check Module Structure

```javascript
module.exports = {
  // Required: Unique identifier for the check
  name: 'checkName',

  // Required: Human-readable description
  description: 'What this check does',

  // Required: Which tier includes this check
  tier: 'basic' | 'enhanced' | 'full',

  // Required: File type this check analyzes
  type: 'html' | 'scss',

  // Required: The check function
  check: function(content) {
    const issues = [];
    // Analyze content and push issues
    return { pass: issues.length === 0, issues };
  }
};
```

### Guidelines for Checks

- Keep checks focused on one specific issue
- Use clear issue messages with line numbers when possible
- Test both positive and negative cases
- Follow existing naming conventions (camelCase)
- Document any WCAG criteria the check addresses

## Understanding Issues

When traufix-a11y finds accessibility issues, it provides structured output that's both human-readable and machine-parseable.

### Issue Format

```
[Severity] What's wrong. Why it matters for accessibility
  How to fix:
    - Option 1
    - Option 2
  WCAG X.X.X: Criterion Name | See: documentation-url
  Found: <the offending code>
```

### Severity Levels

| Level | Meaning | Action |
|-------|---------|--------|
| `[Error]` | Definite accessibility barrier | Must fix |
| `[Warning]` | Potential issue or edge case | Should review |
| `[Info]` | Informational, may be intentional | Verify correct |

### Programmatic Parsing

Issues follow a consistent format for CI integration:

```javascript
const { parseIssue } = require('traufix-a11y/src/core/issue-format');

// Parse an issue string to structured object
const parsed = parseIssue(issueString);
console.log(parsed.severity);  // 'error' | 'warning' | 'info'
console.log(parsed.message);   // What's wrong
console.log(parsed.why);       // Why it matters
console.log(parsed.fix);       // Array of fix suggestions
console.log(parsed.wcag);      // WCAG criterion or null
console.log(parsed.element);   // The offending code
```

### WCAG References

Each issue references the relevant WCAG 2.1 Success Criterion:
- **1.x.x** = Perceivable (images, media, structure)
- **2.x.x** = Operable (keyboard, timing, navigation)
- **3.x.x** = Understandable (language, predictable, input)
- **4.x.x** = Robust (parsing, name/role/value)

Learn more: [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)

## Checks Reference

### HTML Checks (23)

| Check | WCAG | Description |
|-------|------|-------------|
| buttonNames | 4.1.2 | Buttons must have accessible names |
| imageAlt | 1.1.1 | Images must have alt attributes |
| formLabels | 1.3.1 | Form controls must have labels |
| ariaRoles | 4.1.2 | ARIA roles must be valid |
| ariaAttributes | 4.1.2 | ARIA attributes must have valid values |
| uniqueIds | 4.1.1 | IDs must be unique |
| headingOrder | 1.3.1 | Headings must follow logical order |
| linkNames | 2.4.4 | Links must have accessible names |
| listStructure | 1.3.1 | Lists must have proper structure |
| dlStructure | 1.3.1 | Definition lists must use proper markup |
| tableHeaders | 1.3.1 | Tables must have headers |
| iframeTitles | 2.4.1 | Iframes must have titles |
| videoCaptions | 1.2.2 | Videos should have captions |
| objectAlt | 1.1.1 | Objects must have alt text |
| accesskeyUnique | 4.1.1 | Accesskey values must be unique |
| tabindex | 2.4.3 | No positive tabindex values |
| ariaHiddenBody | 4.1.2 | Body cannot have aria-hidden |
| htmlHasLang | 3.1.1 | HTML must have lang attribute |
| metaViewport | 1.4.4 | Viewport must allow zooming |
| skipLink | 2.4.1 | Skip navigation link should exist |
| inputImageAlt | 1.1.1 | Input images must have alt |
| autoplayMedia | 1.4.2 | Autoplay media must be muted with controls |
| marqueeElement | 2.2.2 | Marquee element not allowed |

### Angular Checks (6)

| Check | WCAG | Description |
|-------|------|-------------|
| clickWithoutKeyboard | 2.1.1 | (click) needs keyboard handler |
| clickWithoutRole | 4.1.2 | (click) needs role and tabindex |
| routerLinkNames | 2.4.4 | routerLink needs accessible name |
| ngForTrackBy | - | *ngFor should have trackBy (performance) |
| innerHtmlUsage | - | [innerHTML] usage warning |
| asyncPipeAria | 4.1.3 | Async pipe content needs aria-live |

### Angular Material Checks (29)

| Check | WCAG | Description |
|-------|------|-------------|
| matFormFieldLabel | 1.3.1 | mat-form-field needs mat-label |
| matSelectPlaceholder | 1.3.1 | mat-select needs label, not just placeholder |
| matAutocompleteLabel | 4.1.2 | mat-autocomplete input needs aria-label |
| matDatepickerLabel | 4.1.2 | mat-datepicker input needs label |
| matRadioGroupLabel | 1.3.1 | mat-radio-group needs group label |
| matSlideToggleLabel | 4.1.2 | mat-slide-toggle needs label |
| matCheckboxLabel | 4.1.2 | mat-checkbox needs label |
| matChipListLabel | 4.1.2 | mat-chip-list needs aria-label |
| matSliderLabel | 4.1.2 | mat-slider needs label |
| matButtonType | 4.1.2 | mat-button only on button/a elements |
| matIconAccessibility | 1.1.1 | mat-icon needs aria-hidden or aria-label |
| matButtonToggleLabel | 4.1.2 | mat-button-toggle-group needs label |
| matProgressBarLabel | 1.1.1 | mat-progress-bar needs aria-label |
| matProgressSpinnerLabel | 1.1.1 | mat-progress-spinner needs aria-label |
| matBadgeDescription | 1.1.1 | matBadge needs matBadgeDescription |
| matMenuTrigger | 4.1.2 | Menu trigger needs accessible name |
| matSidenavA11y | 4.1.2 | mat-sidenav needs role or label |
| matTabLabel | 4.1.2 | mat-tab needs label |
| matStepLabel | 4.1.2 | mat-step needs label |
| matExpansionHeader | 4.1.2 | Expansion panel needs header |
| matTreeA11y | 4.1.2 | mat-tree needs aria-label |
| matListSelectionLabel | 4.1.2 | mat-selection-list needs label |
| matTableHeaders | 1.3.1 | mat-table needs header row |
| matPaginatorLabel | 4.1.2 | mat-paginator needs aria-label |
| matSortHeaderAnnounce | 4.1.2 | mat-sort-header needs sortActionDescription |
| matDialogFocus | 2.4.3 | mat-dialog needs focus management |
| matBottomSheetA11y | 2.4.3 | mat-bottom-sheet needs heading |
| matTooltipKeyboard | 2.1.1 | matTooltip needs focusable host |
| matSnackbarPoliteness | 4.1.3 | Snackbar politeness setting |

### CDK Checks (3)

| Check | WCAG | Description |
|-------|------|-------------|
| cdkTrapFocusDialog | 2.4.3 | Dialogs should trap focus |
| cdkAriaDescriber | 4.1.2 | Complex widgets may need descriptions |
| cdkLiveAnnouncer | 4.1.3 | Dynamic content may need announcements |

### SCSS Checks (14)

| Check | WCAG | Description |
|-------|------|-------------|
| colorContrast | 1.4.3 | WCAG 2.1 AA color contrast (4.5:1) |
| focusStyles | 2.4.7 | Interactive elements need focus indicators |
| touchTargets | 2.5.5 | Minimum 44x44px touch targets |
| outlineNoneWithoutAlt | 2.4.7 | outline:none needs alternative focus |
| prefersReducedMotion | 2.3.3 | Animations should respect motion preference |
| userSelectNone | - | user-select:none warning |
| pointerEventsNone | 2.1.1 | pointer-events:none on interactive elements |
| visibilityHiddenUsage | - | visibility:hidden usage info |
| focusWithinSupport | 2.4.7 | Complex components may need :focus-within |
| hoverWithoutFocus | 2.1.1 | :hover should have matching :focus |
| contentOverflow | 1.4.4 | overflow:hidden may hide content |
| smallFontSize | 1.4.4 | Font sizes below 12px warning |
| lineHeightTight | 1.4.12 | line-height below 1.2 warning |
| textJustify | 1.4.8 | text-align:justify readability warning |

---

## Haftungsausschluss / Disclaimer

**DEUTSCH:**

Diese Software wird "wie besehen" ohne jegliche Gewahrleistung bereitgestellt.
Keine Garantie fur Vollstandigkeit, Richtigkeit oder Eignung fur bestimmte Zwecke.
Die Nutzung erfolgt auf eigenes Risiko.

Diese Software ersetzt keine professionelle Barrierefreiheits-Prufung und garantiert
keine Konformitat mit WCAG, BITV 2.0 oder anderen Standards.

**ENGLISH:**

This software is provided "as is" without warranty of any kind.
No guarantee of completeness, accuracy, or fitness for any purpose.
Use at your own risk.

This software does not replace professional accessibility audits and does not
guarantee compliance with WCAG, BITV 2.0, or other standards.

---

## License

MIT License - see [LICENSE](LICENSE)

---

Made with care by **Robin Spanier** - Freelance Web Developer

- [Traufix](https://traufix.de) - Website Builder for Bridal Couples
- [robspan.de](https://robspan.de) - Freelance Services
- Contact: robin.spanier@robspan.de
