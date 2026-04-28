const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'src');

const replacements = [
  { search: /#ff4d6d/gi, replace: '#0077b6' },
  { search: /rgba\(255,\s*77,\s*109,/g, replace: 'rgba(0, 119, 182,' },
  { search: /255,\s*77,\s*109/g, replace: '0, 119, 182' },
  { search: /#ff8fa3/gi, replace: '#00b4d8' },
  { search: /#e040fb/gi, replace: '#10b981' },
  { search: /#c9184a/gi, replace: '#023e8a' },
];

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  
  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.css') || fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;
      
      for (const r of replacements) {
        if (content.match(r.search)) {
          content = content.replace(r.search, r.replace);
          modified = true;
        }
      }
      
      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated: ${fullPath}`);
      }
    }
  }
}

processDirectory(targetDir);
console.log('Color replacement complete.');
