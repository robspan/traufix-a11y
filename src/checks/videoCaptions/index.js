module.exports = {
  name: 'videoCaptions',
  description: 'Videos have caption tracks',
  tier: 'basic',
  type: 'html',
  weight: 7,
  wcag: '1.2.2',

  check(content) {
    const issues = [];
    const videoRegex = /<video[^>]*>[\s\S]*?<\/video>/gi;
    let match;

    while ((match = videoRegex.exec(content)) !== null) {
      const video = match[0];
      const hasTrack = /<track[^>]*kind=["']captions["']/i.test(video);
      if (!hasTrack) {
        // Extract just the opening video tag for the "Found" output
        const openingTag = video.match(/<video[^>]*>/i)?.[0] || '<video>';
        issues.push(
          `[Error] Video without captions. Deaf/hard-of-hearing users cannot access audio content\n` +
          `  How to fix:\n` +
          `    - Add <track kind="captions" src="..."> element\n` +
          `  WCAG 1.2.2: Captions (Prerecorded) | See: https://www.w3.org/WAI/media/av/captions/\n` +
          `  Found: ${openingTag}`
        );
      }
    }

    return { pass: issues.length === 0, issues };
  }
};
