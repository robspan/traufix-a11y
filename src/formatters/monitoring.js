'use strict';

/**
 * Dashboard & Monitoring Formatters
 *
 * Formats for: Prometheus, Grafana, DataDog, New Relic, Splunk, etc.
 */

/**
 * Prometheus Metrics
 * @see https://prometheus.io/docs/instrumenting/exposition_formats/
 */
function prometheus(results, options = {}) {
  const prefix = options.prefix || 'mat_a11y';
  const labels = options.labels || {};
  const labelStr = Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(',');
  const labelSuffix = labelStr ? `,${labelStr}` : '';

  const lines = [];

  // Help and type declarations
  lines.push(`# HELP ${prefix}_urls_total Total number of URLs analyzed`);
  lines.push(`# TYPE ${prefix}_urls_total gauge`);
  lines.push(`${prefix}_urls_total{tier="${results.tier}"${labelSuffix}} ${results.urlCount}`);

  lines.push(`# HELP ${prefix}_urls_passing Number of passing URLs (score >= 90)`);
  lines.push(`# TYPE ${prefix}_urls_passing gauge`);
  lines.push(`${prefix}_urls_passing{tier="${results.tier}"${labelSuffix}} ${results.distribution.passing}`);

  lines.push(`# HELP ${prefix}_urls_warning Number of warning URLs (score 50-89)`);
  lines.push(`# TYPE ${prefix}_urls_warning gauge`);
  lines.push(`${prefix}_urls_warning{tier="${results.tier}"${labelSuffix}} ${results.distribution.warning}`);

  lines.push(`# HELP ${prefix}_urls_failing Number of failing URLs (score < 50)`);
  lines.push(`# TYPE ${prefix}_urls_failing gauge`);
  lines.push(`${prefix}_urls_failing{tier="${results.tier}"${labelSuffix}} ${results.distribution.failing}`);

  lines.push(`# HELP ${prefix}_pass_rate Percentage of passing URLs`);
  lines.push(`# TYPE ${prefix}_pass_rate gauge`);
  const passRate = results.urlCount > 0 ? (results.distribution.passing / results.urlCount) : 0;
  lines.push(`${prefix}_pass_rate{tier="${results.tier}"${labelSuffix}} ${passRate.toFixed(4)}`);

  // Per-URL scores
  lines.push(`# HELP ${prefix}_url_score Score per URL (0-100)`);
  lines.push(`# TYPE ${prefix}_url_score gauge`);
  for (const url of (results.urls || [])) {
    const urlLabel = url.path.replace(/"/g, '\\"');
    lines.push(`${prefix}_url_score{url="${urlLabel}",tier="${results.tier}"${labelSuffix}} ${url.auditScore}`);
  }

  // Issue counts per check
  const checkCounts = {};
  for (const url of (results.urls || [])) {
    for (const issue of (url.issues || [])) {
      checkCounts[issue.check] = (checkCounts[issue.check] || 0) + 1;
    }
  }

  lines.push(`# HELP ${prefix}_issues_by_check Number of issues per check`);
  lines.push(`# TYPE ${prefix}_issues_by_check gauge`);
  for (const [check, count] of Object.entries(checkCounts)) {
    lines.push(`${prefix}_issues_by_check{check="${check}",tier="${results.tier}"${labelSuffix}} ${count}`);
  }

  return lines.join('\n');
}

/**
 * Grafana JSON Datasource
 * @see https://grafana.com/grafana/plugins/simpod-json-datasource/
 */
function grafanaJson(results, options = {}) {
  const timestamp = Date.now();

  return JSON.stringify({
    annotations: [],
    timeseries: [
      {
        target: 'urls_total',
        datapoints: [[results.urlCount, timestamp]]
      },
      {
        target: 'urls_passing',
        datapoints: [[results.distribution.passing, timestamp]]
      },
      {
        target: 'urls_warning',
        datapoints: [[results.distribution.warning, timestamp]]
      },
      {
        target: 'urls_failing',
        datapoints: [[results.distribution.failing, timestamp]]
      }
    ],
    table: {
      columns: [
        { text: 'URL', type: 'string' },
        { text: 'Score', type: 'number' },
        { text: 'Issues', type: 'number' }
      ],
      rows: (results.urls || []).map(url => [
        url.path,
        url.auditScore,
        url.issues ? url.issues.length : 0
      ])
    }
  }, null, 2);
}

/**
 * DataDog Metrics
 * @see https://docs.datadoghq.com/api/latest/metrics/
 */
function datadog(results, options = {}) {
  const timestamp = Math.floor(Date.now() / 1000);
  const tags = options.tags || [];
  tags.push(`tier:${results.tier}`);

  const series = [];

  series.push({
    metric: 'mat_a11y.urls.total',
    points: [[timestamp, results.urlCount]],
    type: 'gauge',
    tags
  });

  series.push({
    metric: 'mat_a11y.urls.passing',
    points: [[timestamp, results.distribution.passing]],
    type: 'gauge',
    tags
  });

  series.push({
    metric: 'mat_a11y.urls.warning',
    points: [[timestamp, results.distribution.warning]],
    type: 'gauge',
    tags
  });

  series.push({
    metric: 'mat_a11y.urls.failing',
    points: [[timestamp, results.distribution.failing]],
    type: 'gauge',
    tags
  });

  // Per-URL metrics
  for (const url of (results.urls || [])) {
    series.push({
      metric: 'mat_a11y.url.score',
      points: [[timestamp, url.auditScore]],
      type: 'gauge',
      tags: [...tags, `url:${url.path}`]
    });
  }

  return JSON.stringify({ series }, null, 2);
}

/**
 * New Relic Insights Events
 * @see https://docs.newrelic.com/docs/data-apis/ingest-apis/event-api/
 */
function newrelic(results, options = {}) {
  const events = [];
  const timestamp = Date.now();

  // Summary event
  events.push({
    eventType: 'MatA11yReport',
    timestamp,
    tier: results.tier,
    urlCount: results.urlCount,
    passing: results.distribution.passing,
    warning: results.distribution.warning,
    failing: results.distribution.failing,
    passRate: results.urlCount > 0 ? (results.distribution.passing / results.urlCount * 100) : 0
  });

  // Per-URL events
  for (const url of (results.urls || [])) {
    events.push({
      eventType: 'MatA11yUrl',
      timestamp,
      url: url.path,
      score: url.auditScore,
      status: url.auditScore >= 90 ? 'passing' : url.auditScore >= 50 ? 'warning' : 'failing',
      issueCount: url.issues ? url.issues.length : 0,
      tier: results.tier
    });
  }

  return JSON.stringify(events, null, 2);
}

/**
 * Splunk HTTP Event Collector (HEC)
 * @see https://docs.splunk.com/Documentation/Splunk/latest/Data/UsetheHTTPEventCollector
 */
function splunk(results, options = {}) {
  const events = [];
  const time = Math.floor(Date.now() / 1000);
  const source = options.source || 'mat-a11y';
  const sourcetype = options.sourcetype || '_json';

  // Summary event
  events.push({
    time,
    source,
    sourcetype,
    event: {
      type: 'report',
      tier: results.tier,
      urlCount: results.urlCount,
      distribution: results.distribution
    }
  });

  // Per-URL events
  for (const url of (results.urls || [])) {
    events.push({
      time,
      source,
      sourcetype,
      event: {
        type: 'url',
        url: url.path,
        score: url.auditScore,
        issues: url.issues ? url.issues.length : 0
      }
    });
  }

  // Splunk HEC expects newline-delimited JSON
  return events.map(e => JSON.stringify(e)).join('\n');
}

/**
 * InfluxDB Line Protocol
 * @see https://docs.influxdata.com/influxdb/latest/reference/syntax/line-protocol/
 */
function influxdb(results, options = {}) {
  const timestamp = Date.now() * 1000000; // nanoseconds
  const measurement = options.measurement || 'mat_a11y';
  const lines = [];

  // Summary
  lines.push(`${measurement},tier=${results.tier} urls=${results.urlCount}i,passing=${results.distribution.passing}i,warning=${results.distribution.warning}i,failing=${results.distribution.failing}i ${timestamp}`);

  // Per-URL
  for (const url of (results.urls || [])) {
    const urlTag = url.path.replace(/ /g, '\\ ').replace(/,/g, '\\,').replace(/=/g, '\\=');
    const issues = url.issues ? url.issues.length : 0;
    lines.push(`${measurement}_url,url=${urlTag},tier=${results.tier} score=${url.auditScore}i,issues=${issues}i ${timestamp}`);
  }

  return lines.join('\n');
}

/**
 * StatsD Metrics
 * @see https://github.com/statsd/statsd/blob/master/docs/metric_types.md
 */
function statsd(results, options = {}) {
  const prefix = options.prefix || 'mat_a11y';
  const lines = [];

  lines.push(`${prefix}.urls.total:${results.urlCount}|g`);
  lines.push(`${prefix}.urls.passing:${results.distribution.passing}|g`);
  lines.push(`${prefix}.urls.warning:${results.distribution.warning}|g`);
  lines.push(`${prefix}.urls.failing:${results.distribution.failing}|g`);

  const passRate = results.urlCount > 0 ? Math.round(results.distribution.passing / results.urlCount * 100) : 0;
  lines.push(`${prefix}.pass_rate:${passRate}|g`);

  return lines.join('\n');
}

/**
 * AWS CloudWatch Metrics
 * @see https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_PutMetricData.html
 */
function cloudwatch(results, options = {}) {
  const namespace = options.namespace || 'MatA11y';
  const dimensions = options.dimensions || [{ Name: 'Tier', Value: results.tier }];

  const metricData = [
    {
      MetricName: 'UrlsTotal',
      Value: results.urlCount,
      Unit: 'Count',
      Dimensions: dimensions
    },
    {
      MetricName: 'UrlsPassing',
      Value: results.distribution.passing,
      Unit: 'Count',
      Dimensions: dimensions
    },
    {
      MetricName: 'UrlsWarning',
      Value: results.distribution.warning,
      Unit: 'Count',
      Dimensions: dimensions
    },
    {
      MetricName: 'UrlsFailing',
      Value: results.distribution.failing,
      Unit: 'Count',
      Dimensions: dimensions
    },
    {
      MetricName: 'PassRate',
      Value: results.urlCount > 0 ? (results.distribution.passing / results.urlCount * 100) : 0,
      Unit: 'Percent',
      Dimensions: dimensions
    }
  ];

  return JSON.stringify({ Namespace: namespace, MetricData: metricData }, null, 2);
}

/**
 * Google Cloud Monitoring (Stackdriver)
 * @see https://cloud.google.com/monitoring/api/ref_v3/rest/v3/TimeSeries
 */
function stackdriver(results, options = {}) {
  const projectId = options.projectId || 'YOUR_PROJECT_ID';
  const timestamp = new Date().toISOString();

  const timeSeries = [
    {
      metric: { type: 'custom.googleapis.com/mat_a11y/urls_total' },
      resource: { type: 'global', labels: { project_id: projectId } },
      points: [{ interval: { endTime: timestamp }, value: { int64Value: results.urlCount } }]
    },
    {
      metric: { type: 'custom.googleapis.com/mat_a11y/urls_passing' },
      resource: { type: 'global', labels: { project_id: projectId } },
      points: [{ interval: { endTime: timestamp }, value: { int64Value: results.distribution.passing } }]
    },
    {
      metric: { type: 'custom.googleapis.com/mat_a11y/urls_failing' },
      resource: { type: 'global', labels: { project_id: projectId } },
      points: [{ interval: { endTime: timestamp }, value: { int64Value: results.distribution.failing } }]
    }
  ];

  return JSON.stringify({ timeSeries }, null, 2);
}

/**
 * Dynatrace Metrics
 * @see https://www.dynatrace.com/support/help/dynatrace-api/environment-api/metric-v2/
 */
function dynatrace(results, options = {}) {
  const lines = [];
  const timestamp = Date.now();

  lines.push(`mat_a11y.urls.total,tier=${results.tier} ${results.urlCount} ${timestamp}`);
  lines.push(`mat_a11y.urls.passing,tier=${results.tier} ${results.distribution.passing} ${timestamp}`);
  lines.push(`mat_a11y.urls.warning,tier=${results.tier} ${results.distribution.warning} ${timestamp}`);
  lines.push(`mat_a11y.urls.failing,tier=${results.tier} ${results.distribution.failing} ${timestamp}`);

  return lines.join('\n');
}

module.exports = {
  prometheus,
  'grafana-json': grafanaJson,
  datadog,
  newrelic,
  splunk,
  influxdb,
  statsd,
  cloudwatch,
  stackdriver,
  dynatrace
};
