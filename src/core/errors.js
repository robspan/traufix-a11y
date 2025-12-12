'use strict';

/**
 * Centralized Error Catalog for traufix-a11y
 *
 * ALL accessibility errors are defined here for consistent, standardized messaging.
 * Checks reference error codes and pass dynamic data - they don't create messages.
 *
 * This enables:
 * - Consistent messaging across all checks
 * - Programmatic parsing of all errors
 * - Easy i18n/translation support
 * - Documentation generation
 * - Error code references in CI/CD pipelines
 */

/**
 * WCAG 2.1 Success Criteria
 */
const WCAG = {
  '1.1.1': 'Non-text Content',
  '1.2.1': 'Audio-only and Video-only',
  '1.2.2': 'Captions (Prerecorded)',
  '1.3.1': 'Info and Relationships',
  '1.3.2': 'Meaningful Sequence',
  '1.4.1': 'Use of Color',
  '1.4.2': 'Audio Control',
  '1.4.3': 'Contrast (Minimum)',
  '1.4.4': 'Resize Text',
  '1.4.10': 'Reflow',
  '1.4.11': 'Non-text Contrast',
  '1.4.12': 'Text Spacing',
  '2.1.1': 'Keyboard',
  '2.1.2': 'No Keyboard Trap',
  '2.2.1': 'Timing Adjustable',
  '2.2.2': 'Pause, Stop, Hide',
  '2.3.1': 'Three Flashes',
  '2.3.3': 'Animation from Interactions',
  '2.4.1': 'Bypass Blocks',
  '2.4.2': 'Page Titled',
  '2.4.3': 'Focus Order',
  '2.4.4': 'Link Purpose (In Context)',
  '2.4.6': 'Headings and Labels',
  '2.4.7': 'Focus Visible',
  '2.5.3': 'Label in Name',
  '3.1.1': 'Language of Page',
  '3.2.1': 'On Focus',
  '3.2.2': 'On Input',
  '3.3.1': 'Error Identification',
  '3.3.2': 'Labels or Instructions',
  '4.1.1': 'Parsing',
  '4.1.2': 'Name, Role, Value',
  '4.1.3': 'Status Messages'
};

/**
 * Error Catalog
 *
 * Structure:
 * {
 *   CODE: {
 *     severity: 'error' | 'warning' | 'info',
 *     message: string | (data) => string,  // Brief description
 *     why: string,                          // Why it matters
 *     fix: string[],                        // How to fix
 *     wcag: string | null,                  // WCAG criterion code
 *     link: string | null                   // Documentation URL
 *   }
 * }
 */
const ERRORS = {
  // ============================================
  // IMAGES & MEDIA (IMG_*)
  // ============================================
  IMG_MISSING_ALT: {
    severity: 'error',
    message: 'Image missing alt attribute',
    why: 'Screen readers cannot describe images without alt text',
    fix: [
      'Add alt="description" for informative images',
      'Add alt="" for purely decorative images',
      'Use [alt]="variable" for dynamic descriptions'
    ],
    wcag: '1.1.1',
    link: 'https://www.w3.org/WAI/tutorials/images/'
  },
  IMG_EMPTY_ALT_DECORATIVE: {
    severity: 'info',
    message: 'Image has empty alt attribute',
    why: 'Empty alt marks image as decorative - verify this is intentional',
    fix: ['Confirm image is purely decorative', 'Add description if image conveys information'],
    wcag: '1.1.1',
    link: null
  },
  INPUT_IMAGE_MISSING_ALT: {
    severity: 'error',
    message: 'Input type="image" missing alt attribute',
    why: 'Screen readers cannot describe the button action',
    fix: [
      'Add alt="Submit form" describing the action',
      'Add aria-label as alternative'
    ],
    wcag: '1.1.1',
    link: null
  },
  OBJECT_MISSING_ALT: {
    severity: 'error',
    message: 'Object element missing text alternative',
    why: 'Embedded content needs fallback for assistive technologies',
    fix: [
      'Add descriptive text between <object> tags',
      'Add aria-label attribute',
      'Add title attribute'
    ],
    wcag: '1.1.1',
    link: null
  },
  VIDEO_MISSING_CAPTIONS: {
    severity: 'error',
    message: 'Video missing captions track',
    why: 'Deaf and hard-of-hearing users cannot access audio content',
    fix: [
      'Add <track kind="captions" src="...">',
      'Provide transcript alternative'
    ],
    wcag: '1.2.2',
    link: 'https://www.w3.org/WAI/media/av/'
  },
  MEDIA_AUTOPLAY: {
    severity: 'error',
    message: 'Media has autoplay without user control',
    why: 'Unexpected audio disrupts screen reader users and can be disorienting',
    fix: [
      'Remove autoplay attribute',
      'Add muted attribute if autoplay is required',
      'Provide visible pause/stop controls'
    ],
    wcag: '1.4.2',
    link: null
  },

  // ============================================
  // BUTTONS & INTERACTIVE (BTN_*)
  // ============================================
  BTN_MISSING_NAME: {
    severity: 'error',
    message: 'Button missing accessible name',
    why: 'Screen readers cannot announce the button purpose',
    fix: [
      'Add text content inside <button>',
      'Add aria-label="description"',
      'Add aria-labelledby referencing visible text',
      'For icon buttons, add visually-hidden text'
    ],
    wcag: '4.1.2',
    link: null
  },
  BTN_INPUT_MISSING_NAME: {
    severity: 'error',
    message: 'Input button missing accessible name',
    why: 'Screen readers cannot announce the button purpose',
    fix: [
      'Add value="Button text"',
      'Add aria-label="description"'
    ],
    wcag: '4.1.2',
    link: null
  },
  CLICK_WITHOUT_KEYBOARD: {
    severity: 'error',
    message: 'Click handler without keyboard support',
    why: 'Keyboard users cannot activate this element',
    fix: [
      'Add (keydown.enter) or (keydown.space) handler',
      'Use <button> instead of <div> or <span>',
      'Add tabindex="0" and keyboard event handlers'
    ],
    wcag: '2.1.1',
    link: null
  },
  CLICK_WITHOUT_ROLE: {
    severity: 'error',
    message: 'Clickable element missing role',
    why: 'Screen readers cannot identify the element as interactive',
    fix: [
      'Use semantic element: <button>, <a>, <input>',
      'Add role="button" with tabindex="0"',
      'Add appropriate ARIA role'
    ],
    wcag: '4.1.2',
    link: null
  },

  // ============================================
  // LINKS (LINK_*)
  // ============================================
  LINK_MISSING_NAME: {
    severity: 'error',
    message: 'Link missing accessible name',
    why: 'Screen readers cannot announce the link destination',
    fix: [
      'Add descriptive text content',
      'Add aria-label="description"',
      'For icon links, add visually-hidden text'
    ],
    wcag: '2.4.4',
    link: null
  },
  LINK_GENERIC_TEXT: {
    severity: 'warning',
    message: (data) => `Link has generic text "${data.text}"`,
    why: 'Generic text like "click here" is meaningless out of context',
    fix: [
      'Use descriptive text explaining destination',
      'Add aria-label with full context'
    ],
    wcag: '2.4.4',
    link: null
  },
  ROUTER_LINK_MISSING_NAME: {
    severity: 'error',
    message: 'RouterLink missing accessible name',
    why: 'Screen readers cannot announce the navigation destination',
    fix: [
      'Add text content inside the link',
      'Add aria-label attribute'
    ],
    wcag: '2.4.4',
    link: null
  },

  // ============================================
  // FORMS (FORM_*)
  // ============================================
  FORM_MISSING_LABEL: {
    severity: 'error',
    message: (data) => `Form ${data.type || 'field'} missing label`,
    why: 'Screen readers cannot identify the input purpose',
    fix: [
      'Add <label for="inputId">',
      'Add aria-label attribute',
      'Add aria-labelledby referencing visible text',
      'Wrap input in <label> element'
    ],
    wcag: '3.3.2',
    link: null
  },
  FORM_FIELD_MISSING_NAME: {
    severity: 'error',
    message: (data) => `${data.element} missing accessible name`,
    why: 'Screen readers cannot identify the input purpose',
    fix: [
      'Add id and associated <label>',
      'Add aria-label attribute',
      'Use placeholder only as hint, not label'
    ],
    wcag: '4.1.2',
    link: null
  },

  // ============================================
  // HEADINGS & STRUCTURE (STRUCT_*)
  // ============================================
  HEADING_SKIP_LEVEL: {
    severity: 'error',
    message: (data) => `Heading skips from h${data.from} to h${data.to}`,
    why: 'Screen reader users rely on heading hierarchy for navigation',
    fix: (data) => [
      `Use h${data.from + 1} instead of h${data.to}`,
      'Restructure content to follow logical hierarchy'
    ],
    wcag: '1.3.1',
    link: null
  },
  HEADING_EMPTY: {
    severity: 'error',
    message: (data) => `Empty h${data.level} heading`,
    why: 'Empty headings confuse screen reader navigation',
    fix: ['Add heading text content', 'Remove empty heading element'],
    wcag: '1.3.1',
    link: null
  },
  LIST_INVALID_CHILD: {
    severity: 'error',
    message: (data) => `${data.parent} contains invalid child element`,
    why: 'Invalid list structure confuses assistive technologies',
    fix: [
      'Only use <li> as direct children of <ul>/<ol>',
      'Only use <dt>/<dd> as children of <dl>'
    ],
    wcag: '1.3.1',
    link: null
  },
  DL_STRUCTURE_INVALID: {
    severity: 'error',
    message: 'Definition list has invalid structure',
    why: 'Screen readers expect dt/dd pairs in definition lists',
    fix: [
      'Use <dt> for terms and <dd> for definitions',
      'Ensure each <dt> has corresponding <dd>'
    ],
    wcag: '1.3.1',
    link: null
  },
  TABLE_MISSING_HEADERS: {
    severity: 'error',
    message: 'Table missing header cells',
    why: 'Screen readers cannot associate data cells with headers',
    fix: [
      'Add <th> elements for column/row headers',
      'Add scope="col" or scope="row" to headers'
    ],
    wcag: '1.3.1',
    link: null
  },
  TABLE_EMPTY_HEADER: {
    severity: 'error',
    message: 'Table header cell is empty',
    why: 'Empty headers provide no context for data cells',
    fix: [
      'Add descriptive text to header',
      'Add aria-label if visually hidden',
      'Use <td> if cell is not a header'
    ],
    wcag: '1.3.1',
    link: null
  },

  // ============================================
  // FOCUS & KEYBOARD (FOCUS_*)
  // ============================================
  FOCUS_OUTLINE_REMOVED: {
    severity: 'error',
    message: 'Focus outline removed without alternative',
    why: 'Keyboard users cannot see which element has focus',
    fix: [
      'Remove outline:none or outline:0',
      'Provide custom :focus styles',
      'Use :focus-visible for mouse/keyboard distinction'
    ],
    wcag: '2.4.7',
    link: null
  },
  FOCUS_TRAP_MISSING: {
    severity: 'error',
    message: 'Dialog/modal missing focus trap',
    why: 'Keyboard users can tab outside the modal unexpectedly',
    fix: [
      'Add cdkTrapFocus directive',
      'Implement focus trap with JavaScript',
      'Use MatDialog which handles focus automatically'
    ],
    wcag: '2.1.2',
    link: null
  },
  AUTOFOCUS_MISUSE: {
    severity: 'warning',
    message: 'Autofocus may disrupt user experience',
    why: 'Unexpected focus changes disorient screen reader users',
    fix: [
      'Remove autofocus unless critical for user flow',
      'Use cdkFocusInitial for dialogs',
      'Ensure focus order is logical'
    ],
    wcag: '2.4.3',
    link: null
  },
  TABINDEX_POSITIVE: {
    severity: 'error',
    message: (data) => `Positive tabindex="${data.value}" disrupts focus order`,
    why: 'Positive tabindex creates unpredictable tab order',
    fix: [
      'Use tabindex="0" for focusable elements',
      'Use tabindex="-1" for programmatic focus only',
      'Rely on DOM order for tab sequence'
    ],
    wcag: '2.4.3',
    link: null
  },
  HOVER_WITHOUT_FOCUS: {
    severity: 'error',
    message: ':hover styles without matching :focus styles',
    why: 'Keyboard users miss visual feedback available to mouse users',
    fix: [
      'Add matching :focus styles',
      'Use :hover, :focus { } combined selector',
      'Consider :focus-visible for keyboard-only focus'
    ],
    wcag: '2.4.7',
    link: null
  },

  // ============================================
  // ARIA (ARIA_*)
  // ============================================
  ARIA_HIDDEN_BODY: {
    severity: 'error',
    message: 'aria-hidden="true" on <body> or document root',
    why: 'Hides entire page from screen readers',
    fix: ['Remove aria-hidden from body', 'Apply only to decorative elements'],
    wcag: '4.1.2',
    link: null
  },
  ARIA_INVALID_ATTRIBUTE: {
    severity: 'error',
    message: (data) => `Invalid ARIA attribute "${data.attr}"`,
    why: 'Invalid ARIA provides incorrect information to screen readers',
    fix: ['Check ARIA specification for valid attributes', 'Remove or correct the attribute'],
    wcag: '4.1.2',
    link: 'https://www.w3.org/TR/wai-aria-1.1/#state_prop_def'
  },
  ARIA_INVALID_ROLE: {
    severity: 'error',
    message: (data) => `Invalid ARIA role "${data.role}"`,
    why: 'Invalid roles confuse assistive technologies',
    fix: ['Use valid ARIA role', 'Use semantic HTML element instead'],
    wcag: '4.1.2',
    link: 'https://www.w3.org/TR/wai-aria-1.1/#role_definitions'
  },
  ARIA_REFERENCE_MISSING: {
    severity: 'error',
    message: (data) => `${data.attr} references non-existent id "${data.id}"`,
    why: 'Broken ARIA reference provides no accessibility benefit',
    fix: [
      'Add element with matching id',
      'Correct the id reference',
      'Remove the broken reference'
    ],
    wcag: '4.1.1',
    link: null
  },
  ACCESSKEY_DUPLICATE: {
    severity: 'error',
    message: (data) => `Duplicate accesskey="${data.key}"`,
    why: 'Duplicate accesskeys create unpredictable keyboard shortcuts',
    fix: ['Use unique accesskey values', 'Remove duplicate accesskeys'],
    wcag: '4.1.1',
    link: null
  },
  ID_DUPLICATE: {
    severity: 'error',
    message: (data) => `Duplicate id="${data.id}"`,
    why: 'Duplicate IDs break ARIA references and label associations',
    fix: ['Use unique id values', 'Use class for styling multiple elements'],
    wcag: '4.1.1',
    link: null
  },

  // ============================================
  // LANGUAGE & TEXT (TEXT_*)
  // ============================================
  HTML_MISSING_LANG: {
    severity: 'error',
    message: '<html> missing lang attribute',
    why: 'Screen readers cannot determine page language for pronunciation',
    fix: ['Add lang="en" (or appropriate language code) to <html>'],
    wcag: '3.1.1',
    link: null
  },
  TEXT_SMALL_FONT: {
    severity: 'warning',
    message: (data) => `Font size ${data.size} may be too small`,
    why: 'Small text is difficult for users with low vision',
    fix: [
      'Use minimum 16px (1rem) for body text',
      'Use relative units (rem, em) for scalability',
      'Test at 200% zoom'
    ],
    wcag: '1.4.4',
    link: null
  },
  TEXT_LINE_HEIGHT_TIGHT: {
    severity: 'warning',
    message: 'Line height too tight for readability',
    why: 'Tight line spacing is difficult for users with dyslexia',
    fix: [
      'Use line-height: 1.5 minimum for body text',
      'Use line-height: 1.2 minimum for headings'
    ],
    wcag: '1.4.12',
    link: null
  },
  TEXT_JUSTIFY: {
    severity: 'warning',
    message: 'Justified text creates uneven spacing',
    why: 'Rivers of whitespace are difficult for users with dyslexia',
    fix: ['Use text-align: left or start', 'Avoid text-align: justify'],
    wcag: '1.4.8',
    link: null
  },

  // ============================================
  // COLOR & CONTRAST (COLOR_*)
  // ============================================
  COLOR_CONTRAST_LOW: {
    severity: 'error',
    message: (data) => `Low contrast ${data.ratio}:1 (needs ${data.required}:1)`,
    why: 'Low contrast text is difficult to read for users with low vision',
    fix: [
      'Increase contrast by darkening text or lightening background',
      'Use contrast checker tool to verify'
    ],
    wcag: '1.4.3',
    link: 'https://webaim.org/resources/contrastchecker/'
  },
  COLOR_CONTRAST_LARGE_TEXT: {
    severity: 'warning',
    message: (data) => `Contrast ${data.ratio}:1 only meets AA for large text (18pt+)`,
    why: 'Normal-sized text requires higher contrast ratio',
    fix: [
      'Increase contrast to 4.5:1 for normal text',
      'Acceptable for text 18pt+ or 14pt bold'
    ],
    wcag: '1.4.3',
    link: null
  },
  COLOR_TRANSPARENT_TEXT: {
    severity: 'error',
    message: 'Highly transparent text is difficult to read',
    why: 'Low opacity reduces effective contrast',
    fix: ['Increase opacity to at least 0.55', 'Use solid colors for text'],
    wcag: '1.4.3',
    link: null
  },

  // ============================================
  // ANIMATION & MOTION (MOTION_*)
  // ============================================
  MOTION_NO_REDUCED_MOTION: {
    severity: 'warning',
    message: 'Animation without prefers-reduced-motion support',
    why: 'Animations can cause vestibular disorders and motion sickness',
    fix: [
      'Add @media (prefers-reduced-motion: reduce) query',
      'Disable or reduce animation when preference is set'
    ],
    wcag: '2.3.3',
    link: null
  },
  MOTION_BLINK: {
    severity: 'error',
    message: '<blink> element is not accessible',
    why: 'Blinking content can trigger seizures and is distracting',
    fix: ['Remove <blink> element entirely', 'Use CSS animation with user control'],
    wcag: '2.2.2',
    link: null
  },
  MOTION_MARQUEE: {
    severity: 'error',
    message: '<marquee> element is not accessible',
    why: 'Moving text is difficult to read and cannot be paused',
    fix: ['Remove <marquee> element', 'Use static text or controlled animation'],
    wcag: '2.2.2',
    link: null
  },

  // ============================================
  // FRAMES & EMBEDS (FRAME_*)
  // ============================================
  IFRAME_MISSING_TITLE: {
    severity: 'error',
    message: 'iframe missing title attribute',
    why: 'Screen readers announce frames without context',
    fix: ['Add title="Description of frame content"'],
    wcag: '4.1.2',
    link: null
  },
  META_REFRESH: {
    severity: 'error',
    message: 'meta refresh may disorient users',
    why: 'Automatic page refresh interrupts screen reader users',
    fix: ['Remove meta refresh', 'Provide user-controlled refresh option'],
    wcag: '2.2.1',
    link: null
  },
  META_VIEWPORT_SCALABLE: {
    severity: 'error',
    message: 'Viewport disables user scaling',
    why: 'Users with low vision need to zoom content',
    fix: [
      'Remove user-scalable=no',
      'Remove maximum-scale < 2',
      'Allow pinch-to-zoom on mobile'
    ],
    wcag: '1.4.4',
    link: null
  },

  // ============================================
  // ANGULAR MATERIAL (MAT_*)
  // ============================================
  MAT_BUTTON_MISSING_TYPE: {
    severity: 'warning',
    message: 'mat-button in form missing type attribute',
    why: 'Buttons default to type="submit" which may cause unexpected form submission',
    fix: ['Add type="button" for non-submit buttons', 'Add type="submit" explicitly for submit buttons'],
    wcag: '3.2.2',
    link: 'https://material.angular.io/components/button/overview'
  },
  MAT_FORM_FIELD_MISSING_LABEL: {
    severity: 'error',
    message: 'mat-form-field missing label',
    why: 'Screen readers cannot identify the input purpose',
    fix: [
      'Add <mat-label> inside mat-form-field',
      'Add aria-label to the input',
      'Add placeholder (not recommended as sole label)'
    ],
    wcag: '4.1.2',
    link: 'https://material.angular.io/components/form-field/overview#accessibility'
  },
  MAT_SELECT_MISSING_LABEL: {
    severity: 'error',
    message: 'mat-select missing accessible label',
    why: 'Screen readers cannot identify the select purpose',
    fix: [
      'Add <mat-label> in mat-form-field',
      'Add aria-label attribute',
      'Add placeholder attribute'
    ],
    wcag: '4.1.2',
    link: 'https://material.angular.io/components/select/overview#accessibility'
  },
  MAT_CHECKBOX_MISSING_LABEL: {
    severity: 'error',
    message: 'mat-checkbox missing accessible label',
    why: 'Screen readers cannot announce the checkbox purpose',
    fix: [
      'Add text content inside <mat-checkbox>',
      'Add aria-label attribute'
    ],
    wcag: '4.1.2',
    link: 'https://material.angular.io/components/checkbox/overview#accessibility'
  },
  MAT_RADIO_GROUP_MISSING_LABEL: {
    severity: 'error',
    message: 'mat-radio-group missing accessible label',
    why: 'Screen readers cannot identify the radio group purpose',
    fix: [
      'Add aria-label to mat-radio-group',
      'Add aria-labelledby referencing visible label'
    ],
    wcag: '4.1.2',
    link: 'https://material.angular.io/components/radio/overview#accessibility'
  },
  MAT_SLIDER_MISSING_LABEL: {
    severity: 'error',
    message: 'mat-slider missing accessible label',
    why: 'Screen readers cannot identify the slider purpose',
    fix: [
      'Add aria-label to slider input',
      'Add aria-labelledby referencing visible label'
    ],
    wcag: '4.1.2',
    link: 'https://material.angular.io/components/slider/overview#accessibility'
  },
  MAT_SLIDE_TOGGLE_MISSING_LABEL: {
    severity: 'error',
    message: 'mat-slide-toggle missing accessible label',
    why: 'Screen readers cannot announce the toggle purpose',
    fix: [
      'Add text content inside <mat-slide-toggle>',
      'Add aria-label attribute'
    ],
    wcag: '4.1.2',
    link: 'https://material.angular.io/components/slide-toggle/overview#accessibility'
  },
  MAT_AUTOCOMPLETE_MISSING_LABEL: {
    severity: 'error',
    message: 'mat-autocomplete input missing accessible label',
    why: 'Screen readers cannot identify the autocomplete purpose',
    fix: [
      'Add <mat-label> in mat-form-field',
      'Add aria-label to the input'
    ],
    wcag: '4.1.2',
    link: 'https://material.angular.io/components/autocomplete/overview#accessibility'
  },
  MAT_DATEPICKER_MISSING_LABEL: {
    severity: 'error',
    message: 'mat-datepicker input missing accessible label',
    why: 'Screen readers cannot identify the date field purpose',
    fix: [
      'Add <mat-label> in mat-form-field',
      'Add aria-label to the input'
    ],
    wcag: '4.1.2',
    link: 'https://material.angular.io/components/datepicker/overview#accessibility'
  },
  MAT_CHIP_LIST_MISSING_LABEL: {
    severity: 'error',
    message: 'mat-chip-listbox missing accessible label',
    why: 'Screen readers cannot identify the chip list purpose',
    fix: [
      'Add aria-label to mat-chip-listbox',
      'Add aria-labelledby referencing visible label'
    ],
    wcag: '4.1.2',
    link: 'https://material.angular.io/components/chips/overview#accessibility'
  },
  MAT_EXPANSION_MISSING_HEADER: {
    severity: 'error',
    message: 'mat-expansion-panel missing header',
    why: 'Screen readers cannot identify the panel title',
    fix: ['Add <mat-expansion-panel-header> with title text'],
    wcag: '4.1.2',
    link: 'https://material.angular.io/components/expansion/overview#accessibility'
  },
  MAT_TAB_MISSING_LABEL: {
    severity: 'error',
    message: 'mat-tab missing label',
    why: 'Screen readers cannot announce the tab name',
    fix: [
      'Add label attribute to mat-tab',
      'Add aria-label attribute'
    ],
    wcag: '4.1.2',
    link: 'https://material.angular.io/components/tabs/overview#accessibility'
  },
  MAT_STEPPER_MISSING_LABEL: {
    severity: 'error',
    message: 'mat-step missing label',
    why: 'Screen readers cannot announce step names',
    fix: [
      'Add label attribute to mat-step',
      'Add aria-label attribute'
    ],
    wcag: '4.1.2',
    link: 'https://material.angular.io/components/stepper/overview#accessibility'
  },
  MAT_DIALOG_FOCUS: {
    severity: 'warning',
    message: 'mat-dialog should manage focus',
    why: 'Focus should move to dialog and return on close',
    fix: [
      'MatDialog handles focus automatically',
      'Use cdkFocusInitial for custom initial focus',
      'Ensure focusable element exists in dialog'
    ],
    wcag: '2.4.3',
    link: 'https://material.angular.io/components/dialog/overview#accessibility'
  },
  MAT_MENU_TRIGGER_MISSING: {
    severity: 'error',
    message: 'mat-menu not connected to trigger',
    why: 'Menu cannot be opened without proper trigger connection',
    fix: ['Add [matMenuTriggerFor]="menu" to trigger element'],
    wcag: '4.1.2',
    link: 'https://material.angular.io/components/menu/overview#accessibility'
  },
  MAT_TOOLTIP_KEYBOARD: {
    severity: 'warning',
    message: 'matTooltip on non-focusable element',
    why: 'Keyboard users cannot trigger tooltip on non-focusable elements',
    fix: [
      'Add tabindex="0" to make element focusable',
      'Use on natively focusable element (button, link)'
    ],
    wcag: '2.1.1',
    link: 'https://material.angular.io/components/tooltip/overview#accessibility'
  },
  MAT_ICON_MISSING_LABEL: {
    severity: 'error',
    message: 'mat-icon used as interactive without accessible label',
    why: 'Screen readers cannot announce icon-only buttons',
    fix: [
      'Add aria-label to parent button',
      'Add visually-hidden text',
      'Add aria-hidden="true" if purely decorative'
    ],
    wcag: '4.1.2',
    link: 'https://material.angular.io/components/icon/overview#accessibility'
  },
  MAT_ICON_DECORATIVE: {
    severity: 'info',
    message: 'Consider marking decorative mat-icon with aria-hidden',
    why: 'Decorative icons add noise for screen reader users',
    fix: ['Add aria-hidden="true" to decorative icons'],
    wcag: '1.1.1',
    link: null
  },
  MAT_PROGRESS_MISSING_LABEL: {
    severity: 'error',
    message: 'mat-progress-bar/spinner missing accessible label',
    why: 'Screen readers cannot identify what is loading',
    fix: [
      'Add aria-label="Loading description"',
      'Add aria-labelledby referencing status text'
    ],
    wcag: '4.1.2',
    link: 'https://material.angular.io/components/progress-bar/overview#accessibility'
  },
  MAT_SNACKBAR_POLITENESS: {
    severity: 'info',
    message: 'Consider snackbar politeness for screen readers',
    why: 'Important messages should interrupt, routine ones should not',
    fix: [
      'Use politeness: "assertive" for important alerts',
      'Use politeness: "polite" (default) for routine messages'
    ],
    wcag: '4.1.3',
    link: 'https://material.angular.io/components/snack-bar/overview#accessibility'
  },
  MAT_TABLE_MISSING_HEADERS: {
    severity: 'error',
    message: 'mat-table missing column headers',
    why: 'Screen readers cannot identify column contents',
    fix: [
      'Add mat-header-row with mat-header-cell elements',
      'Ensure each column has a header'
    ],
    wcag: '1.3.1',
    link: 'https://material.angular.io/components/table/overview#accessibility'
  },
  MAT_SORT_MISSING_LABEL: {
    severity: 'warning',
    message: 'mat-sort-header should have clear label',
    why: 'Screen readers need to announce sortable columns',
    fix: [
      'Ensure header text clearly describes column',
      'Add sortActionDescription for custom announcement'
    ],
    wcag: '4.1.2',
    link: 'https://material.angular.io/components/sort/overview#accessibility'
  },
  MAT_PAGINATOR_MISSING_LABEL: {
    severity: 'error',
    message: 'mat-paginator missing accessible labels',
    why: 'Screen readers need context for pagination controls',
    fix: [
      'Add aria-label to mat-paginator',
      'Configure MatPaginatorIntl for custom labels'
    ],
    wcag: '4.1.2',
    link: 'https://material.angular.io/components/paginator/overview#accessibility'
  },
  MAT_BADGE_MISSING_DESCRIPTION: {
    severity: 'error',
    message: 'matBadge missing description for screen readers',
    why: 'Screen readers need to announce badge content in context',
    fix: [
      'Add matBadgeDescription="description"',
      'Describe what the badge count represents'
    ],
    wcag: '4.1.2',
    link: 'https://material.angular.io/components/badge/overview#accessibility'
  },
  MAT_SIDENAV_MISSING_LABEL: {
    severity: 'error',
    message: 'mat-sidenav missing accessible label',
    why: 'Screen readers cannot identify the navigation region',
    fix: [
      'Add role="navigation"',
      'Add aria-label="Main navigation"',
      'Wrap in <nav> element'
    ],
    wcag: '4.1.2',
    link: 'https://material.angular.io/components/sidenav/overview#accessibility'
  },
  MAT_TREE_MISSING_LABEL: {
    severity: 'error',
    message: 'mat-tree missing accessible label',
    why: 'Screen readers cannot identify the tree structure',
    fix: [
      'Add aria-label to mat-tree',
      'Add aria-labelledby referencing visible heading'
    ],
    wcag: '4.1.2',
    link: 'https://material.angular.io/components/tree/overview#accessibility'
  },
  MAT_BOTTOM_SHEET_MISSING_LABEL: {
    severity: 'warning',
    message: 'Bottom sheet should have heading or aria-label',
    why: 'Screen readers need to identify the sheet content',
    fix: [
      'Add heading element in sheet content',
      'Add aria-label when opening sheet'
    ],
    wcag: '2.4.3',
    link: 'https://material.angular.io/components/bottom-sheet/overview#accessibility'
  },
  MAT_BUTTON_TOGGLE_MISSING_LABEL: {
    severity: 'error',
    message: 'mat-button-toggle missing accessible label',
    why: 'Screen readers cannot announce toggle purpose',
    fix: [
      'Add text content inside toggle',
      'Add aria-label attribute'
    ],
    wcag: '4.1.2',
    link: 'https://material.angular.io/components/button-toggle/overview#accessibility'
  },
  MAT_LIST_SELECTION_MISSING_LABEL: {
    severity: 'error',
    message: 'mat-selection-list missing accessible label',
    why: 'Screen readers cannot identify the list purpose',
    fix: [
      'Add aria-label to mat-selection-list',
      'Add aria-labelledby referencing visible label'
    ],
    wcag: '4.1.2',
    link: 'https://material.angular.io/components/list/overview#accessibility'
  },

  // ============================================
  // CDK (CDK_*)
  // ============================================
  CDK_LIVE_ANNOUNCER_MISSING: {
    severity: 'warning',
    message: 'Dynamic content should announce changes',
    why: 'Screen readers may miss dynamically updated content',
    fix: [
      'Use LiveAnnouncer service for important updates',
      'Add aria-live region',
      'Use cdkAriaLive directive'
    ],
    wcag: '4.1.3',
    link: 'https://material.angular.io/cdk/a11y/overview#liveannouncer'
  },
  CDK_FOCUS_TRAP_MISSING: {
    severity: 'error',
    message: 'Dialog missing cdkTrapFocus',
    why: 'Keyboard users can tab outside dialog unexpectedly',
    fix: [
      'Add cdkTrapFocus directive to dialog container',
      'Use MatDialog which includes focus trapping'
    ],
    wcag: '2.1.2',
    link: 'https://material.angular.io/cdk/a11y/overview#focustrap'
  },

  // ============================================
  // SECURITY & OTHER (SEC_*, OTHER_*)
  // ============================================
  INNER_HTML_USAGE: {
    severity: 'warning',
    message: 'innerHTML usage may affect accessibility',
    why: 'Dynamic HTML should maintain accessible structure',
    fix: [
      'Sanitize HTML content',
      'Ensure dynamic content is accessible',
      'Prefer Angular templates over innerHTML'
    ],
    wcag: '4.1.2',
    link: null
  },
  SKIP_LINK_MISSING: {
    severity: 'warning',
    message: 'Page may need skip navigation link',
    why: 'Keyboard users need to skip repetitive content',
    fix: [
      'Add skip link as first focusable element',
      'Link to main content area',
      'Example: <a href="#main">Skip to content</a>'
    ],
    wcag: '2.4.1',
    link: null
  },
  SKIP_LINK_HIDDEN: {
    severity: 'error',
    message: 'Skip link is permanently hidden with display:none',
    why: 'Hidden skip links cannot be activated by keyboard users',
    fix: [
      'Use visually-hidden CSS instead of display:none',
      'Example: position: absolute; left: -10000px;',
      'Show skip link on focus with :focus styles'
    ],
    wcag: '2.4.1',
    link: null
  },
  SKIP_LINK_BROKEN_TARGET: {
    severity: 'error',
    message: 'Skip link target ID does not exist',
    why: 'Skip link points to an element that cannot be found',
    fix: [
      'Verify the target ID exists in the document',
      'Add id attribute to main content area',
      'Example: <main id="main">...</main>'
    ],
    wcag: '2.4.1',
    link: null
  },
  SKIP_LINK_AFTER_NAV: {
    severity: 'warning',
    message: 'Skip link appears after navigation',
    why: 'Skip link should be first focusable element to skip navigation',
    fix: [
      'Move skip link before the navigation',
      'Place as first child of <body>',
      'Can be visually hidden but must be first in tab order'
    ],
    wcag: '2.4.1',
    link: null
  },
  USER_SELECT_NONE: {
    severity: 'warning',
    message: 'user-select: none prevents text selection',
    why: 'Users may need to copy text for translation or assistive tools',
    fix: [
      'Remove user-select: none from text content',
      'Only use for UI elements (buttons, sliders)'
    ],
    wcag: '1.3.1',
    link: null
  },
  POINTER_EVENTS_NONE: {
    severity: 'warning',
    message: 'pointer-events: none may hide interactive element',
    why: 'Users cannot interact with elements that have pointer-events disabled',
    fix: [
      'Ensure element is not intended to be interactive',
      'Use disabled attribute instead for form elements'
    ],
    wcag: '2.1.1',
    link: null
  },
  VISIBILITY_HIDDEN_FOCUS: {
    severity: 'warning',
    message: 'visibility: hidden element may be in tab order',
    why: 'Focusable hidden elements confuse keyboard navigation',
    fix: [
      'Add tabindex="-1" to hidden elements',
      'Use display: none to remove from tab order',
      'Manage focus when showing/hiding'
    ],
    wcag: '2.4.3',
    link: null
  },
  NG_FOR_TRACK_BY: {
    severity: 'info',
    message: 'ngFor without trackBy may affect performance',
    why: 'Poor performance can disproportionately affect users with older assistive technology',
    fix: ['Add trackBy function to *ngFor'],
    wcag: null,
    link: null
  }
};

/**
 * Get error definition by code
 * @param {string} code - Error code
 * @returns {Object|null} Error definition
 */
function getError(code) {
  return ERRORS[code] || null;
}

/**
 * Format an error for output
 * @param {string} code - Error code
 * @param {Object} [data] - Dynamic data for message
 * @returns {string} Formatted error string
 */
function format(code, data = {}) {
  const err = ERRORS[code];
  if (!err) {
    return `[Error] Unknown error code: ${code}`;
  }

  const lines = [];

  // Severity prefix
  const prefix = err.severity === 'error' ? '[Error]' :
                 err.severity === 'warning' ? '[Warning]' : '[Info]';

  // Message (may be function for dynamic content)
  const message = typeof err.message === 'function' ? err.message(data) : err.message;

  // Main line
  lines.push(`${prefix} ${message}. ${err.why}`);

  // Fix suggestions (may be function for dynamic content)
  const fixes = typeof err.fix === 'function' ? err.fix(data) : err.fix;
  if (fixes && fixes.length > 0) {
    lines.push('  How to fix:');
    for (const f of fixes) {
      lines.push(`    - ${f}`);
    }
  }

  // References
  const refs = [];
  if (err.wcag) {
    const name = WCAG[err.wcag] || err.wcag;
    refs.push(`WCAG ${err.wcag}: ${name}`);
  }
  if (err.link) {
    refs.push(`See: ${err.link}`);
  }
  if (refs.length > 0) {
    lines.push(`  ${refs.join(' | ')}`);
  }

  // Element snippet
  if (data.element) {
    const snippet = data.element.length > 100
      ? data.element.replace(/\s+/g, ' ').substring(0, 100) + '...'
      : data.element.replace(/\s+/g, ' ');
    const location = data.line ? ` (line ${data.line})` : '';
    lines.push(`  Found: ${snippet}${location}`);
  }

  return lines.join('\n');
}

/**
 * Create a reporter bound to specific error codes
 * @param {string[]} codes - Error codes this reporter can emit
 * @returns {Object} Reporter with methods for each error code
 */
function createReporter(codes) {
  const reporter = {};
  for (const code of codes) {
    reporter[code] = (data = {}) => format(code, data);
  }
  return reporter;
}

/**
 * Parse formatted error string back to structured data
 * @param {string} str - Formatted error string
 * @returns {Object} Parsed error data
 */
function parse(str) {
  const result = {
    severity: 'error',
    message: '',
    why: '',
    fix: [],
    wcag: null,
    link: null,
    element: null,
    line: null
  };

  const lines = str.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (i === 0) {
      const match = line.match(/^\[(Error|Warning|Info)\]\s*(.+?)\.\s*(.+)$/i);
      if (match) {
        result.severity = match[1].toLowerCase();
        result.message = match[2].trim();
        result.why = match[3].trim();
      }
      continue;
    }

    if (line.trim().startsWith('- ')) {
      result.fix.push(line.trim().substring(2));
    }

    const wcagMatch = line.match(/WCAG\s+([\d.]+)/i);
    if (wcagMatch) result.wcag = wcagMatch[1];

    const linkMatch = line.match(/See:\s*(https?:\/\/[^\s|]+)/i);
    if (linkMatch) result.link = linkMatch[1];

    const elementMatch = line.match(/Found:\s*(.+?)(?:\s*\(line\s*(\d+)\))?$/);
    if (elementMatch) {
      result.element = elementMatch[1].trim();
      if (elementMatch[2]) result.line = parseInt(elementMatch[2], 10);
    }
  }

  return result;
}

/**
 * List all error codes
 * @returns {string[]} Array of error codes
 */
function listCodes() {
  return Object.keys(ERRORS);
}

/**
 * Get all errors grouped by category
 * @returns {Object} Errors grouped by prefix
 */
function getCategories() {
  const categories = {};
  for (const code of Object.keys(ERRORS)) {
    const prefix = code.split('_')[0];
    if (!categories[prefix]) categories[prefix] = [];
    categories[prefix].push(code);
  }
  return categories;
}

// ============================================
// OUTPUT MODES FOR CI/CD
// ============================================

/**
 * Output modes:
 * - 'compact': Single-line JSON for fast CI parsing
 * - 'standard': Multi-line human-readable (default)
 * - 'json': Full JSON object
 */

/**
 * Format error as compact single-line JSON (fastest for CI/CD)
 * @param {string} code - Error code
 * @param {Object} [data] - Dynamic data
 * @returns {string} JSON string
 */
function compact(code, data = {}) {
  const err = ERRORS[code];
  if (!err) return JSON.stringify({ code: 'UNKNOWN', message: `Unknown: ${code}` });

  const message = typeof err.message === 'function' ? err.message(data) : err.message;

  return JSON.stringify({
    code,
    severity: err.severity,
    message,
    wcag: err.wcag,
    element: data.element ? data.element.substring(0, 80).replace(/\s+/g, ' ') : null,
    line: data.line || null
  });
}

/**
 * Format error as full JSON object (for programmatic use)
 * @param {string} code - Error code
 * @param {Object} [data] - Dynamic data
 * @returns {Object} Error object
 */
function toJSON(code, data = {}) {
  const err = ERRORS[code];
  if (!err) return { code: 'UNKNOWN', message: `Unknown error code: ${code}` };

  const message = typeof err.message === 'function' ? err.message(data) : err.message;
  const fixes = typeof err.fix === 'function' ? err.fix(data) : err.fix;

  return {
    code,
    severity: err.severity,
    message,
    why: err.why,
    fix: fixes,
    wcag: err.wcag ? { code: err.wcag, name: WCAG[err.wcag] } : null,
    link: err.link,
    element: data.element || null,
    line: data.line || null
  };
}

/**
 * Quick check result for CI - minimal overhead
 * @param {boolean} pass - Did check pass?
 * @param {Array} issues - Array of {code, data} objects
 * @returns {Object} Result object
 */
function result(pass, issues = []) {
  return {
    pass,
    issues: issues.map(i => typeof i === 'string' ? i : format(i.code, i.data)),
    json: () => issues.map(i => typeof i === 'string' ? parse(i) : toJSON(i.code, i.data)),
    compact: () => issues.map(i => typeof i === 'string' ? i : compact(i.code, i.data))
  };
}

/**
 * Severity levels for filtering
 */
const SEVERITY = {
  error: 2,
  warning: 1,
  info: 0
};

/**
 * Filter issues by minimum severity
 * @param {string[]} issues - Formatted issue strings
 * @param {string} minSeverity - Minimum severity to include
 * @returns {string[]} Filtered issues
 */
function filterBySeverity(issues, minSeverity = 'info') {
  const minLevel = SEVERITY[minSeverity] || 0;
  return issues.filter(issue => {
    const match = issue.match(/^\[(Error|Warning|Info)\]/i);
    if (!match) return true;
    const level = SEVERITY[match[1].toLowerCase()] || 0;
    return level >= minLevel;
  });
}

/**
 * Count issues by severity
 * @param {string[]} issues - Formatted issue strings
 * @returns {Object} Counts by severity
 */
function countBySeverity(issues) {
  const counts = { error: 0, warning: 0, info: 0 };
  for (const issue of issues) {
    const match = issue.match(/^\[(Error|Warning|Info)\]/i);
    if (match) counts[match[1].toLowerCase()]++;
  }
  return counts;
}

module.exports = {
  // Error catalog
  ERRORS,
  WCAG,
  SEVERITY,

  // Core functions
  getError,
  format,
  parse,
  createReporter,

  // Output modes
  compact,
  toJSON,
  result,

  // Utilities
  listCodes,
  getCategories,
  filterBySeverity,
  countBySeverity
};
