# mat-a11y

Angular Material accessibility linter. 82 checks.

## Usage

```bash
npm install mat-a11y
npx mat-a11y ./src
```

## Output

```
========================================
  MAT-A11Y ACCESSIBILITY REPORT
========================================

Tier: MATERIAL
Files analyzed: 12

Elements checked: 284
  Passed: 281 (98.9%)
  Failed: 3

ISSUES FOUND:
----------------------------------------

src/app/dialog/dialog.component.html:
  [matDialogFocus] [Error] mat-dialog should manage focus. Focus should move to dialog and return on close
  How to fix:
    - Use cdkFocusInitial for custom initial focus
    - Ensure focusable element exists in dialog
  WCAG 2.4.3: Focus Order
  Found: <mat-dialog-content>... (line 15)

src/app/shared/icon-button.component.html:
  [buttonNames] [Error] Button missing accessible name. Screen readers cannot announce the button purpose
  How to fix:
    - Add aria-label="description"
    - Add visually-hidden text
  WCAG 4.1.2: Name, Role, Value
  Found: <button><mat-icon>close</mat-icon></button> (line 8)

========================================
```

The report shows:
- **Elements checked**: Total HTML elements and CSS rules evaluated
- **Passed**: Elements without accessibility issues
- **Failed**: Elements with issues (each issue includes file path and line number)

## Tiers

```bash
mat-a11y ./src --basic      # 15 checks  - fast CI
mat-a11y ./src              # 45 checks  - default (material)
mat-a11y ./src --full       # 82 checks  - thorough audit
```

| Tier | Checks | Use Case |
|------|--------|----------|
| `--basic` | 15 | Pre-commit, quick feedback |
| `--material` | 45 | Daily development (default) |
| `--full` | 82 | Production audits, PR reviews |

## CI Integration

```yaml
# .github/workflows/a11y.yml
- name: Accessibility Check
  run: npx mat-a11y ./src --full

# With JSON report
- name: Accessibility Audit
  run: npx mat-a11y ./src --full --json

- uses: actions/upload-artifact@v3
  with:
    name: a11y-report
    path: mat-a11y-report.json
```

Exit codes: `0` = passed, `1` = issues found, `2` = error

## CLI Reference

```bash
# Tiers
mat-a11y ./src --basic        # Fast CI checks
mat-a11y ./src --material     # All Material components (default)
mat-a11y ./src --full         # Everything

# Reports
mat-a11y ./src --json         # Write mat-a11y-report.json
mat-a11y ./src --html         # Write mat-a11y-report.html
mat-a11y ./src --json --html  # Both

# Options
mat-a11y ./src -i "test"      # Ignore pattern
mat-a11y ./src --check buttonNames  # Single check
mat-a11y --list-checks        # List all checks
mat-a11y --self-test          # Verify checks work

# Verification
mat-a11y ./src --full-verified  # Self-test before running
mat-a11y ./src --workers auto   # Parallel execution
```

## Checks Overview

**82 checks** across 5 categories:

| Category | Count | Examples |
|----------|-------|----------|
| HTML | 29 | buttonNames, imageAlt, formLabels, headingOrder |
| Angular Material | 29 | matFormFieldLabel, matDialogFocus, matIconAccessibility |
| SCSS | 14 | colorContrast, focusStyles, touchTargets |
| Angular | 7 | clickWithoutKeyboard, routerLinkNames, ngForTrackBy |
| CDK | 3 | cdkTrapFocusDialog, cdkLiveAnnouncer |

Full list: [Checks Reference](#checks-reference)

## Programmatic API

```javascript
const { analyze, basic, material, full } = require('mat-a11y');

// One-liners
const results = basic('./src');     // 15 checks
const results = material('./src');  // 45 checks
const results = full('./src');      // 82 checks

// With options
const results = analyze('./src', {
  tier: 'full',
  ignore: ['test', 'mock'],
  check: 'matFormFieldLabel'  // single check
});

// Check strings directly
const { checkHTML, checkSCSS } = require('mat-a11y');
const htmlIssues = checkHTML('<button></button>');
const scssIssues = checkSCSS('button { outline: none; }');
```

## Configuration

**Default ignores:** `node_modules`, `.git`, `dist`, `build`, `.angular`, `coverage`

```bash
# Add more ignores
mat-a11y ./src -i "test" -i "e2e" -i "*.spec.ts"

# Run single check
mat-a11y ./src --check colorContrast

# List available checks
mat-a11y --list-checks
```

## False Positives

Static analysis has limits. Some checks may flag accessible code.

**Review before fixing** - not all warnings are problems.

| Severity | Count | Action |
|----------|-------|--------|
| Error | 60 | Fix these |
| Warning | 18 | Review first |
| Info | 4 | Usually fine |

Common false positives:
- `colorContrast` - Can't resolve CSS variables or theme colors
- `ngForTrackBy` - Small static lists don't need trackBy
- `matTooltipKeyboard` - Parent element may be focusable

---

# Reference

## Checks Reference

### HTML Checks (29)

| Check | WCAG | Description |
|-------|------|-------------|
| accesskeyUnique | 4.1.1 | Accesskey values must be unique |
| ariaAttributes | 4.1.2 | ARIA attributes must have valid values |
| ariaHiddenBody | 4.1.2 | Body cannot have aria-hidden |
| ariaRoles | 4.1.2 | ARIA roles must be valid |
| autofocusUsage | 2.4.3 | Autofocus can disrupt screen readers |
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

### Angular Material Checks (29)

| Check | WCAG | Description |
|-------|------|-------------|
| matAutocompleteLabel | 4.1.2 | mat-autocomplete input needs aria-label |
| matBadgeDescription | 1.1.1 | matBadge needs matBadgeDescription |
| matBottomSheetA11y | 2.4.3 | mat-bottom-sheet needs heading |
| matButtonToggleLabel | 4.1.2 | mat-button-toggle-group needs label |
| matButtonType | 4.1.2 | mat-button only on button/a elements |
| matCheckboxLabel | 4.1.2 | mat-checkbox needs label |
| matChipListLabel | 4.1.2 | mat-chip-list needs aria-label |
| matDatepickerLabel | 4.1.2 | mat-datepicker input needs label |
| matDialogFocus | 2.4.3 | mat-dialog needs focus management |
| matExpansionHeader | 4.1.2 | Expansion panel needs header |
| matFormFieldLabel | 1.3.1 | mat-form-field needs mat-label |
| matIconAccessibility | 1.1.1 | mat-icon needs aria-hidden or aria-label |
| matListSelectionLabel | 4.1.2 | mat-selection-list needs label |
| matMenuTrigger | 4.1.2 | Menu trigger needs accessible name |
| matPaginatorLabel | 4.1.2 | mat-paginator needs aria-label |
| matProgressBarLabel | 1.1.1 | mat-progress-bar needs aria-label |
| matProgressSpinnerLabel | 1.1.1 | mat-progress-spinner needs aria-label |
| matRadioGroupLabel | 1.3.1 | mat-radio-group needs group label |
| matSelectPlaceholder | 1.3.1 | mat-select needs label, not just placeholder |
| matSidenavA11y | 4.1.2 | mat-sidenav needs role or label |
| matSlideToggleLabel | 4.1.2 | mat-slide-toggle needs label |
| matSliderLabel | 4.1.2 | mat-slider needs label |
| matSnackbarPoliteness | 4.1.3 | Snackbar politeness setting |
| matSortHeaderAnnounce | 4.1.2 | mat-sort-header needs sortActionDescription |
| matStepLabel | 4.1.2 | mat-step needs label |
| matTabLabel | 4.1.2 | mat-tab needs label |
| matTableHeaders | 1.3.1 | mat-table needs header row |
| matTooltipKeyboard | 2.1.1 | matTooltip needs focusable host |
| matTreeA11y | 4.1.2 | mat-tree needs aria-label |

### Angular Checks (7)

| Check | WCAG | Description |
|-------|------|-------------|
| asyncPipeAria | 4.1.3 | Async pipe content needs aria-live |
| clickWithoutKeyboard | 2.1.1 | (click) needs keyboard handler |
| clickWithoutRole | 4.1.2 | (click) needs role and tabindex |
| innerHtmlUsage | - | [innerHTML] usage warning |
| ngForTrackBy | - | *ngFor should have trackBy |
| routerLinkNames | 2.4.4 | routerLink needs accessible name |

### CDK Checks (3)

| Check | WCAG | Description |
|-------|------|-------------|
| cdkAriaDescriber | 4.1.2 | Complex widgets may need descriptions |
| cdkLiveAnnouncer | 4.1.3 | Dynamic content may need announcements |
| cdkTrapFocusDialog | 2.4.3 | Dialogs should trap focus |

### SCSS Checks (14)

| Check | WCAG | Description |
|-------|------|-------------|
| colorContrast | 1.4.3 | WCAG 2.1 AA color contrast (4.5:1) |
| contentOverflow | 1.4.4 | overflow:hidden may hide content |
| focusStyles | 2.4.7 | Interactive elements need focus indicators |
| focusWithinSupport | 2.4.7 | Complex components may need :focus-within |
| hoverWithoutFocus | 2.1.1 | :hover should have matching :focus |
| lineHeightTight | 1.4.12 | line-height below 1.2 warning |
| outlineNoneWithoutAlt | 2.4.7 | outline:none needs alternative focus |
| pointerEventsNone | 2.1.1 | pointer-events:none on interactive elements |
| prefersReducedMotion | 2.3.3 | Animations should respect motion preference |
| smallFontSize | 1.4.4 | Font sizes below 12px warning |
| textJustify | 1.4.8 | text-align:justify readability warning |
| touchTargets | 2.5.5 | Minimum 44x44px touch targets |
| userSelectNone | - | user-select:none warning |
| visibilityHiddenUsage | - | visibility:hidden usage info |

## Architecture

### Project Structure

```
src/
├── checks/              # 82 check modules
│   ├── buttonNames/
│   │   ├── index.js     # Check implementation
│   │   └── verify.html  # Test cases
│   └── ...
├── core/
│   ├── errors.js        # Error catalog (82 codes)
│   ├── loader.js        # Dynamic check loader
│   ├── runner.js        # Parallel execution
│   ├── verifier.js      # Self-test system
│   └── verifyStructure.js  # 4-section validation
└── index.js             # Public API
```

### Self-Testing System

Every check has a verify file with **4 required sections**:

```html
<!-- @a11y-pass -->
<!-- Accessible code - must produce 0 issues -->
<button>Click me</button>

<!-- @a11y-fail -->
<!-- Inaccessible code - must produce issues -->
<button></button>

<!-- @a11y-false-positive -->
<!-- Tricky accessible code that naive checks might flag -->
<div aria-label="Action"><button></button></div>

<!-- @a11y-false-negative -->
<!-- Tricky inaccessible code that naive checks might miss -->
<button aria-label="">Submit</button>
```

Run verification:

```bash
npm test                  # Structure check + self-test
mat-a11y --self-test      # Self-test only
```

### Error Catalog

All errors are defined in `src/core/errors.js`:

```javascript
const { format, toJSON, parse } = require('mat-a11y/src/core/errors');

// Human-readable
format('BTN_MISSING_NAME', { element: '<button></button>', line: 15 });

// JSON
toJSON('BTN_MISSING_NAME', { element: '<button></button>' });
// { code, severity, message, why, fix[], wcag, element, line }

// Parse back
const parsed = parse(issueString);
```

## Contributing

### Adding a New Check

1. **Create folder:**
   ```bash
   mkdir src/checks/myCheck
   ```

2. **Create index.js:**
   ```javascript
   const { format } = require('../../core/errors');

   module.exports = {
     name: 'myCheck',
     description: 'What this check does',
     tier: 'material',  // basic | material | full
     type: 'html',      // html | scss
     wcag: '4.1.2',     // optional

     check(content) {
       const issues = [];
       let elementsFound = 0;

       // Your logic here - count elements evaluated
       while ((match = pattern.exec(content)) !== null) {
         elementsFound++;
         if (problem) {
           issues.push(format('ERROR_CODE', { element, line }));
         }
       }

       return { pass: issues.length === 0, issues, elementsFound };
     }
   };
   ```

3. **Add error code to `src/core/errors.js`**

4. **Create verify.html with all 4 sections:**
   ```html
   <!-- @a11y-pass -->
   <!-- good code -->

   <!-- @a11y-fail -->
   <!-- bad code -->

   <!-- @a11y-false-positive -->
   <!-- tricky good code -->

   <!-- @a11y-false-negative -->
   <!-- tricky bad code -->
   ```

5. **Test:**
   ```bash
   npm test
   mat-a11y ./src --check myCheck
   ```

## Compatibility

| Environment | Version |
|-------------|---------|
| Node.js | >= 16.0.0 |
| Angular Material | >= 12 |
| Angular | >= 12 |

**Angular Material 15+:** Auto-detects new `mat-slider` API (`<input matSliderThumb>`).

## Disclaimer

This software is provided "as is" without warranty of any kind. No guarantee of completeness, accuracy, or fitness for any purpose. Use at your own risk.

This tool does not replace professional accessibility audits and does not guarantee compliance with WCAG, BITV 2.0, or other standards.

## License

MIT License - see [LICENSE](LICENSE)

---

**Robin Spanier** - [robspan.de](https://robspan.de) - robin.spanier@robspan.de
