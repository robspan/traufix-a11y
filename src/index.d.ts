/**
 * mat-a11y - TypeScript Type Definitions
 *
 * Angular Material accessibility linter.
 * 82 WCAG checks for mat-* components, Angular templates & SCSS.
 */

// ============================================
// CORE TYPES
// ============================================

export type Tier = 'basic' | 'material' | 'angular' | 'full';
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
  angular: TierConfig;
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
 * Quick wins check - highest value/effort ratio across all categories
 * @param targetPath - Directory or file to analyze
 */
export function basic(targetPath: string): AnalysisResult;

/**
 * Material-only check (29 checks)
 * ONLY mat-* component accessibility checks
 * @param targetPath - Directory or file to analyze
 */
export function material(targetPath: string): AnalysisResult;

/**
 * Angular-only check (10 checks)
 * ONLY Angular template + CDK accessibility checks
 * @param targetPath - Directory or file to analyze
 */
export function angular(targetPath: string): AnalysisResult;

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

// ============================================
// SITEMAP-BASED ANALYSIS (SEO Focus)
// ============================================

export interface SitemapUrl {
  /** Full URL from sitemap */
  url: string;
  /** URL path (e.g., /guide/my-page) */
  path: string;
  /** Sitemap priority (0-1) */
  priority: number;
}

export interface UrlAudit {
  /** Check name */
  name: string;
  /** Lighthouse-style weight */
  weight: number;
  /** Whether audit passed (0 errors) */
  passed: boolean;
  /** Number of elements found */
  elementsFound: number;
  /** Number of errors (issues starting with [Error]) */
  errors: number;
  /** Number of warnings (issues starting with [Warning]) */
  warnings: number;
  /** Total number of issues (errors + warnings) */
  issues: number;
}

export interface UrlIssue {
  /** Error message */
  message: string;
  /** File path */
  file: string;
  /** Check name */
  check: string;
}

export interface UrlResult {
  /** Full URL */
  url: string;
  /** URL path */
  path: string;
  /** Sitemap priority */
  priority: number;
  /** Component name if resolved */
  component: string | null;
  /** Files analyzed */
  files: string[];
  /** Lighthouse-style score (0-100) */
  auditScore: number;
  /** Total audits run */
  auditsTotal: number;
  /** Passing audits */
  auditsPassed: number;
  /** Failing audits */
  auditsFailed: number;
  /** All issues found */
  issues: UrlIssue[];
  /** Detailed audit results */
  audits: UrlAudit[];
  /** Error if component couldn't be resolved */
  error?: string;
}

export interface WorstUrl {
  /** Full URL */
  url: string;
  /** URL path */
  path: string;
  /** Score (0-100) */
  score: number;
  /** Top issues by check */
  topIssues: Array<{ check: string; count: number }>;
}

export interface InternalPagesResult {
  /** Total internal routes found */
  count: number;
  /** Routes analyzed (may be limited) */
  analyzed: number;
  /** Score distribution */
  distribution: { passing: number; warning: number; failing: number };
  /** Route results sorted by score */
  routes: UrlResult[];
}

export interface SitemapAnalysisResult {
  /** Tier used */
  tier: Tier;
  /** Path to sitemap.xml */
  sitemapPath: string;
  /** Total URLs in sitemap */
  urlCount: number;
  /** URLs successfully resolved to components */
  resolved: number;
  /** URLs that couldn't be resolved */
  unresolved: number;
  /** Score distribution */
  distribution: { passing: number; warning: number; failing: number };
  /** All URL results sorted by score (worst first) */
  urls: UrlResult[];
  /** Top 5 worst URLs with issue details */
  worstUrls: WorstUrl[];
  /** Internal pages not in sitemap */
  internal: InternalPagesResult;
  /** Error message if analysis failed */
  error?: string;
}

export interface SitemapAnalyzeOptions {
  /** Tier level */
  tier?: Tier;
  /** Custom sitemap path */
  sitemap?: string;
}

/**
 * Analyze using sitemap.xml as source of truth
 * @param projectDir - Angular project directory
 * @param options - Analysis options
 * @returns Sitemap analysis results
 *
 * @example
 * const results = analyzeBySitemap('./my-app', { tier: 'material' });
 * console.log(`${results.urlCount} URLs analyzed`);
 * console.log(`Passing: ${results.distribution.passing}`);
 */
export function analyzeBySitemap(
  projectDir: string,
  options?: SitemapAnalyzeOptions
): SitemapAnalysisResult;

/**
 * Format sitemap results for console output
 * @param results - Sitemap analysis results
 * @returns Formatted string
 */
export function formatSitemapResults(results: SitemapAnalysisResult): string;

/**
 * Find sitemap.xml in a project
 * @param projectDir - Project directory
 * @returns Path to sitemap.xml or null
 *
 * Searches in order:
 * - dist/*\/browser/sitemap.xml
 * - public/sitemap.xml
 * - src/sitemap.xml
 * - sitemap.xml
 * - dist/sitemap.xml
 */
export function findSitemap(projectDir: string): string | null;

// ============================================
// ROUTE-BASED ANALYSIS
// ============================================

export interface RouteResult {
  /** Route path */
  path: string;
  /** Component name */
  component: string | null;
  /** Files analyzed */
  files: string[];
  /** Lighthouse-style score (0-100) */
  auditScore: number;
  /** Total audits run */
  auditsTotal: number;
  /** Passing audits */
  auditsPassed: number;
  /** Failing audits */
  auditsFailed: number;
  /** Elements checked */
  elementsChecked: number;
  /** Elements passed */
  elementsPassed: number;
  /** Elements failed */
  elementsFailed: number;
  /** All issues found */
  issues: UrlIssue[];
  /** Detailed audit results */
  audits: UrlAudit[];
}

export interface RouteAnalysisResult {
  /** Tier used */
  tier: Tier;
  /** Total routes found */
  routeCount: number;
  /** Routes successfully resolved */
  resolvedCount: number;
  /** Routes that couldn't be resolved */
  unresolvedCount: number;
  /** Score distribution */
  distribution: { passing: number; warning: number; failing: number };
  /** All route results sorted by score (worst first) */
  routes: RouteResult[];
}

export interface RouteAnalyzeOptions {
  /** Tier level */
  tier?: Tier;
}

/**
 * Analyze by Angular routes (per-route scores)
 * @param projectDir - Angular project directory
 * @param options - Analysis options
 * @returns Route analysis results
 *
 * @example
 * const results = analyzeByRoute('./my-app', { tier: 'full' });
 * for (const route of results.routes) {
 *   console.log(`${route.path}: ${route.auditScore}%`);
 * }
 */
export function analyzeByRoute(
  projectDir: string,
  options?: RouteAnalyzeOptions
): RouteAnalysisResult;

/**
 * Format route results for console output
 * @param results - Route analysis results
 * @returns Formatted string
 */
export function formatRouteResults(results: RouteAnalysisResult): string;

// ============================================
// OUTPUT FORMATTERS
// ============================================

export type FormatterCategory =
  | 'cicd'
  | 'code-quality'
  | 'docs'
  | 'monitoring'
  | 'notifications'
  | 'test-frameworks'
  | 'ide'
  | 'a11y-standards'
  | 'data';

export type FormatterOutput = 'json' | 'xml' | 'text' | 'html' | 'binary';

export interface Formatter {
  /** Unique formatter name */
  name: string;
  /** Human-readable description */
  description: string;
  /** Formatter category */
  category: FormatterCategory;
  /** Output type */
  output: FormatterOutput;
  /** Suggested file extension (e.g., '.json', '.xml') */
  fileExtension?: string;
  /** MIME type for the output */
  mimeType?: string;
  /**
   * Format results to output string
   * @param results - Analysis results (SitemapAnalysisResult, RouteAnalysisResult, or AnalysisResult)
   * @param options - Formatter-specific options
   */
  format(results: SitemapAnalysisResult | RouteAnalysisResult | AnalysisResult, options?: Record<string, unknown>): string;
}

export interface FormatterInfo {
  /** Formatter name */
  name: string;
  /** Description */
  description: string;
  /** Category */
  category: FormatterCategory;
  /** Output type */
  output: FormatterOutput;
  /** File extension */
  fileExtension?: string;
  /** MIME type */
  mimeType?: string;
}

export interface Formatters {
  /**
   * Load all available formatters
   * @param forceReload - Force reload from disk
   * @returns Map of formatter name to formatter module
   */
  loadAllFormatters(forceReload?: boolean): Map<string, Formatter>;

  /**
   * Get formatters by category
   * @param category - Formatter category
   * @returns Map of formatter name to formatter module
   */
  getFormattersByCategory(category: FormatterCategory): Map<string, Formatter>;

  /**
   * Get formatters by output type
   * @param outputType - Output type (json, xml, text, html, binary)
   * @returns Map of formatter name to formatter module
   */
  getFormattersByOutput(outputType: FormatterOutput): Map<string, Formatter>;

  /**
   * Get a specific formatter by name
   * @param name - Formatter name
   * @returns Formatter module or null
   */
  getFormatter(name: string): Formatter | null;

  /**
   * Format results using a named formatter
   * @param formatterName - Name of the formatter to use
   * @param results - Analysis results
   * @param options - Formatter-specific options
   * @returns Formatted output string
   *
   * @example
   * const sarif = formatters.format('sarif', sitemapResults);
   * const junit = formatters.format('junit', sitemapResults, { failThreshold: 80 });
   */
  format(
    formatterName: string,
    results: SitemapAnalysisResult | RouteAnalysisResult | AnalysisResult,
    options?: Record<string, unknown>
  ): string;

  /**
   * List all available formatter names
   * @returns Array of formatter names
   */
  listFormatters(): string[];

  /**
   * List all formatters with their info
   * @returns Array of formatter info objects
   */
  listFormattersWithInfo(): FormatterInfo[];

  /** Valid formatter categories */
  VALID_CATEGORIES: readonly FormatterCategory[];

  /** Valid output types */
  VALID_OUTPUTS: readonly FormatterOutput[];
}

/**
 * Output formatters for various CI/CD, monitoring, and documentation systems.
 *
 * Available formatters:
 * - sarif: SARIF 2.1.0 for GitHub Security tab
 * - junit: JUnit XML for CI/CD systems
 * - github-annotations: GitHub Actions annotations
 * - gitlab-codequality: GitLab Code Quality reports
 * - markdown: Markdown reports for PRs/docs
 * - csv: CSV for spreadsheets
 * - prometheus: Prometheus metrics
 * - grafana-json: Grafana JSON datasource
 * - slack: Slack webhook messages
 * - discord: Discord webhook messages
 * - teams: Microsoft Teams Adaptive Cards
 * - datadog: DataDog metrics
 * - sonarqube: SonarQube generic issue format
 * - checkstyle: Checkstyle XML format
 *
 * @example
 * import { formatters, analyzeBySitemap } from 'mat-a11y';
 *
 * const results = analyzeBySitemap('./my-app');
 *
 * // Generate SARIF for GitHub Security tab
 * const sarif = formatters.format('sarif', results);
 *
 * // Generate JUnit for CI/CD
 * const junit = formatters.format('junit', results, { failThreshold: 80 });
 *
 * // Generate Slack message
 * const slack = formatters.format('slack', results);
 */
export const formatters: Formatters;
