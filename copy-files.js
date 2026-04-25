const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'needpulse', 'src');
const dst = path.join(__dirname, 'src');

function copyDir(s, d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  for (const item of fs.readdirSync(s)) {
    const sp = path.join(s, item);
    const dp = path.join(d, item);
    if (fs.statSync(sp).isDirectory()) {
      copyDir(sp, dp);
    } else {
      fs.copyFileSync(sp, dp);
      console.log(`Copied: ${dp}`);
    }
  }
}

copyDir(src, dst);
console.log('\nDone! All files copied from needpulse/src/ to src/');
