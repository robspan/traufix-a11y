const fs = require('fs');
const path = require('path');

const checksDir = './src/checks';
const dirs = fs.readdirSync(checksDir).filter(d =>
  fs.statSync(path.join(checksDir, d)).isDirectory()
);

let needsUpdate = [];

for (const dir of dirs) {
  const file = path.join(checksDir, dir, 'index.js');
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const hasWcag = content.includes('WCAG') || content.includes('wcag');
    const hasFix = content.includes('How to fix') || content.includes('FIX:');
    const hasLink = content.includes('See:') || content.includes('https://');

    if (!hasWcag || !hasFix) {
      needsUpdate.push({ dir, hasWcag, hasFix, hasLink });
    }
  }
}

console.log('Checks potentially needing updates (' + needsUpdate.length + '):');
needsUpdate.forEach(c =>
  console.log('  ' + c.dir + ' - WCAG:' + c.hasWcag + ' Fix:' + c.hasFix + ' Link:' + c.hasLink)
);

if (needsUpdate.length === 0) {
  console.log('  All checks have WCAG references and fix instructions!');
}
