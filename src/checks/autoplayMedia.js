const { format } = require('../core/errors');

module.exports = {
  name: 'autoplayMedia',
  description: 'Autoplay media should have controls and be muted for accessibility',
  tier: 'material',
  type: 'html',
  weight: 7,
  wcag: '1.4.2',

  check(content) {
    const issues = [];
    let elementsFound = 0;

    // Match video and audio elements with autoplay
    const mediaRegex = /<(video|audio)\s+[^>]*autoplay[^>]*>/gi;
    let mediaMatch;

    while ((mediaMatch = mediaRegex.exec(content)) !== null) {
      elementsFound++;
      const mediaTag = mediaMatch[0];
      const mediaType = mediaMatch[1].toLowerCase();

      const hasControls = /\bcontrols\b/i.test(mediaTag);
      const hasMuted = /\bmuted\b/i.test(mediaTag);

      if (!hasControls || !hasMuted) {
        issues.push(format('MEDIA_AUTOPLAY', { element: mediaTag }));
      }
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
