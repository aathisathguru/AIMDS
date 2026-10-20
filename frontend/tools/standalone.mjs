/*
 * Folds the `--mode standalone` build into one self-contained HTML file.
 *
 * That build emits a single JS chunk and a single stylesheet, so both can be
 * inlined directly — no module graph, no blob URLs, no network requests. The
 * result opens anywhere: double-clicked from the filesystem, dropped into a
 * sandboxed preview pane, or sent to someone who has no Node installed.
 *
 *   npm run build:standalone
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist', 'standalone');
const assets = join(dist, 'assets');
const out = join(root, 'aimds-standalone.html');

if (!existsSync(assets)) {
  throw new Error('Run `vite build --mode standalone` first — dist/standalone is missing.');
}

const files = readdirSync(assets);
const js = files.filter((f) => f.endsWith('.js'));
const css = files.filter((f) => f.endsWith('.css'));

if (js.length !== 1) {
  throw new Error(`Expected exactly one JS chunk, got ${js.length}: ${js.join(', ')}`);
}

const script = readFileSync(join(assets, js[0]), 'utf8');
const styles = css.map((f) => readFileSync(join(assets, f), 'utf8')).join('\n');

const favicon = readFileSync(join(root, 'public', 'favicon.svg'), 'utf8');
const faviconData = `data:image/svg+xml;base64,${Buffer.from(favicon).toString('base64')}`;

// `</script>` anywhere in the bundle would close the tag early.
const safeScript = script.replaceAll('</script', '<\\/script');

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="${faviconData}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#1C1C1E" />
    <meta name="description" content="AIMDS — AI-Based Multi-Utility Monitoring and Decision Support System" />
    <title>AIMDS · Multi-Utility Monitoring</title>
    <style>
${styles}
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module">
${safeScript}
    </script>
  </body>
</html>
`;

writeFileSync(out, html);
const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
console.log(`aimds-standalone.html  ${kb} kB  — single file, no server, no network`);
