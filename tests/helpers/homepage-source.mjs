import fs from './effective-source-fs.mjs';

// Keep existing rendering/runtime assertions independent of inline versus external storage.
export function homepageSource(path) {
  const html = fs.readFileSync(path, 'utf8');
  return html
    .replace(/<link rel="stylesheet" href="\/(assets\/stewaro-home-de-[^"?]+\.css)\?v=1"(?: id="([^"]+)")?>/g,
      (_, asset, id) => '<style' + (id ? ' id="' + id + '"' : '') + '>' + fs.readFileSync(asset, 'utf8') + '</style>')
    .replace('<script src="/assets/stewaro-home-de.js?v=1"></script>',
      () => '<script>' + fs.readFileSync('assets/stewaro-home-de.js', 'utf8') + '</script>');
}
