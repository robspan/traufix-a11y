'use strict';

/**
 * Slack Block Kit Formatter
 *
 * Formats mat-a11y results as Slack Block Kit messages for webhook integration.
 * Produces rich, interactive messages with headers, stats, and worst URLs.
 *
 * @see https://api.slack.com/block-kit
 * @module formatters/slack
 */

const { normalizeResults, getCheckWeight } = require('./result-utils');

function getEntityNouns(results, normalized) {
  const kind = (() => {
    if (results && typeof results === 'object' && typeof results.totalComponentsScanned === 'number') return 'component';
    if (results && typeof results === 'object' && results.summary && Array.isArray(results.summary.issues)) return 'file';
    return normalized?.entities?.[0]?.kind || 'page';
  })();

  if (kind === 'component') return { singular: 'Component', plural: 'Components' };
  if (kind === 'file') return { singular: 'File', plural: 'Files' };
  return { singular: 'URL', plural: 'URLs' };
}

/**
 * Get status emoji based on score thresholds
 * @param {object} distribution - Results distribution
 * @returns {string} Status emoji
 */
function getStatusEmoji(distribution) {
  if (distribution.failing > 0) return ':red_circle:';
  if (distribution.warning > 0) return ':large_yellow_circle:';
  return ':large_green_circle:';
}

/**
 * Get status text based on score thresholds
 * @param {object} distribution - Results distribution
 * @returns {string} Status text
 */
function getStatusText(distribution) {
  if (distribution.failing > 0) return 'Failing';
  if (distribution.warning > 0) return 'Warning';
  return 'Passing';
}

/**
 * Calculate pass rate percentage
 * @param {object} results - Analysis results
 * @returns {number} Pass rate as percentage
 */
function calculatePassRate(results) {
  if (!results.total) return 0;
  const passing = results.distribution?.passing ?? 0;
  return Math.round((passing / results.total) * 100);
}

/**
 * Get the highest-priority entities from pre-sorted results
 * Entities are already sorted by totalPoints descending from normalizeResults
 *
 * @param {object} normalized - Normalized results from normalizeResults()
 * @param {number} limit - Maximum number of entities to return
 * @returns {Array} Array of worst entity objects (highest priority first)
 */
function getHighPriorityEntities(normalized, limit = 5) {
  // Entities are pre-sorted by issuePoints.totalPoints descending
  // Just filter to those with issues and take the top N
  return (normalized.entities || [])
    .filter(e => (e.auditScore ?? 0) < 90 && e.issues?.length > 0)
    .slice(0, limit)
    .map(e => ({
      path: e.label,
      auditScore: e.auditScore,
      issues: e.issues,
      issuePoints: e.issuePoints
    }));
}

/**
 * Format a single entity as a Slack section block
 * Shows highest-weight issues first
 *
 * @param {object} entity - Entity result object
 * @param {object} [options={}] - Formatting options
 * @param {boolean} [options.showPriorityPoints] - Show priority points in output
 * @returns {object} Slack section block
 */
function formatEntityBlock(entity, options = {}) {
  const { showPriorityPoints = false } = options;

  const scoreEmoji = entity.auditScore >= 90 ? ':white_check_mark:' :
                     entity.auditScore >= 50 ? ':warning:' : ':x:';

  const issueCount = entity.issues ? entity.issues.length : 0;

  // Sort issues by weight descending (highest priority first)
  const sortedIssues = entity.issues
    ? [...entity.issues].sort((a, b) => {
        const weightA = a.weight ?? getCheckWeight(a.check);
        const weightB = b.weight ?? getCheckWeight(b.check);
        return weightB - weightA;
      })
    : [];
  const topIssues = sortedIssues.slice(0, 3);

  let issueText = '';
  if (topIssues.length > 0) {
    issueText = '\n' + topIssues
      .map(issue => {
        const weight = issue.weight ?? getCheckWeight(issue.check);
        const weightTag = showPriorityPoints ? ` [w:${weight}]` : '';
        return `  - \`${issue.check}\`${weightTag}: ${issue.message.replace(/^\[(Error|Warning|Info)\]\s*/, '').substring(0, 80)}`;
      })
      .join('\n');
  }

  // Build status line with optional priority points
  let statusLine = `Score: ${entity.auditScore}% | Issues: ${issueCount}`;
  if (showPriorityPoints && entity.issuePoints) {
    const { totalPoints, usageCount } = entity.issuePoints;
    statusLine += ` | Priority: ${totalPoints} pts`;
    if (usageCount > 1) {
      statusLine += ` (${usageCount}x usage)`;
    }
  }

  return {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `${scoreEmoji} *${entity.path}*\n${statusLine}${issueText}`
    }
  };
}

/**
 * Format mat-a11y results as Slack Block Kit message
 *
 * @param {object} results - Analysis results
 * @param {string[]} results.urls - Array of URL results
 * @param {object} results.distribution - Distribution of passing/warning/failing
 * @param {string} results.tier - Analysis tier
 * @param {number} results.urlCount - Total URL count
 * @param {object} [options={}] - Formatter options
 * @param {string} [options.title] - Custom message title
 * @param {number} [options.maxWorstUrls] - Max worst URLs to show (default: 5)
 * @param {boolean} [options.includeTimestamp] - Include timestamp (default: true)
 * @param {boolean} [options.showPriorityPoints] - Show priority points for entities/issues (default: false)
 * @returns {string} JSON string of Slack Block Kit message
 */
function format(results, options = {}) {
  const {
    title = 'Accessibility Report',
    maxWorstUrls = 5,
    includeTimestamp = true,
    showPriorityPoints = false
  } = options;

  const normalized = normalizeResults(results);
  const nouns = getEntityNouns(results, normalized);
  const distribution = normalized.distribution || { passing: 0, warning: 0, failing: 0 };
  const statusEmoji = getStatusEmoji(distribution);
  const statusText = getStatusText(distribution);
  const passRate = calculatePassRate(normalized);
  // Use pre-sorted entities from normalizeResults (sorted by totalPoints descending)
  const highPriorityEntities = getHighPriorityEntities(normalized, maxWorstUrls);

  const blocks = [];

  // Header block
  blocks.push({
    type: 'header',
    text: {
      type: 'plain_text',
      text: `${title}`,
      emoji: true
    }
  });

  // Status summary section
  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
        text: `${statusEmoji} *Status: ${statusText}*\nTier: \`${normalized.tier || 'unknown'}\` | Pass Rate: *${passRate}%*`
    }
  });

  // Divider
  blocks.push({ type: 'divider' });

  // Statistics section with fields
  blocks.push({
    type: 'section',
    fields: [
      {
        type: 'mrkdwn',
        text: `*${nouns.plural} Analyzed*\n${normalized.total || 0}`
      },
      {
        type: 'mrkdwn',
        text: `*Passing*\n:large_green_circle: ${distribution.passing}`
      },
      {
        type: 'mrkdwn',
        text: `*Warning*\n:large_yellow_circle: ${distribution.warning}`
      },
      {
        type: 'mrkdwn',
        text: `*Failing*\n:red_circle: ${distribution.failing}`
      }
    ]
  });

  // High-priority entities section (sorted by issue points, highest first)
  if (highPriorityEntities.length > 0) {
    blocks.push({ type: 'divider' });

    const sectionTitle = showPriorityPoints
      ? `*Highest Priority ${nouns.plural}${results.sitemapPath ? ' (Sitemap)' : ''}*`
      : `*Worst Performing ${nouns.plural}${results.sitemapPath ? ' (Sitemap)' : ''}*`;

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: sectionTitle
      }
    });

    for (const entity of highPriorityEntities) {
      blocks.push(formatEntityBlock(entity, { showPriorityPoints }));
    }
  }

  // Internal routes section (if any)
  if (results.internal && results.internal.count > 0) {
    const id = results.internal.distribution || { passing: 0, warning: 0, failing: 0 };
    blocks.push({ type: 'divider' });

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Internal Routes* (not in sitemap)\n${results.internal.count} routes | :large_green_circle: ${id.passing} | :large_yellow_circle: ${id.warning} | :red_circle: ${id.failing}`
      }
    });

    // Show highest-priority internal routes (sorted by issue weight sum)
    const internalRoutes = (results.internal.routes || [])
      .filter(r => r.auditScore < 90 && r.issues?.length > 0)
      .map(r => {
        // Calculate issue points for sorting
        let totalWeight = 0;
        for (const issue of r.issues || []) {
          totalWeight += issue.weight ?? getCheckWeight(issue.check);
        }
        return { ...r, path: r.path || r.url, issuePoints: { totalPoints: totalWeight, usageCount: 1 } };
      })
      .sort((a, b) => b.issuePoints.totalPoints - a.issuePoints.totalPoints)
      .slice(0, 3);

    for (const route of internalRoutes) {
      blocks.push(formatEntityBlock(route, { showPriorityPoints }));
    }
  }

  // Context block with timestamp and metadata
  if (includeTimestamp) {
    blocks.push({ type: 'divider' });

    const contextElements = [
      {
        type: 'mrkdwn',
        text: `Generated by *mat-a11y* | ${new Date().toISOString()} | traufix.de | freelancermap.de/profil/robin-spanier`
      }
    ];

    blocks.push({
      type: 'context',
      elements: contextElements
    });
  }

  // Return the complete Slack message payload
  const payload = {
    blocks,
    // Fallback text for notifications
    text: `${title}: ${statusText} - ${distribution.passing}/${normalized.total || 0} ${nouns.plural} passing (${passRate}%)`
  };

  return JSON.stringify(payload, null, 2);
}

module.exports = {
  name: 'slack',
  description: 'Slack Block Kit message format for webhook notifications',
  category: 'notifications',
  output: 'json',
  fileExtension: '.json',
  mimeType: 'application/json',
  format
};
