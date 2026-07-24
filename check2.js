const fs = require('fs');
const html = fs.readFileSync('C:/projects/english-cards/index.html', 'utf8');
const match = html.match(/<script>([\s\S]*)<\/script>/);
if (match) {
  const script = match[1];
  // 查找所有单引号内的单引号
  const lines = script.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // 如果一行中单引号数量很多，且包含 story: 或 storyZh: 字段
    if (line.includes('story:') || line.includes('storyZh:')) {
      // 统计单引号数量
      const count = (line.match(/'/g) || []).length;
      // 统计反斜杠转义的单引号数量
      const escaped = (line.match(/\\'/g) || []).length;
      // 正常的单引号成对出现，所以单引号总数应该是偶数
      if (count % 2 !== 0) {
        console.log('ODD quotes at line', (i+1));
      }
    }
  }
  console.log('Done');
}