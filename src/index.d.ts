/**
 * mat-a11y - TypeScript Type Definitions
 *
 * Angular Material accessibility linter.
 * 82 WCAG checks for mat-* components, Angular templates & SCSS.
 */

// ============================================
// CORE TYPES
// ============================================

export type Tier = 'basic' | 'material' | 'full';
export type FileType = 'html' | 'scss';
export type Severity = 'error' | 'warning' | 'info';
export type ContrastRating = 'fail' | 'AA-large' | 'AA' | 'AAA' | 'unknown';

/** RGB color as [red, green, blue] values (0-255) */
export type RGB = [number, number, number];

// ============================================
// ANALYSIS OPTIONS & RESULTS
// ============================================

export interface AnalyzeOptions {
  /** Tier level: 'basic', 'material', or 'full' */
  tier?: Tier;
  /** Patterns to ignore (e.g., 'node_modules', 'dist') */
  ignore?: string[];
  /** Run only a specific check by name */
  check?: string | null;
  /** Run self-test verification before analysis */
  verified?: boolean;
  /** Parallel execution: number of workers, 'auto', or null for sync */
  workers?: number | 'auto' | null;
  /** Enable verbose output */
  verbose?: boolean;
  /** File extensions to scan */
  extensions?: {
    html?: string[];
    scss?: string[];
  };
}

export interface Issue {
  /** Error message */
  message: string;
  /** File path where issue was found */
  file?: string;
  /** Check name that found the issue */
  check?: string;
  /** Line number (if available) */
  line?: number | null;
}

export interface AuditResult {
  /** Check name */
  name: string;
  /** Lighthouse-style weight */
  weight: number;
  /** Whether audit passed (0 issues) */
  passed: boolean;
  /** Number of elements found */
  elementsFound: number;
  /** Number of issues */
  issues: number;
}

export interface AnalysisSummary {
  /** Total files analyzed */
  totalFiles: number;
  /** Total elements (HTML elements, CSS rules) evaluated */
  elementsChecked: number;
  /** Number of elements that passed (no issues) */
  elementsPassed: number;
  /** Number of elements that failed (have issues) */
  elementsFailed: number;
  /** Lighthouse-style audit score (0-100) */
  auditScore: number;
  /** Total applicable audits */
  auditsTotal: number;
  /** Number of passing audits */
  auditsPassed: number;
  /** Number of failing audits */
  auditsFailed: number;
  /** Detailed audit results */
  audits: AuditResult[];
  /** Array of all issues found */
  issues: Issue[];
}

export interface TimingInfo {
  /** Duration in milliseconds */
  duration: number;
}

export interface AnalysisResult {
  /** Tier used for analysis */
  tier: Tier;
  /** Single check name if specified */
  check?: string | null;
  /** Results per file */
  files: Record<string, CheckResult[]>;
  /** Summary statistics */
  summary: AnalysisSummary;
  /** Timing information (when using parallel execution) */
  timing?: TimingInfo;
}

// ============================================
// CHECK RESULT & INFO
// ============================================

export class CheckResult {
  /** Check name */
  name: string;
  /** Whether the check passed */
  passed: boolean;
  /** Array of issues found */
  issues: string[];
  /** Number of issues */
  count: number;
  /** Number of elements evaluated by this check */
  elementsFound: number;

  constructor(name: string, passed: boolean, issues?: string[], elementsFound?: number);
}

export interface CheckInfo {
  /** Unique check identifier */
  name: string;
  /** Human-readable description */
  description: string;
  /** Tier that includes this check */
  tier: Tier;
  /** File type this check analyzes */
  type: FileType;
  /** Importance weight (1-10) */
  weight: number;
  /** WCAG criterion code (e.g., '4.1.2') */
  wcag: string | null;
}

// ============================================
// VERIFICATION
// ============================================

export interface VerifyCheckDetail {
  /** Check name */
  name: string;
  /** Verification status */
  status: 'verified' | 'failed' | 'skipped';
  /** Failure reason if applicable */
  reason?: string;
}

export interface VerifyResult {
  /** Total checks tested */
  total: number;
  /** Successfully verified checks */
  verified: number;
  /** Failed verification */
  failed: number;
  /** Skipped checks */
  skipped: number;
  /** Detailed results per check */
  details: VerifyCheckDetail[];
}

// ============================================
// PARALLEL RUNNER
// ============================================

export interface RunnerOptions {
  /** Number of worker threads, 'auto', or null */
  workers?: number | 'auto' | null;
}

export interface FileWithContent {
  /** File path */
  path: string;
  /** File content */
  content: string;
}

export interface RunnerCheckResult {
  pass: boolean;
  issues: string[];
  elementsFound: number;
}

export interface RunnerFileResult {
  checks: Map<string, RunnerCheckResult>;
}

export interface RunnerResult {
  files: Map<string, RunnerFileResult>;
  summary: AnalysisSummary;
  timing: TimingInfo;
}

export class CheckRunner {
  constructor(options?: RunnerOptions);

  /** Run checks on files */
  runChecks(
    files: FileWithContent[],
    tier: Tier,
    options?: { check?: string | null }
  ): Promise<RunnerResult>;

  /** Shutdown the runner and terminate workers */
  shutdown(): Promise<void>;
}

/** Create a new CheckRunner instance */
export function createRunner(options?: RunnerOptions): Promise<CheckRunner>;

// ============================================
// TIERS CONFIGURATION
// ============================================

export interface TierConfig {
  html: string[];
  scss: string[];
  angular: string[];
  material: string[];
  cdk: string[];
}

export interface TiersConfig {
  basic: TierConfig;
  material: TierConfig;
  full: TierConfig;
}

export interface DefaultConfig {
  tier: Tier;
  ignore: string[];
  extensions: {
    html: string[];
    scss: string[];
  };
  verbose: boolean;
  outputFormat: 'console' | 'json' | 'html';
  verified: boolean;
  workers: number | 'auto' | null;
  check: string | null;
}

// ============================================
// COLOR UTILITIES
// ============================================

export interface ColorUtils {
  /** Parse CSS color string to RGB */
  parseColor(color: string): RGB | null;

  /** Calculate relative luminance per WCAG 2.1 */
  getLuminance(rgb: RGB): number | null;

  /** Calculate contrast ratio between two colors */
  getContrastRatio(color1: string, color2: string): number | null;

  /** Check if contrast meets WCAG AA requirements */
  meetsWCAG_AA(ratio: number | null, isLargeText?: boolean): boolean;

  /** Check if contrast meets WCAG AAA requirements */
  meetsWCAG_AAA(ratio: number | null, isLargeText?: boolean): boolean;

  /** Get human-readable contrast rating */
  getContrastRating(ratio: number | null): ContrastRating;

  /** Convert HSL to RGB */
  hslToRgb(h: number, s: number, l: number): RGB;

  /** Named CSS colors mapped to RGB */
  NAMED_COLORS: Record<string, RGB>;
}

// ============================================
// MAIN API FUNCTIONS
// ============================================

/**
 * Quick check with basic tier (~15 checks, fastest)
 * @param targetPath - Directory or file to analyze
 */
export function basic(targetPath: string): AnalysisResult;

/**
 * Material-focused check (~45 checks, recommended default)
 * All mat-* components + Angular patterns + core HTML
 * @param targetPath - Directory or file to analyze
 */
export function material(targetPath: string): AnalysisResult;

/**
 * Full audit with all 82 checks (most thorough)
 * @param targetPath - Directory or file to analyze
 */
export function full(targetPath: string): AnalysisResult;

/**
 * Main analysis function - supports both sync and async modes
 * @param targetPath - Directory or file to analyze
 * @param options - Configuration options
 * @returns Analysis results (Promise if using verified or workers options)
 */
export function analyze(
  targetPath: string,
  options?: AnalyzeOptions
): AnalysisResult | Promise<AnalysisResult>;

/**
 * Check HTML string directly
 * @param html - HTML content to analyze
 * @param tier - Tier level
 */
export function checkHTML(html: string, tier?: Tier): CheckResult[];

/**
 * Check SCSS/CSS string directly
 * @param scss - SCSS/CSS content to analyze
 * @param tier - Tier level
 */
export function checkSCSS(scss: string, tier?: Tier): CheckResult[];

/**
 * Verify all checks for a tier (self-test)
 * @param tier - Tier to verify
 */
export function verifyChecks(tier?: Tier): Promise<VerifyResult>;

/**
 * Get information about a specific check
 * @param name - Check name
 */
export function getCheckInfo(name: string): CheckInfo | null;

/**
 * Format analysis results for console output
 * @param results - Analysis results
 */
export function formatConsoleOutput(results: AnalysisResult): string;

/**
 * Find files matching extensions in directory
 * @param dir - Directory to search
 * @param extensions - File extensions to match
 * @param ignore - Patterns to ignore
 */
export function findFiles(
  dir: string,
  extensions: string[],
  ignore: string[]
): string[];

// ============================================
// EXPORTED CONSTANTS
// ============================================

/** Tiers configuration with check names */
export const TIERS: TiersConfig;

/** Default configuration options */
export const DEFAULT_CONFIG: DefaultConfig;

/** Lighthouse-style audit weights by check name */
export const WEIGHTS: Record<string, number>;

/** Color utilities for contrast calculations */
export const colors: ColorUtils;
