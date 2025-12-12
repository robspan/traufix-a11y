# mat-a11y

Angular Material accessibility linter. Static analysis for mat-* components, Angular templates & SCSS.

**82 checks** | **3 tiers** | **100% Angular Material coverage** | **WCAG 2.1 contrast calculation**

## Quick Start

```bash
# Install
npm install mat-a11y

# Run on your project (default: material mode)
npx mat-a11y ./src/app
```

## ⚠️ False Positives & Configuration Guide

Static analysis cannot always determine runtime behavior. Some checks may flag code that is actually accessible. **Review warnings before fixing** - not all flagged issues are problems.

### Severity Levels

| Level | Count | Meaning | Action |
|-------|-------|---------|--------|
| **Error** | 60 | Definite accessibility barrier | Must fix |
| **Warning** | 18 | Potential issue, context-dependent | Review first |
| **Info** | 4 | Informational only | Usually safe to ignore |

### Common False Positives by Check

#### Info-Level (Usually Safe to Ignore)

| Check | Why It's Flagged | When It's Fine |
|-------|------------------|----------------|
| `ngForTrackBy` | Missing trackBy function | Small/static lists don't benefit |
| `matSnackbarPoliteness` | Default politeness used | Default "polite" is usually correct |
| `matIconDecorative` | Icon without aria-hidden | Parent element has aria-label |

#### Warning-Level (Review Before Fixing)

| Check | Why It's Flagged | When It's Fine |
|-------|------------------|----------------|
| `autofocusUsage` | autofocus attribute found | Intentional in dialogs/modals |
| `skipLink` | No skip navigation link | Single-page apps, minimal nav |
| `innerHtmlUsage` | [innerHTML] detected | Sanitized content, intentional |
| `textJustify` | text-align: justify | Design requirement, short blocks |
| `smallFontSize` | Font < 12px | Labels, captions, legal text |
| `lineHeightTight` | line-height < 1.2 | Headings, single-line elements |
| `userSelectNone` | user-select: none | UI controls (buttons, sliders) |
| `prefersReducedMotion` | Animation without @media query | Non-essential micro-animations |
| `cdkLiveAnnouncer` | Dynamic content without announcer | Visual-only updates (counters) |
| `matTooltipKeyboard` | Tooltip on non-focusable element | Parent is focusable |

#### SCSS Checks (Static Analysis Limitations)

| Check | Limitation |
|-------|------------|
| `colorContrast` | Can't resolve CSS variables, computed values, or theme colors |
| `touchTargets` | Can't calculate actual rendered sizes with padding/margin |
| `focusStyles` | Custom focus styles may be in global stylesheet or theme |
| `hoverWithoutFocus` | Focus styles may be defined separately |

### Recommended Tier by Project Type

| Project Type | Recommended Tier | Why |
|--------------|------------------|-----|
| **New Angular Material app** | `--material` (default) | All mat-* checks, balanced coverage |
| **Quick CI/pre-commit** | `--basic` | Fast feedback, core issues only |
| **Production audit** | `--full` | Maximum coverage, review warnings |
| **Component library** | `--basic` | Fewer false positives on isolated components |
| **Legacy app migration** | `--material` + `-i "legacy"` | Ignore legacy code directories |

### Debugging Specific Checks

```bash
# Run single check to investigate
mat-a11y ./src --check colorContrast

# List all available checks
mat-a11y --list-checks

# See what a check does
mat-a11y --list-checks | grep matIcon
```

### Suppressing Warnings in CI

```bash
# Exit 0 only on errors (ignore warnings/info)
mat-a11y ./src -f json | jq '.issues | map(select(.severity == "error")) | length'
```

## Simple One-Liner API

```javascript
const { basic, material, full } = require('mat-a11y');

// Quick lint (~15 checks)
const results = basic('./src/app');

// Material mode - all mat-* components (~45 checks) [default]
const results = material('./src/app');

// Full audit (82 checks)
const results = full('./src/app');
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

For large codebases, mat-a11y supports parallel execution using worker threads:

- Automatically determines optimal worker count based on CPU cores
- Distributes checks across workers for faster analysis
- Falls back to single-threaded execution if workers fail

### Core Modules

```
src/core/
├── errors.js    # Centralized error catalog (82 error codes, 3 output formats)
├── loader.js    # Dynamically loads check modules from folders
├── parser.js    # Parses verify files for testing
├── runner.js    # Executes checks with parallel support
├── verifier.js  # Self-tests checks against verify files
└── worker.js    # Worker thread for parallel execution
```

## Tiers

| Tier | Checks | Best For |
|------|--------|----------|
| **basic** | ~15 | Quick CI checks, fast feedback |
| **material** | ~45 | Angular Material apps (default) |
| **full** | 82 | Production audits, maximum coverage |

### Basic (~15 checks)
Quick lint for CI pipelines:
- HTML: buttons, images, forms, ARIA, headings, links
- SCSS: color contrast, focus styles
- Material: mat-form-field, mat-icon (essentials)

### Material (~45 checks) [default]
All Angular Material components + Angular patterns:
- All mat-* components: forms, buttons, tables, dialogs, tabs, menus...
- Angular: `(click)` handlers, `routerLink`, `*ngFor` trackBy
- CDK: focus trapping, aria describer, live announcer
- Core HTML & SCSS checks

### Full (82 checks)
Complete audit with deep HTML/SCSS analysis:
- Everything from Material tier
- Extra HTML: meta tags, skip links, autoplay media, tables
- Extra SCSS: animations, font sizes, line heights, text-align

## CLI Usage

```bash
# Default: Material mode (~45 checks)
mat-a11y ./src/app

# Quick basic check
mat-a11y ./src --basic

# Full audit
mat-a11y ./src --full

# JSON output for CI
mat-a11y ./src -f json -o report.json

# HTML report
mat-a11y ./src -f html -o report.html

# Ignore additional paths
mat-a11y ./src -i "test" -i "mock"

# Run with self-test verification first
mat-a11y ./src --full-verified

# Parallel execution
mat-a11y ./src --workers auto

# Self-test only (verify all checks work)
mat-a11y --self-test
```

### CLI Options

```
-b, --basic           Basic tier (~15 checks)
-m, --material        Material tier (~45 checks) [default]
-F, --full            Full tier (82 checks)
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
mat-a11y ./src --check buttonNames

# Run only the matIconAccessibility check
mat-a11y ./src --check matIconAccessibility

# List all available checks by name
mat-a11y --list-checks
```

This is useful for:
- Debugging specific accessibility issues
- Running focused audits
- Testing your own fixes

## Programmatic API

```javascript
const { analyze, checkHTML, checkSCSS, formatConsoleOutput } = require('mat-a11y');

// Analyze directory (default: material tier)
const results = analyze('./src/app', {
  tier: 'material',
  ignore: ['node_modules', 'dist', 'test']
});

console.log(formatConsoleOutput(results));

// Run a single check only
const buttonResults = analyze('./src/app', {
  tier: 'full',
  check: 'matFormFieldLabel'
});

// Check HTML string directly
const htmlResults = checkHTML('<mat-form-field></mat-form-field>', 'material');

// Check SCSS string directly
const scssResults = checkSCSS('button { outline: none; }', 'full');

// Verified mode (self-test all checks before running)
const results = await analyze('./src', { tier: 'full', verified: true });

// Parallel execution
const results = await analyze('./src', { workers: 'auto' });

// Get info about a specific check
const { getCheckInfo } = require('mat-a11y');
const info = getCheckInfo('matFormFieldLabel');
console.log(info.description);
console.log(info.tier);

// Verify checks work correctly
const { verifyChecks } = require('mat-a11y');
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
  run: npx mat-a11y ./src/app

# With verification
- name: Verified Accessibility Check
  run: npx mat-a11y ./src --full-verified

# Parallel execution for faster CI
- name: Fast Accessibility Check
  run: npx mat-a11y ./src --full --workers auto
```

### Pre-commit Hook

```json
{
  "scripts": {
    "a11y": "mat-a11y ./src",
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
mat-a11y --self-test
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

Total checks: 82
  Verified:   82
  Failed:     0
  Skipped:    0

----------------------------------------
VERIFIED CHECKS:
  [PASS] buttonNames
  [PASS] colorContrast
  [PASS] imageAlt
  ...
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
   const { format } = require('../../core/errors');

   module.exports = {
     name: 'myNewCheck',
     description: 'Description of what this check does',
     tier: 'material', // 'basic', 'material', or 'full'
     type: 'html',     // 'html' or 'scss'
     wcag: '4.1.2',    // WCAG criterion (optional)
     check: function(content) {
       const issues = [];
       // Your check logic here
       // Use error codes from src/core/errors.js
       if (problem) {
         issues.push(format('ERROR_CODE', { element: snippet, line: lineNum }));
       }
       return { pass: issues.length === 0, issues };
     }
   };
   ```

   **Note:** Add your error code to `src/core/errors.js` first. See existing codes for format.

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
   mat-a11y --self-test
   ```

5. **Test on a real codebase:**
   ```bash
   mat-a11y ./src --check myNewCheck
   ```

### Check Module Structure

```javascript
const { format } = require('../../core/errors');

module.exports = {
  // Required: Unique identifier for the check
  name: 'checkName',

  // Required: Human-readable description
  description: 'What this check does',

  // Required: Which tier includes this check
  tier: 'basic' | 'material' | 'full',

  // Required: File type this check analyzes
  type: 'html' | 'scss',

  // Optional: WCAG criterion
  wcag: '4.1.2',

  // Required: The check function
  check: function(content) {
    const issues = [];
    // Analyze content and report using error catalog
    if (problem) {
      issues.push(format('ERROR_CODE', { element, line }));
    }
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

When mat-a11y finds accessibility issues, it provides structured output that's both human-readable and machine-parseable.

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

See [False Positives & Configuration Guide](#️-false-positives--configuration-guide) for details on severity levels and common false positives.

### Error Codes

All errors have unique codes for programmatic handling (e.g., `BTN_MISSING_NAME`, `IMG_MISSING_ALT`).

Categories: `IMG`, `BTN`, `LINK`, `FORM`, `ARIA`, `FOCUS`, `COLOR`, `MAT`, `CDK`, and more.

### Programmatic Parsing

The error catalog provides multiple output formats:

```javascript
const { format, compact, toJSON, parse, filterBySeverity } = require('mat-a11y/src/core/errors');

// Human-readable format (default)
format('BTN_MISSING_NAME', { element: '<button></button>' });
// [Error] Button missing accessible name. Screen readers cannot...
//   How to fix:
//     - Add text content inside <button>
//   WCAG 4.1.2: Name, Role, Value
//   Found: <button></button>

// Compact JSON (fast for CI/CD pipelines)
compact('BTN_MISSING_NAME', { element: '<button></button>' });
// {"code":"BTN_MISSING_NAME","severity":"error","message":"Button missing accessible name","wcag":"4.1.2","element":"<button></button>","line":null}

// Full JSON object (programmatic use)
toJSON('BTN_MISSING_NAME', { element: '<button></button>' });
// { code, severity, message, why, fix[], wcag: { code, name }, link, element, line }

// Parse issue string back to object
const parsed = parse(issueString);
console.log(parsed.severity);  // 'error' | 'warning' | 'info'
console.log(parsed.message);   // What's wrong
console.log(parsed.wcag);      // WCAG criterion code

// Filter by severity
const errorsOnly = filterBySeverity(issues, 'error');    // Only errors
const noInfo = filterBySeverity(issues, 'warning');      // Errors + warnings
```

### WCAG References

Each issue references the relevant WCAG 2.1 Success Criterion:
- **1.x.x** = Perceivable (images, media, structure)
- **2.x.x** = Operable (keyboard, timing, navigation)
- **3.x.x** = Understandable (language, predictable, input)
- **4.x.x** = Robust (parsing, name/role/value)

Learn more: [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)

## Checks Reference

### HTML Checks (29)

| Check | WCAG | Description |
|-------|------|-------------|
| accesskeyUnique | 4.1.1 | Accesskey values must be unique |
| ariaAttributes | 4.1.2 | ARIA attributes must have valid values |
| ariaHiddenBody | 4.1.2 | Body cannot have aria-hidden |
| ariaRoles | 4.1.2 | ARIA roles must be valid |
| autoplayMedia | 1.4.2 | Autoplay media must be muted with controls |
| blinkElement | 2.2.2 | Blink element not allowed |
| buttonNames | 4.1.2 | Buttons must have accessible names |
| dlStructure | 1.3.1 | Definition lists must use proper markup |
| duplicateIdAria | 4.1.1 | ARIA references must point to existing IDs |
| emptyTableHeader | 1.3.1 | Table headers cannot be empty |
| formFieldName | 4.1.2 | Form fields must have accessible names |
| formLabels | 3.3.2 | Form controls must have labels |
| headingOrder | 1.3.1 | Headings must follow logical order |
| htmlHasLang | 3.1.1 | HTML must have lang attribute |
| iframeTitles | 4.1.2 | Iframes must have titles |
| imageAlt | 1.1.1 | Images must have alt attributes |
| inputImageAlt | 1.1.1 | Input images must have alt |
| linkNames | 2.4.4 | Links must have accessible names |
| listStructure | 1.3.1 | Lists must have proper structure |
| marqueeElement | 2.2.2 | Marquee element not allowed |
| metaRefresh | 2.2.1 | Meta refresh can disorient users |
| metaViewport | 1.4.4 | Viewport must allow zooming |
| objectAlt | 1.1.1 | Objects must have alt text |
| scopeAttrMisuse | 1.3.1 | Scope attribute must be on th elements |
| skipLink | 2.4.1 | Skip navigation link should exist |
| tabindex | 2.4.3 | No positive tabindex values |
| tableHeaders | 1.3.1 | Tables must have headers |
| uniqueIds | 4.1.1 | IDs must be unique |
| videoCaptions | 1.2.2 | Videos should have captions |

### Angular Checks (7)

| Check | WCAG | Description |
|-------|------|-------------|
| asyncPipeAria | 4.1.3 | Async pipe content needs aria-live |
| autofocusUsage | 2.4.3 | Autofocus can disrupt screen readers |
| clickWithoutKeyboard | 2.1.1 | (click) needs keyboard handler |
| clickWithoutRole | 4.1.2 | (click) needs role and tabindex |
| innerHtmlUsage | - | [innerHTML] usage warning |
| ngForTrackBy | - | *ngFor should have trackBy (performance) |
| routerLinkNames | 2.4.4 | routerLink needs accessible name |

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
