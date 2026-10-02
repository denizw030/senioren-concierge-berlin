import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const mapping = JSON.parse(fs.readFileSync(path.join(root, 'tests/fixtures/stewaro-csp-map.json'), 'utf8'));
export function effectiveHtmlSource(html) {
  for (const [marker, entry] of Object.entries(mapping)) {
    if (!html.includes(marker)) continue;
    const replacement = entry.asset
      ? entry.opening + fs.readFileSync(path.join(root, entry.asset), 'utf8') + entry.closing
      : entry.original;
    html = html.replaceAll(marker, () => replacement);
  }
  html = html.replace(/<link rel="stylesheet" href="\/(assets\/stewaro-home-de-[^"?]+\.css)\?v=1"(?: id="([^"]+)")?>/g,
    (_, asset, id) => '<style' + (id ? ' id="' + id + '"' : '') + '>' + fs.readFileSync(path.join(root, asset), 'utf8') + '</style>')
    .replace('<script src="/assets/stewaro-home-de.js?v=1"></script>',
      () => '<script>' + fs.readFileSync(path.join(root, 'assets/stewaro-home-de.js'), 'utf8') + '</script>');
  return html;
}
export function readFileSync(file, options) {
  const value = fs.readFileSync(file, options);
  const filePath = file instanceof URL ? fileURLToPath(file) : String(file);
  return typeof value === 'string' && filePath.endsWith('.html') ? effectiveHtmlSource(value) : value;
}
export const { existsSync, statSync } = fs;
export default { ...fs, readFileSync };
