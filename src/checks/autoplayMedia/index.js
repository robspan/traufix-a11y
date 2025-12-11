module.exports = {
  name: 'autoplayMedia',
  description: 'Autoplay media should have controls and be muted for accessibility',
  tier: 'enhanced',
  type: 'html',
  weight: 7,
  wcag: '1.4.2',

  check(content) {
    const issues = [];

    // Match video and audio elements with autoplay
    const mediaRegex = /<(video|audio)\s+[^>]*autoplay[^>]*>/gi;
    let mediaMatch;

    while ((mediaMatch = mediaRegex.exec(content)) !== null) {
      const mediaTag = mediaMatch[0];
      const mediaType = mediaMatch[1].toLowerCase();

      const hasControls = /\bcontrols\b/i.test(mediaTag);
      const hasMuted = /\bmuted\b/i.test(mediaTag);

      if (!hasControls && !hasMuted) {
        issues.push(
          `[Error] Media autoplays without controls or muted attribute. Autoplay can interfere with screen readers and distract users\n` +
          `  How to fix:\n` +
          `    - Add muted attribute to prevent audio interference\n` +
          `    - Provide controls so users can pause/stop the media\n` +
          `    - Limit autoplay to 3 seconds or less\n` +
          `  WCAG 1.4.2: Audio Control | See: https://www.w3.org/WAI/WCAG21/Understanding/audio-control\n` +
          `  Found: ${mediaTag}`
        );
      } else if (!hasControls) {
        issues.push(
          `[Error] Media autoplays without controls. Autoplay can interfere with screen readers and distract users\n` +
          `  How to fix:\n` +
          `    - Add controls attribute so users can pause/stop the media\n` +
          `    - Limit autoplay to 3 seconds or less\n` +
          `  WCAG 1.4.2: Audio Control | See: https://www.w3.org/WAI/WCAG21/Understanding/audio-control\n` +
          `  Found: ${mediaTag}`
        );
      } else if (!hasMuted) {
        issues.push(
          `[Error] Media autoplays without muted attribute. Autoplay can interfere with screen readers and distract users\n` +
          `  How to fix:\n` +
          `    - Add muted attribute to prevent audio interference\n` +
          `    - Limit autoplay to 3 seconds or less\n` +
          `  WCAG 1.4.2: Audio Control | See: https://www.w3.org/WAI/WCAG21/Understanding/audio-control\n` +
          `  Found: ${mediaTag}`
        );
      }
    }

    return {
      pass: issues.length === 0,
      issues
    };
  }
};
