// Junta os módulos de src/ em um único index.html autocontido
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'src');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js')).sort();
const code = files.map((f) => `// ---------- ${f} ----------\n` + fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
const tpl = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist', 'index.html'), tpl.replace('/*__GAME__*/', () => code));
console.log('ok', files.length, 'módulos', (code.length / 1024).toFixed(1) + ' KB');
