'use strict';

/**
 * Microsoft Teams Adaptive Card Formatter
 *
 * Formats mat-a11y results as Microsoft Teams Adaptive Card JSON
 * for webhook integrations.
 *
 * @see https://adaptivecards.io/
 * @see https://docs.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/connectors-using
 * @module formatters/teams
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
 * Get status color based on pass rate
 * @param {number} passRate - Pass rate percentage (0-100)
 * @returns {string} Adaptive Card color keyword
 */
function getStatusColor(passRate) {
  if (passRate >= 90) return 'good';
  if (passRate >= 50) return 'warning';
  return 'attention';
}

/**
 * Get status emoji based on pass rate
 * @param {number} passRate - Pass rate percentage (0-100)
 * @returns {string} Status emoji
 */
function getStatusEmoji(passRate) {
  if (passRate >= 90) return '\u2705'; // check mark
  if (passRate >= 50) return '\u26A0\uFE0F'; // warning
  return '\u274C'; // cross mark
}

/**
 * Format a score with appropriate styling
 * @param {number} score - Score value (0-100)
 * @returns {string} Formatted score string
 */
function formatScore(score) {
  if (score >= 90) return `**${score}** (Pass)`;
  if (score >= 50) return `**${score}** (Warning)`;
  return `**${score}** (Fail)`;
}

/**
 * Get the top N entities by priority (pre-sorted by totalPoints)
 * Entities are already sorted by normalizeResults() in priority order.
 * @param {Array} entities - Array of normalized entities (pre-sorted)
 * @param {number} count - Number of entities to return
 * @returns {Array} Highest priority entities
 */
function getTopPriorityEntities(entities, count) {
  if (!entities || entities.length === 0) return [];
  // Entities are pre-sorted by totalPoints descending (highest priority first)
  return entities.slice(0, count);
}

/**
 * Get the N worst URLs by score (fallback for internal routes)
 * @param {Array} urls - Array of URL results
 * @param {number} count - Number of URLs to return
 * @returns {Array} Worst performing URLs
 */
function getWorstUrls(urls, count) {
  if (!urls || urls.length === 0) return [];
  return [...urls]
    .sort((a, b) => a.auditScore - b.auditScore)
    .slice(0, count);
}

/**
 * Build the facts array for the summary section
 * @param {object} results - Analysis results
 * @param {number} passRate - Calculated pass rate
 * @returns {Array} Facts for Adaptive Card FactSet
 */
function buildSummaryFacts(results, passRate, nouns) {
  const distribution = results.distribution || { passing: 0, warning: 0, failing: 0 };
  return [
    {
      title: `Total ${nouns.plural}`,
      value: String(results.total || 0)
    },
    {
      title: 'Passing',
      value: `${distribution.passing} (score >= 90)`
    },
    {
      title: 'Warning',
      value: `${distribution.warning} (score 50-89)`
    },
    {
      title: 'Failing',
      value: `${distribution.failing} (score < 50)`
    },
    {
      title: 'Pass Rate',
      value: `${passRate.toFixed(1)}%`
    },
    {
      title: 'Tier',
      value: results.tier || 'default'
    }
  ];
}

/**
 * Build priority entities section as a table
 * @param {Array} entities - Array of priority entities (pre-sorted)
 * @param {object} nouns - Entity type nouns
 * @param {boolean} showPriority - Whether to show priority points column
 * @returns {object} Adaptive Card Table element
 */
function buildPriorityTable(entities, nouns, showPriority = true) {
  if (entities.length === 0) {
    return {
      type: 'TextBlock',
      text: `No ${nouns.plural.toLowerCase()} analyzed`,
      wrap: true,
      isSubtle: true
    };
  }

  const rows = entities.map(entity => {
    const cells = [
      {
        type: 'TableCell',
        items: [
          {
            type: 'TextBlock',
            text: entity.path || entity.label,
            wrap: true,
            size: 'small'
          }
        ]
      },
      {
        type: 'TableCell',
        items: [
          {
            type: 'TextBlock',
            text: formatScore(entity.auditScore),
            wrap: true,
            size: 'small'
          }
        ]
      },
      {
        type: 'TableCell',
        items: [
          {
            type: 'TextBlock',
            text: String(entity.issues ? entity.issues.length : 0),
            wrap: true,
            size: 'small'
          }
        ]
      }
    ];

    if (showPriority && entity.issuePoints) {
      cells.push({
        type: 'TableCell',
        items: [
          {
            type: 'TextBlock',
            text: String(entity.issuePoints.totalPoints),
            wrap: true,
            size: 'small'
          }
        ]
      });
    }

    return { type: 'TableRow', cells };
  });

  const headerCells = [
    {
      type: 'TableCell',
      items: [{ type: 'TextBlock', text: nouns.singular, weight: 'bolder', size: 'small' }]
    },
    {
      type: 'TableCell',
      items: [{ type: 'TextBlock', text: 'Score', weight: 'bolder', size: 'small' }]
    },
    {
      type: 'TableCell',
      items: [{ type: 'TextBlock', text: 'Issues', weight: 'bolder', size: 'small' }]
    }
  ];

  const columns = [{ width: 3 }, { width: 1 }, { width: 1 }];

  if (showPriority && entities.some(e => e.issuePoints)) {
    headerCells.push({
      type: 'TableCell',
      items: [{ type: 'TextBlock', text: 'Priority', weight: 'bolder', size: 'small' }]
    });
    columns.push({ width: 1 });
  }

  return {
    type: 'Table',
    columns,
    rows: [
      { type: 'TableRow', cells: headerCells },
      ...rows
    ]
  };
}

/**
 * Build worst URLs section as a table (legacy, for internal routes)
 * @param {Array} worstUrls - Array of worst performing URLs
 * @returns {object} Adaptive Card Table element
 */
function buildWorstUrlsTable(worstUrls, nouns) {
  if (worstUrls.length === 0) {
    return {
      type: 'TextBlock',
      text: `No ${nouns.plural.toLowerCase()} analyzed`,
      wrap: true,
      isSubtle: true
    };
  }

  const rows = worstUrls.map(url => ({
    type: 'TableRow',
    cells: [
      {
        type: 'TableCell',
        items: [
          {
            type: 'TextBlock',
            text: url.path,
            wrap: true,
            size: 'small'
          }
        ]
      },
      {
        type: 'TableCell',
        items: [
          {
            type: 'TextBlock',
            text: formatScore(url.auditScore),
            wrap: true,
            size: 'small'
          }
        ]
      },
      {
        type: 'TableCell',
        items: [
          {
            type: 'TextBlock',
            text: String(url.issues ? url.issues.length : 0),
            wrap: true,
            size: 'small'
          }
        ]
      }
    ]
  }));

  return {
    type: 'Table',
    columns: [
      { width: 3 },
      { width: 1 },
      { width: 1 }
    ],
    rows: [
      {
        type: 'TableRow',
        cells: [
          {
            type: 'TableCell',
            items: [{ type: 'TextBlock', text: nouns.singular, weight: 'bolder', size: 'small' }]
          },
          {
            type: 'TableCell',
            items: [{ type: 'TextBlock', text: 'Score', weight: 'bolder', size: 'small' }]
          },
          {
            type: 'TableCell',
            items: [{ type: 'TextBlock', text: 'Issues', weight: 'bolder', size: 'small' }]
          }
        ]
      },
      ...rows
    ]
  };
}

/**
 * Build fallback priority entities section for older Teams versions
 * @param {Array} entities - Array of priority entities (pre-sorted)
 * @param {object} nouns - Entity type nouns
 * @param {boolean} showPriority - Whether to show priority points
 * @returns {Array} Array of TextBlock elements
 */
function buildPriorityFallback(entities, nouns, showPriority = true) {
  if (entities.length === 0) {
    return [{
      type: 'TextBlock',
      text: `No ${nouns.plural.toLowerCase()} analyzed`,
      wrap: true,
      isSubtle: true
    }];
  }

  return entities.map(entity => {
    const path = entity.path || entity.label;
    const issueCount = entity.issues ? entity.issues.length : 0;
    let text = `${path} - Score: ${entity.auditScore}, Issues: ${issueCount}`;

    if (showPriority && entity.issuePoints) {
      text += `, Priority: ${entity.issuePoints.totalPoints}`;
    }

    return {
      type: 'TextBlock',
      text,
      wrap: true,
      size: 'small',
      spacing: 'small'
    };
  });
}

/**
 * Build fallback worst URLs section for older Teams versions (legacy, for internal routes)
 * @param {Array} worstUrls - Array of worst performing URLs
 * @returns {Array} Array of TextBlock elements
 */
function buildWorstUrlsFallback(worstUrls, nouns) {
  if (worstUrls.length === 0) {
    return [{
      type: 'TextBlock',
      text: `No ${nouns.plural.toLowerCase()} analyzed`,
      wrap: true,
      isSubtle: true
    }];
  }

  return worstUrls.map(url => ({
    type: 'TextBlock',
    text: `${url.path} - Score: ${url.auditScore}, Issues: ${url.issues ? url.issues.length : 0}`,
    wrap: true,
    size: 'small',
    spacing: 'small'
  }));
}

/**
 * Format mat-a11y results as Microsoft Teams Adaptive Card
 *
 * @param {object} results - Analysis results from mat-a11y
 * @param {Array} results.urls - Array of URL analysis results
 * @param {object} results.distribution - Distribution of passing/warning/failing
 * @param {string} results.tier - Tier level
 * @param {number} results.urlCount - Total URL count
 * @param {object} [options={}] - Formatting options
 * @param {string} [options.title] - Custom card title
 * @param {number} [options.worstUrlCount=5] - Number of highest priority entities to show
 * @param {string} [options.webhookUrl] - Webhook URL (for documentation, not used in format)
 * @param {boolean} [options.useFallback=false] - Use fallback format instead of Table
 * @param {string} [options.projectName] - Project name to display
 * @param {string} [options.buildUrl] - URL to build/pipeline
 * @param {boolean} [options.showPriority=true] - Show priority points in the table
 * @returns {string} JSON string of Adaptive Card
 */
function format(results, options = {}) {
  const {
    title = 'mat-a11y Accessibility Report',
    worstUrlCount = 5,
    useFallback = false,
    projectName,
    buildUrl,
    showPriority = true
  } = options;

  const normalized = normalizeResults(results);
  const nouns = getEntityNouns(results, normalized);

  const passRate = normalized.total > 0
    ? ((normalized.distribution?.passing ?? 0) / normalized.total) * 100
    : 0;

  const statusColor = getStatusColor(passRate);
  const statusEmoji = getStatusEmoji(passRate);

  // Use pre-sorted entities from normalizeResults (sorted by totalPoints descending)
  // Entities are already in priority order - highest impact first
  const priorityEntities = getTopPriorityEntities(normalized.entities, worstUrlCount);

  // Build the card body
  const body = [
    // Header with status
    {
      type: 'TextBlock',
      text: `${statusEmoji} ${title}`,
      weight: 'bolder',
      size: 'large',
      wrap: true
    }
  ];

  // Add project name if provided
  if (projectName) {
    body.push({
      type: 'TextBlock',
      text: `Project: **${projectName}**`,
      wrap: true,
      spacing: 'small'
    });
  }

  // Summary section
  body.push(
    {
      type: 'TextBlock',
      text: 'Summary',
      weight: 'bolder',
      size: 'medium',
      spacing: 'medium'
    },
    {
      type: 'FactSet',
      facts: buildSummaryFacts(
        { tier: normalized.tier, total: normalized.total, distribution: normalized.distribution },
        passRate,
        nouns
      )
    }
  );

  // Highest priority entities section (sorted by issue points)
  body.push({
    type: 'TextBlock',
    text: `Highest Priority ${nouns.plural} (Top ${worstUrlCount})`,
    weight: 'bolder',
    size: 'medium',
    spacing: 'medium'
  });

  if (useFallback) {
    body.push(...buildPriorityFallback(priorityEntities, nouns, showPriority));
  } else {
    body.push(buildPriorityTable(priorityEntities, nouns, showPriority));
  }

  // Internal routes section if any
  if (results.internal && results.internal.count > 0) {
    const id = results.internal.distribution || { passing: 0, warning: 0, failing: 0 };
    const worstInternal = getWorstUrls(results.internal.routes, 3);

    body.push({
      type: 'TextBlock',
      text: 'Internal Routes (not in sitemap)',
      weight: 'bolder',
      size: 'medium',
      spacing: 'medium'
    });

    body.push({
      type: 'FactSet',
      facts: [
        { title: 'Total Routes', value: String(results.internal.count) },
        { title: 'Passing', value: String(id.passing) },
        { title: 'Warning', value: String(id.warning) },
        { title: 'Failing', value: String(id.failing) }
      ]
    });

    if (worstInternal.length > 0) {
      if (useFallback) {
        body.push(...buildWorstUrlsFallback(worstInternal, { singular: 'URL', plural: 'URLs' }));
      } else {
        body.push(buildWorstUrlsTable(worstInternal, { singular: 'URL', plural: 'URLs' }));
      }
    }
  }

  // Timestamp
  body.push({
    type: 'TextBlock',
    text: `Generated: ${new Date().toISOString()}`,
    size: 'small',
    isSubtle: true,
    spacing: 'medium'
  });

  // Consulting promo
  body.push({
    type: 'TextBlock',
    text: 'traufix.de | freelancermap.de/profil/robin-spanier',
    size: 'small',
    isSubtle: true,
    spacing: 'small'
  });

  // Build actions if build URL provided
  const actions = [];
  if (buildUrl) {
    actions.push({
      type: 'Action.OpenUrl',
      title: 'View Build',
      url: buildUrl
    });
  }

  // Construct the full Adaptive Card
  const card = {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        contentUrl: null,
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          msteams: {
            width: 'Full'
          },
          body,
          ...(actions.length > 0 && { actions })
        }
      }
    ]
  };

  return JSON.stringify(card, null, 2);
}

module.exports = {
  name: 'teams',
  description: 'Microsoft Teams Adaptive Card format for webhook notifications',
  category: 'notifications',
  output: 'json',
  fileExtension: '.json',
  mimeType: 'application/json',
  format
};
