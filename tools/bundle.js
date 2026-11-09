// Rebuilds the old single-file version (dist/low-roller.html) from src/, for sharing a quick web preview.
// Fonts and Three.js are inlined so the file works offline. Not used by the desktop app.
// Published as a private Claude artifact with capabilities {db:{}, user:{}} so saves sync between devices.
// (Replacements use functions so `$` sequences in the game code aren't treated as patterns.)
const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, '..', 'src');
const read = (p) => fs.readFileSync(path.join(src, p), 'utf8');

const fontsCss = read('fonts/fonts.css').replace(/url\(([^)]+\.woff2)\)/g, (_, f) =>
  `url(data:font/woff2;base64,${fs.readFileSync(path.join(src, 'fonts', f)).toString('base64')})`);

let html = read('index.html')
  .replace(/<meta http-equiv="Content-Security-Policy"[^>]*>\n/, '')
  .replace('<link rel="stylesheet" href="fonts/fonts.css">', () => `<style>${fontsCss}</style>`)
  .replace('<link rel="stylesheet" href="styles.css">', () => `<style>${read('styles.css')}</style>`)
  .replace('<script src="vendor/three.min.js"></script>', () => `<script>${read('vendor/three.min.js')}</script>`)
  .replace('<script src="js/logic.js"></script>', () => `<script>${read('js/logic.js')}</script>`)
  // game.js is held as text and started by cloud-save.js once the save is synced (see that file).
  .replace('<script src="js/game.js"></script>', () =>
    `<script type="text/plain" id="lr-game">${read('js/game.js')}</script>\n` +
    `<script>${fs.readFileSync(path.join(__dirname, 'web', 'cloud-save.js'), 'utf8')}</script>`);

fs.mkdirSync(path.join(__dirname, '..', 'dist'), { recursive: true });
const out = path.join(__dirname, '..', 'dist', 'low-roller.html');
fs.writeFileSync(out, html);
console.log(`wrote ${out} (${(html.length / 1024).toFixed(0)} KB)`);
