const fs = require('fs');
let html = fs.readFileSync('C:/projects/english-cards/index.html', 'utf8');
const lines = html.split('\n');
let found = false;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes("story: '") && line.includes("'")) {
    const storyStart = line.indexOf("story: '") + 8;
    // 找结束的单引号 - 简单方法：从storyStart开始找第一个未被转义的单引号
    let endQuote = -1;
    for (let j = storyStart; j < line.length; j++) {
      if (line[j] === "'" && (j === 0 || line[j-1] !== '\\')) {
        endQuote = j;
        break;
      }
    }
    if (endQuote > storyStart) {
      const content = line.substring(storyStart, endQuote);
      for (let k = 0; k < content.length; k++) {
        if (content[k] === "'" && (k === 0 || content[k-1] !== '\\')) {
          console.log('UNESCAPED quote in line', (i+1));
          console.log('Context:', content.substring(Math.max(0,k-20), k+20));
          found = true;
        }
      }
    }
  }
}
if (!found) console.log('No unescaped quotes');