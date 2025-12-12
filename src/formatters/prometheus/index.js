'use strict';

/**
 * Prometheus Formatter
 *
 * Exports accessibility metrics in Prometheus exposition format for monitoring
 * and visualization in Grafana or other Prometheus-compatible dashboards.
 *
 * @see https://prometheus.io/docs/instrumenting/exposition_formats/
 * @module formatters/prometheus
 */

/**
 * Escape label values for Prometheus format
 * @param {string} value - Label value to escape
 * @returns {string} Escaped value
 */
function escapeLabel(value) {
  if (typeof value !== 'string') {
    return String(value);
  }
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');
}

/**
 * Build label string from labels object
 * @param {object} labels - Key-value pairs of labels
 * @returns {string} Prometheus label string (e.g., {key1="val1",key2="val2"})
 */
function buildLabels(labels) {
  const pairs = Object.entries(labels)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}="${escapeLabel(v)}"`);
  return pairs.length > 0 ? `{${pairs.join(',')}}` : '';
}

/**
 * Format results as Prometheus metrics exposition format
 *
 * @param {object} results - Analysis results
 * @param {string[]} results.urls - Array of URL result objects
 * @param {object} results.distribution - Distribution of passing/warning/failing URLs
 * @param {number} results.distribution.passing - Number of passing URLs (score >= 90)
 * @param {number} results.distribution.warning - Number of warning URLs (score 50-89)
 * @param {number} results.distribution.failing - Number of failing URLs (score < 50)
 * @param {string} results.tier - Analysis tier (basic, material, full)
 * @param {number} results.urlCount - Total number of URLs analyzed
 * @param {object} [options={}] - Formatter options
 * @param {string} [options.prefix='mat_a11y'] - Metric name prefix
 * @param {object} [options.labels={}] - Additional labels to add to all metrics
 * @param {boolean} [options.includeHelp=true] - Include HELP comments
 * @param {boolean} [options.includeType=true] - Include TYPE comments
 * @param {number} [options.timestamp] - Unix timestamp in milliseconds (optional)
 * @returns {string} Prometheus exposition format text
 */
function format(results, options = {}) {
  const prefix = options.prefix || 'mat_a11y';
  const customLabels = options.labels || {};
  const includeHelp = options.includeHelp !== false;
  const includeType = options.includeType !== false;
  const timestamp = options.timestamp ? ` ${options.timestamp}` : '';

  const tier = results.tier || 'material';
  const urlCount = results.urlCount || 0;
  const distribution = results.distribution || { passing: 0, warning: 0, failing: 0 };

  const lines = [];

  // Base labels for all metrics
  const baseLabels = { tier, ...customLabels };

  // --- mat_a11y_urls_total ---
  if (includeHelp) {
    lines.push(`# HELP ${prefix}_urls_total Total number of URLs analyzed`);
  }
  if (includeType) {
    lines.push(`# TYPE ${prefix}_urls_total gauge`);
  }
  lines.push(`${prefix}_urls_total${buildLabels(baseLabels)} ${urlCount}${timestamp}`);

  // --- mat_a11y_urls_passing ---
  if (includeHelp) {
    lines.push(`# HELP ${prefix}_urls_passing Number of passing URLs (score >= 90)`);
  }
  if (includeType) {
    lines.push(`# TYPE ${prefix}_urls_passing gauge`);
  }
  lines.push(`${prefix}_urls_passing${buildLabels(baseLabels)} ${distribution.passing}${timestamp}`);

  // --- mat_a11y_urls_failing ---
  if (includeHelp) {
    lines.push(`# HELP ${prefix}_urls_failing Number of failing URLs (score < 50)`);
  }
  if (includeType) {
    lines.push(`# TYPE ${prefix}_urls_failing gauge`);
  }
  lines.push(`${prefix}_urls_failing${buildLabels(baseLabels)} ${distribution.failing}${timestamp}`);

  // --- mat_a11y_url_score (per-URL) ---
  const urls = results.urls || [];
  if (urls.length > 0) {
    if (includeHelp) {
      lines.push(`# HELP ${prefix}_url_score Accessibility score per URL (0-100)`);
    }
    if (includeType) {
      lines.push(`# TYPE ${prefix}_url_score gauge`);
    }

    for (const url of urls) {
      const urlPath = url.path || url.url || 'unknown';
      const score = typeof url.auditScore === 'number' ? url.auditScore : 0;
      const urlLabels = { url: urlPath, tier, ...customLabels };
      lines.push(`${prefix}_url_score${buildLabels(urlLabels)} ${score}${timestamp}`);
    }
  }

  // --- Additional metrics: issues by check ---
  const checkCounts = {};
  for (const url of urls) {
    for (const issue of (url.issues || [])) {
      const check = issue.check || 'unknown';
      checkCounts[check] = (checkCounts[check] || 0) + 1;
    }
  }

  if (Object.keys(checkCounts).length > 0) {
    if (includeHelp) {
      lines.push(`# HELP ${prefix}_issues_by_check Number of issues per accessibility check`);
    }
    if (includeType) {
      lines.push(`# TYPE ${prefix}_issues_by_check gauge`);
    }

    for (const [check, count] of Object.entries(checkCounts)) {
      const checkLabels = { check, tier, ...customLabels };
      lines.push(`${prefix}_issues_by_check${buildLabels(checkLabels)} ${count}${timestamp}`);
    }
  }

  // --- Pass rate ---
  if (includeHelp) {
    lines.push(`# HELP ${prefix}_pass_rate Percentage of passing URLs (0.0-1.0)`);
  }
  if (includeType) {
    lines.push(`# TYPE ${prefix}_pass_rate gauge`);
  }
  const passRate = urlCount > 0 ? (distribution.passing / urlCount) : 0;
  lines.push(`${prefix}_pass_rate${buildLabels(baseLabels)} ${passRate.toFixed(4)}${timestamp}`);

  return lines.join('\n');
}

module.exports = {
  name: 'prometheus',
  description: 'Prometheus metrics exposition format for Grafana and monitoring',
  category: 'monitoring',
  output: 'text',
  fileExtension: '.prom',
  mimeType: 'text/plain',
  format
};
