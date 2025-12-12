'use strict';

/**
 * Lighthouse-compatible audit weights
 *
 * Based on Lighthouse accessibility scoring:
 * https://developer.chrome.com/docs/lighthouse/accessibility/scoring
 *
 * Weight 10 = Critical (WCAG A violations)
 * Weight 7  = Important (WCAG AA, high impact)
 * Weight 5  = Moderate (best practices)
 * Weight 3  = Minor (low impact, informational)
 */

const WEIGHTS = {
  // ============================================
  // HTML Checks
  // ============================================

  // Weight 10 - Critical
  buttonNames: 10,
  imageAlt: 10,
  inputImageAlt: 10,
  formLabels: 10,
  ariaRoles: 10,
  ariaAttributes: 10,
  ariaHiddenBody: 10,
  duplicateIdAria: 10,
  metaRefresh: 10,
  metaViewport: 10,
  videoCaptions: 10,
  tableHeaders: 10,
  blinkElement: 10,
  marqueeElement: 10,

  // Weight 7 - Important
  accesskeyUnique: 7,
  linkNames: 7,
  htmlHasLang: 7,
  iframeTitles: 7,
  listStructure: 7,
  dlStructure: 7,
  tabindex: 7,
  objectAlt: 7,
  emptyTableHeader: 7,
  uniqueIds: 7,
  formFieldName: 7,
  scopeAttrMisuse: 7,
  autoplayMedia: 7,

  // Weight 3 - Minor
  headingOrder: 3,
  skipLink: 3,
  autofocusUsage: 5,

  // ============================================
  // Angular Material Checks
  // ============================================

  // Weight 10 - Critical (form inputs need labels)
  matFormFieldLabel: 10,
  matSelectPlaceholder: 10,
  matCheckboxLabel: 10,
  matRadioGroupLabel: 10,
  matSliderLabel: 10,
  matSlideToggleLabel: 10,
  matAutocompleteLabel: 10,
  matDatepickerLabel: 10,
  matChipListLabel: 10,

  // Weight 7 - Important
  matIconAccessibility: 7,
  matButtonType: 7,
  matProgressSpinnerLabel: 7,
  matProgressBarLabel: 7,
  matTooltipKeyboard: 7,
  matDialogFocus: 7,
  matExpansionHeader: 7,
  matTabLabel: 7,
  matStepLabel: 7,
  matMenuTrigger: 7,
  matTableHeaders: 7,
  matPaginatorLabel: 7,
  matSidenavA11y: 7,
  matTreeA11y: 7,
  matBadgeDescription: 7,
  matButtonToggleLabel: 7,
  matListSelectionLabel: 7,
  matSortHeaderAnnounce: 7,

  // Weight 5 - Moderate
  matBottomSheetA11y: 5,
  matSnackbarPoliteness: 5,

  // ============================================
  // Angular Checks
  // ============================================

  // Weight 7 - Important (keyboard accessibility)
  clickWithoutKeyboard: 7,
  clickWithoutRole: 7,
  routerLinkNames: 7,

  // Weight 5 - Moderate
  asyncPipeAria: 5,

  // Weight 3 - Minor
  ngForTrackBy: 3,
  innerHtmlUsage: 3,

  // ============================================
  // CDK Checks
  // ============================================

  cdkTrapFocusDialog: 7,
  cdkLiveAnnouncer: 5,
  cdkAriaDescriber: 5,

  // ============================================
  // SCSS Checks
  // ============================================

  // Weight 7 - Important (focus visibility is WCAG AA)
  colorContrast: 7,
  focusStyles: 7,
  outlineNoneWithoutAlt: 7,
  hoverWithoutFocus: 7,

  // Weight 5 - Moderate
  touchTargets: 5,
  prefersReducedMotion: 5,
  pointerEventsNone: 5,

  // Weight 3 - Minor
  smallFontSize: 3,
  lineHeightTight: 3,
  contentOverflow: 3,
  userSelectNone: 3,
  focusWithinSupport: 3,
  textJustify: 3,
  visibilityHiddenUsage: 3,
};

/**
 * Get weight for a check
 * @param {string} checkName - Name of the check
 * @returns {number} Weight (defaults to 5 if not defined)
 */
function getWeight(checkName) {
  return WEIGHTS[checkName] || 5;
}

/**
 * Calculate Lighthouse-style audit score
 *
 * Only ERRORS count toward audit pass/fail (like Lighthouse).
 * Warnings and info are tracked but don't fail audits.
 *
 * @param {Object} checkResults - Map of check name to { elementsFound, issues, errors }
 * @returns {Object} { score, earned, total, passed, failed, audits }
 */
function calculateAuditScore(checkResults) {
  let totalWeight = 0;
  let earnedWeight = 0;
  const audits = [];

  for (const [name, stats] of Object.entries(checkResults)) {
    // Only count checks that found elements (applicable audits)
    if (stats.elementsFound > 0) {
      const weight = getWeight(name);
      totalWeight += weight;
      // Only ERRORS fail an audit (not warnings/info)
      // Fall back to issues count for backwards compatibility
      const errorCount = stats.errors !== undefined ? stats.errors : stats.issues;
      const passed = errorCount === 0;
      if (passed) earnedWeight += weight;

      audits.push({
        name,
        weight,
        passed,
        elementsFound: stats.elementsFound,
        errors: errorCount,
        warnings: stats.warnings || 0,
        issues: stats.issues  // Total issues (errors + warnings + info)
      });
    }
  }

  // Sort by weight desc, then failed first
  audits.sort((a, b) => {
    if (a.passed !== b.passed) return a.passed ? 1 : -1;
    return b.weight - a.weight;
  });

  const score = totalWeight > 0 ? Math.round(earnedWeight / totalWeight * 100) : 100;
  const passedCount = audits.filter(a => a.passed).length;
  const failedCount = audits.filter(a => !a.passed).length;

  return {
    score,
    earned: earnedWeight,
    total: totalWeight,
    passed: passedCount,
    failed: failedCount,
    audits
  };
}

module.exports = {
  WEIGHTS,
  getWeight,
  calculateAuditScore
};
