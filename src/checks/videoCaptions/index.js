const { format } = require('../../core/errors');

module.exports = {
  name: 'videoCaptions',
  description: 'Videos have caption tracks',
  tier: 'basic',
  type: 'html',
  weight: 7,
  wcag: '1.2.2',

  check(content) {
    const issues = [];
    let elementsFound = 0;
    const videoRegex = /<video[^>]*>[\s\S]*?<\/video>/gi;
    let match;

    while ((match = videoRegex.exec(content)) !== null) {
      elementsFound++;
      const video = match[0];
      const hasTrack = /<track[^>]*kind=["']captions["']/i.test(video);
      if (!hasTrack) {
        // Extract just the opening video tag for the "Found" output
        const element = video.match(/<video[^>]*>/i)?.[0] || '<video>';
        issues.push(format('VIDEO_MISSING_CAPTIONS', { element }));
      }
    }

    return { pass: issues.length === 0, issues, elementsFound };
  }
};
