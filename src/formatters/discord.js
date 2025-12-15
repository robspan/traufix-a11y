'use strict';

/**
 * Discord Embed Formatter
 *
 * Formats mat-a11y results as Discord embed messages for webhook integration.
 * Produces rich embeds with color coding based on results status.
 *
 * @see https://discord.com/developers/docs/resources/channel#embed-object
 * @module formatters/discord
 */

/**
 * Discord embed color constants (decimal format)
 * @type {object}
 */
const COLORS = {
  GREEN: 0x2ECC71,   // Success/Passing
  YELLOW: 0xF1C40F,  // Warning
  RED: 0xE74C3C,     // Failure/Error
  BLUE: 0x3498DB     // Info/Neutral
};

const { normalizeResults, getWorstEntities } = require('./result-utils');

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
 * Get embed color based on results distribution
 * @param {object} distribution - Results distribution
 * @returns {number} Discord color value
 */
function getEmbedColor(distribution) {
  if (distribution.failing > 0) return COLORS.RED;
  if (distribution.warning > 0) return COLORS.YELLOW;
  return COLORS.GREEN;
}

/**
 * Get status text based on distribution
 * @param {object} distribution - Results distribution
 * @returns {string} Status text with emoji
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
 * Get the worst performing URLs from results
 * @param {object} results - Analysis results
 * @param {number} limit - Maximum number of URLs to return
 * @returns {Array} Array of worst URL objects
 */
function getWorstUrls(results, limit = 5) {
  return getWorstEntities(results.entities, limit)
    .filter(e => (e.auditScore ?? 0) < 90)
    .map(e => ({ path: e.label, auditScore: e.auditScore, issues: e.issues }));
}

/**
 * Format worst URLs as embed field value
 * @param {Array} worstUrls - Array of worst URL objects
 * @returns {string} Formatted string for embed field
 */
function formatWorstUrlsValue(worstUrls) {
  if (worstUrls.length === 0) return 'All items are passing!';

  return worstUrls
    .map(url => {
      const emoji = url.auditScore >= 50 ? ':warning:' : ':x:';
      const issueCount = url.issues ? url.issues.length : 0;
      return `${emoji} **${url.path}** - ${url.auditScore}% (${issueCount} issues)`;
    })
    .join('\n');
}

/**
 * Format top issues as embed field value
 * @param {object} results - Analysis results
 * @param {number} limit - Maximum issues to show
 * @returns {string} Formatted string for embed field
 */
function formatTopIssues(results, limit = 5) {
  const issueCounts = {};

  for (const issue of (results.issues || [])) {
    issueCounts[issue.check] = (issueCounts[issue.check] || 0) + 1;
  }

  const sorted = Object.entries(issueCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  if (sorted.length === 0) return 'No issues found!';

  return sorted
    .map(([check, count]) => `\`${check}\`: ${count}`)
    .join('\n');
}

/**
 * Format mat-a11y results as Discord embed message
 *
 * @param {object} results - Analysis results
 * @param {string[]} results.urls - Array of URL results
 * @param {object} results.distribution - Distribution of passing/warning/failing
 * @param {string} results.tier - Analysis tier
 * @param {number} results.urlCount - Total URL count
 * @param {object} [options={}] - Formatter options
 * @param {string} [options.title] - Custom embed title
 * @param {string} [options.description] - Custom embed description
 * @param {number} [options.maxWorstUrls] - Max worst URLs to show (default: 5)
 * @param {boolean} [options.showTopIssues] - Show top issues field (default: true)
 * @param {string} [options.username] - Custom webhook username
 * @param {string} [options.avatarUrl] - Custom webhook avatar URL
 * @returns {string} JSON string of Discord webhook message
 */
function format(results, options = {}) {
  const {
    title = 'Accessibility Report',
    description,
    maxWorstUrls = 5,
    showTopIssues = true,
    username = 'mat-a11y',
    avatarUrl
  } = options;

  const normalized = normalizeResults(results);
  const nouns = getEntityNouns(results, normalized);
  const distribution = normalized.distribution || { passing: 0, warning: 0, failing: 0 };
  const color = getEmbedColor(distribution);
  const statusText = getStatusText(distribution);
  const passRate = calculatePassRate(normalized);
  const worstUrls = getWorstUrls(normalized, maxWorstUrls);

  // Build embed fields
  const fields = [
    {
      name: 'Status',
      value: `**${statusText}**`,
      inline: true
    },
    {
      name: 'Tier',
      value: `\`${normalized.tier || 'unknown'}\``,
      inline: true
    },
    {
      name: 'Pass Rate',
      value: `**${passRate}%**`,
      inline: true
    },
    {
      name: `${nouns.plural} Analyzed`,
      value: `${normalized.total || 0}`,
      inline: true
    },
    {
      name: 'Passing',
      value: `:green_circle: ${distribution.passing}`,
      inline: true
    },
    {
      name: 'Warning',
      value: `:yellow_circle: ${distribution.warning}`,
      inline: true
    },
    {
      name: 'Failing',
      value: `:red_circle: ${distribution.failing}`,
      inline: true
    }
  ];

  // Add worst URLs field if there are any
  if (worstUrls.length > 0) {
    fields.push({
      name: `Worst Performing ${nouns.plural}`,
      value: formatWorstUrlsValue(worstUrls),
      inline: false
    });
  }

  // Add top issues field
  if (showTopIssues) {
    const topIssuesValue = formatTopIssues(normalized, 5);
    if (topIssuesValue !== 'No issues found!') {
      fields.push({
        name: 'Top Issues',
        value: topIssuesValue,
        inline: false
      });
    }
  }

  // Add internal routes field if any
  if (results.internal && results.internal.count > 0) {
    const id = results.internal.distribution || { passing: 0, warning: 0, failing: 0 };
    const worstInternal = (results.internal.routes || [])
      .filter(r => r.auditScore < 90)
      .sort((a, b) => a.auditScore - b.auditScore)
      .slice(0, 3);

    let internalValue = `${results.internal.count} routes | :green_circle: ${id.passing} | :yellow_circle: ${id.warning} | :red_circle: ${id.failing}`;

    if (worstInternal.length > 0) {
      internalValue += '\n' + worstInternal
        .map(r => `${r.auditScore >= 50 ? ':warning:' : ':x:'} **${r.path}** - ${r.auditScore}%`)
        .join('\n');
    }

    fields.push({
      name: 'Internal Routes (not in sitemap)',
      value: internalValue,
      inline: false
    });
  }

  // Build the embed object
  const embed = {
    title,
    description: description || `Accessibility analysis complete for ${normalized.total || 0} ${nouns.plural}`,
    color,
    fields,
    footer: {
      text: 'Generated by mat-a11y | traufix.de | freelancermap.de/profil/robin-spanier'
    },
    timestamp: new Date().toISOString()
  };

  // Build the complete webhook payload
  const payload = {
    username,
    embeds: [embed]
  };

  // Add avatar URL if provided
  if (avatarUrl) {
    payload.avatar_url = avatarUrl;
  }

  // Add fallback content for embed-disabled clients
  payload.content = `**${title}**: ${statusText} - ${distribution.passing}/${results.urlCount || 0} URLs passing (${passRate}%)`;

  // Keep legacy field name stable even if urlCount is absent
  if (!results.urlCount) {
    payload.content = `**${title}**: ${statusText} - ${distribution.passing}/${normalized.total || 0} URLs passing (${passRate}%)`;
  }

  return JSON.stringify(payload, null, 2);
}

module.exports = {
  name: 'discord',
  description: 'Discord embed format for webhook notifications',
  category: 'notifications',
  output: 'json',
  fileExtension: '.json',
  mimeType: 'application/json',
  format
};
