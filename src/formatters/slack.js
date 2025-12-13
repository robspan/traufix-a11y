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
  if (!results.urlCount) return 0;
  const passing = results.distribution?.passing ?? 0;
  return Math.round((passing / results.urlCount) * 100);
}

/**
 * Get the worst performing URLs from results
 * @param {object} results - Analysis results
 * @param {number} limit - Maximum number of URLs to return
 * @returns {Array} Array of worst URL objects
 */
function getWorstUrls(results, limit = 5) {
  const urls = results.urls || [];
  return urls
    .filter(url => url.auditScore < 90)
    .sort((a, b) => a.auditScore - b.auditScore)
    .slice(0, limit);
}

/**
 * Format a single URL as a Slack section block
 * @param {object} url - URL result object
 * @returns {object} Slack section block
 */
function formatUrlBlock(url) {
  const scoreEmoji = url.auditScore >= 90 ? ':white_check_mark:' :
                     url.auditScore >= 50 ? ':warning:' : ':x:';

  const issueCount = url.issues ? url.issues.length : 0;
  const topIssues = url.issues ? url.issues.slice(0, 3) : [];

  let issueText = '';
  if (topIssues.length > 0) {
    issueText = '\n' + topIssues
      .map(issue => `  - \`${issue.check}\`: ${issue.message.replace(/^\[(Error|Warning|Info)\]\s*/, '').substring(0, 80)}`)
      .join('\n');
  }

  return {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `${scoreEmoji} *${url.path}*\nScore: ${url.auditScore}% | Issues: ${issueCount}${issueText}`
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
 * @returns {string} JSON string of Slack Block Kit message
 */
function format(results, options = {}) {
  const {
    title = 'Accessibility Report',
    maxWorstUrls = 5,
    includeTimestamp = true
  } = options;

  const distribution = results.distribution || { passing: 0, warning: 0, failing: 0 };
  const statusEmoji = getStatusEmoji(distribution);
  const statusText = getStatusText(distribution);
  const passRate = calculatePassRate(results);
  const worstUrls = getWorstUrls(results, maxWorstUrls);

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
      text: `${statusEmoji} *Status: ${statusText}*\nTier: \`${results.tier || 'unknown'}\` | Pass Rate: *${passRate}%*`
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
        text: `*URLs Analyzed*\n${results.urlCount || 0}`
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

  // Worst URLs section (if any)
  if (worstUrls.length > 0) {
    blocks.push({ type: 'divider' });

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Worst Performing URLs (Sitemap)*'
      }
    });

    for (const url of worstUrls) {
      blocks.push(formatUrlBlock(url));
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

    // Show worst internal routes
    const worstInternal = (results.internal.routes || [])
      .filter(r => r.auditScore < 90)
      .sort((a, b) => a.auditScore - b.auditScore)
      .slice(0, 3);

    for (const route of worstInternal) {
      blocks.push(formatUrlBlock(route));
    }
  }

  // Context block with timestamp and metadata
  if (includeTimestamp) {
    blocks.push({ type: 'divider' });

    const contextElements = [
      {
        type: 'mrkdwn',
        text: `Generated by *mat-a11y* | ${new Date().toISOString()}`
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
    text: `${title}: ${statusText} - ${distribution.passing}/${results.urlCount || 0} URLs passing (${passRate}%)`
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
