'use strict';

/**
 * DataDog Metrics API Formatter
 *
 * Formats mat-a11y results as DataDog Metrics API JSON
 * for submitting custom metrics.
 *
 * @see https://docs.datadoghq.com/api/latest/metrics/
 * @see https://docs.datadoghq.com/api/latest/metrics/#submit-metrics
 * @module formatters/datadog
 */

const { normalizeResults } = require('./result-utils');

/**
 * Get the current Unix timestamp in seconds
 * @returns {number} Unix timestamp
 */
function getTimestamp() {
  return Math.floor(Date.now() / 1000);
}

/**
 * Calculate pass rate as a percentage
 * @param {object} results - Analysis results
 * @returns {number} Pass rate (0-100)
 */
function calculatePassRate(results) {
  if (!results.total) return 0;
  const passing = results.distribution?.passing ?? 0;
  return (passing / results.total) * 100;
}

/**
 * Calculate average score across all URLs
 * @param {Array} urls - Array of URL results
 * @returns {number} Average score
 */
function calculateAverageScore(urls) {
  if (!urls || urls.length === 0) return 0;
  const total = urls.reduce((sum, url) => sum + url.auditScore, 0);
  return total / urls.length;
}

/**
 * Count total issues across all URLs
 * @param {Array} urls - Array of URL results
 * @returns {number} Total issue count
 */
function countTotalIssues(urls) {
  if (!urls || urls.length === 0) return 0;
  return urls.reduce((sum, url) => sum + (url.issues ? url.issues.length : 0), 0);
}

/**
 * Group issues by check type (sorted by total weight descending)
 * @param {Array} urls - Array of URL results
 * @returns {Array} Array of [check, count] sorted by total weight
 */
function groupIssuesByCheck(urls) {
  const checkCounts = {};
  const checkWeights = {};

  for (const url of (urls || [])) {
    for (const issue of (url.issues || [])) {
      const check = issue.check || 'unknown';
      checkCounts[check] = (checkCounts[check] || 0) + 1;
      // Store weight from issue (pre-computed by normalizeResults)
      if (issue.weight !== undefined && checkWeights[check] === undefined) {
        checkWeights[check] = issue.weight;
      }
    }
  }

  // Sort by total weight (count × weight) descending for priority ordering
  return Object.entries(checkCounts)
    .map(([check, count]) => ({ check, count, weight: checkWeights[check] || 0 }))
    .sort((a, b) => (b.count * b.weight) - (a.count * a.weight));
}

/**
 * Sanitize a tag value for DataDog
 * @param {string} value - Raw tag value
 * @returns {string} Sanitized tag value
 */
function sanitizeTagValue(value) {
  // DataDog tags: lowercase alphanumeric, underscores, minuses, colons, periods, slashes
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9_\-:.\/]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Build base tags array
 * @param {object} results - Analysis results
 * @param {object} options - Formatting options
 * @returns {Array} Array of tag strings
 */
function buildBaseTags(results, options) {
  const tags = [];

  // Add tier tag
  tags.push(`tier:${results.tier || 'default'}`);

  // Add custom tags from options
  if (options.tags && Array.isArray(options.tags)) {
    tags.push(...options.tags);
  }

  // Add environment tag if provided
  if (options.env) {
    tags.push(`env:${sanitizeTagValue(options.env)}`);
  }

  // Add service tag if provided
  if (options.service) {
    tags.push(`service:${sanitizeTagValue(options.service)}`);
  }

  // Add version tag if provided
  if (options.version) {
    tags.push(`version:${sanitizeTagValue(options.version)}`);
  }

  return tags;
}

/**
 * Create a metric point
 * @param {number} timestamp - Unix timestamp
 * @param {number} value - Metric value
 * @returns {Array} Point array [timestamp, value]
 */
function createPoint(timestamp, value) {
  return [timestamp, value];
}

/**
 * Create a metric series entry
 * @param {string} metric - Metric name
 * @param {number} value - Metric value
 * @param {number} timestamp - Unix timestamp
 * @param {string} type - Metric type (gauge, count, rate)
 * @param {Array} tags - Tags array
 * @param {string} [unit] - Optional unit
 * @returns {object} Series entry
 */
function createSeries(metric, value, timestamp, type, tags, unit) {
  const series = {
    metric,
    points: [createPoint(timestamp, value)],
    type,
    tags
  };

  if (unit) {
    series.unit = unit;
  }

  return series;
}

/**
 * Format mat-a11y results as DataDog Metrics API payload
 *
 * @param {object} results - Analysis results from mat-a11y
 * @param {Array} results.urls - Array of URL analysis results
 * @param {object} results.distribution - Distribution of passing/warning/failing
 * @param {string} results.tier - Tier level
 * @param {number} results.urlCount - Total URL count
 * @param {object} [options={}] - Formatting options
 * @param {Array} [options.tags=[]] - Additional tags to include
 * @param {string} [options.env] - Environment name
 * @param {string} [options.service] - Service name
 * @param {string} [options.version] - Version string
 * @param {string} [options.prefix='mat_a11y'] - Metric name prefix
 * @param {boolean} [options.includePerUrl=true] - Include per-URL metrics
 * @param {boolean} [options.includePerCheck=true] - Include per-check issue counts
 * @param {string} [options.host] - Host name for metrics
 * @returns {string} JSON string of DataDog metrics payload
 */
function format(results, options = {}) {
  const {
    prefix = 'mat_a11y',
    includePerUrl = true,
    includePerCheck = true,
    host
  } = options;

  const normalized = normalizeResults(results);

  const timestamp = getTimestamp();
  const baseTags = buildBaseTags({ tier: normalized.tier }, options);
  const series = [];

  // Summary metrics
  series.push(createSeries(
    `${prefix}.urls.total`,
    normalized.total,
    timestamp,
    'gauge',
    baseTags
  ));

  const distribution = normalized.distribution || { passing: 0, warning: 0, failing: 0 };

  series.push(createSeries(
    `${prefix}.urls.passing`,
    distribution.passing,
    timestamp,
    'gauge',
    baseTags
  ));

  series.push(createSeries(
    `${prefix}.urls.warning`,
    distribution.warning,
    timestamp,
    'gauge',
    baseTags
  ));

  series.push(createSeries(
    `${prefix}.urls.failing`,
    distribution.failing,
    timestamp,
    'gauge',
    baseTags
  ));

  // Calculated metrics
  const passRate = calculatePassRate({ total: normalized.total, distribution: normalized.distribution });
  series.push(createSeries(
    `${prefix}.pass_rate`,
    passRate,
    timestamp,
    'gauge',
    baseTags,
    'percent'
  ));

  const avgScore = calculateAverageScore(normalized.entities);
  series.push(createSeries(
    `${prefix}.score.average`,
    avgScore,
    timestamp,
    'gauge',
    baseTags
  ));

  const totalIssues = countTotalIssues(normalized.entities);
  series.push(createSeries(
    `${prefix}.issues.total`,
    totalIssues,
    timestamp,
    'gauge',
    baseTags
  ));

  // Per-URL metrics (entities are pre-sorted by priority - highest totalPoints first)
  if (includePerUrl && normalized.entities && normalized.entities.length > 0) {
    for (const url of normalized.entities) {
      const urlTag = `url:${sanitizeTagValue(url.label)}`;
      const urlTags = [...baseTags, urlTag];

      series.push(createSeries(
        `${prefix}.url.score`,
        url.auditScore,
        timestamp,
        'gauge',
        urlTags
      ));

      series.push(createSeries(
        `${prefix}.url.issues`,
        url.issues ? url.issues.length : 0,
        timestamp,
        'gauge',
        urlTags
      ));

      // Priority points metric (pre-computed by normalizeResults)
      if (url.issuePoints) {
        series.push(createSeries(
          `${prefix}.url.priority_points`,
          url.issuePoints.totalPoints,
          timestamp,
          'gauge',
          urlTags
        ));
      }
    }
  }

  // Per-check issue counts (sorted by priority - highest total weight first)
  if (includePerCheck) {
    const checkData = groupIssuesByCheck(normalized.entities);

    for (const { check, count, weight } of checkData) {
      const checkTag = `check:${sanitizeTagValue(check)}`;
      const weightTag = `weight:${weight}`;
      const checkTags = [...baseTags, checkTag, weightTag];

      series.push(createSeries(
        `${prefix}.issues.by_check`,
        count,
        timestamp,
        'gauge',
        checkTags
      ));

      // Priority points for this check type (count × weight)
      series.push(createSeries(
        `${prefix}.issues.priority_points_by_check`,
        count * weight,
        timestamp,
        'gauge',
        checkTags
      ));
    }
  }

  // Build the final payload
  const payload = {
    _generated: {
      tool: 'mat-a11y',
      notice: 'Generated file - do not edit',
      promo: 'traufix.de | freelancermap.de/profil/robin-spanier'
    },
    series
  };

  // Add host if provided (applied to all metrics when submitting)
  if (host) {
    // For API submission, host is typically set per-series or at submission time
    // Include it in metadata for documentation
    payload._metadata = {
      host,
      timestamp: new Date(timestamp * 1000).toISOString(),
      generatedBy: 'mat-a11y'
    };
  }

  return JSON.stringify(payload, null, 2);
}

module.exports = {
  name: 'datadog',
  description: 'DataDog Metrics API format for monitoring dashboards',
  category: 'monitoring',
  output: 'json',
  fileExtension: '.json',
  mimeType: 'application/json',
  format
};
