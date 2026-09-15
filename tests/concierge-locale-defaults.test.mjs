import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

test('English defaults to Lukas with English voice and Turkish defaults to Leyla with Turkish voice', () => {
  const js = read('assets/concierge-locale-defaults.js');
  assert.match(js, /en:\s*\{\s*concierge:\s*'lukas',\s*voiceLanguage:\s*'en'\s*\}/);
  assert.match(js, /tr:\s*\{\s*concierge:\s*'leyla',\s*voiceLanguage:\s*'tr'\s*\}/);
  assert.match(js, /root\.dataset\.selected\s*=\s*defaults\.concierge/);
  assert.match(js, /select\.value\s*=\s*desired/);
  assert.match(js, /dispatchEvent\(new Event\('change'/);
  assert.ok(fs.existsSync(path.join(root, 'assets/voice/samples/lukas-en.mp3')));
  assert.ok(fs.existsSync(path.join(root, 'assets/voice/samples/leyla-tr.mp3')));
});

test('every page with a concierge carousel loads locale defaults before the carousel runtime', () => {
  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
  for (const full of walk(root).filter(p => p.endsWith('.html') && !p.includes(`${path.sep}.git${path.sep}`))) {
    const html = fs.readFileSync(full, 'utf8');
    if (!html.includes('data-concierge-carousel') || !html.includes('concierge-carousel.js')) continue;
    const defaultsAt = html.indexOf('/assets/concierge-locale-defaults.js?v=1');
    const carouselAt = html.indexOf('concierge-carousel.js');
    assert.ok(defaultsAt >= 0, `${path.relative(root, full)} is missing locale defaults runtime`);
    assert.ok(carouselAt >= 0 && defaultsAt < carouselAt, `${path.relative(root, full)} loads locale defaults too late`);
  }
});

test('localized source markup uses a valid fallback while locale runtime owns the final default', () => {
  const catalog = read('assets/concierge-carousel.js');
  for (const dir of ['en', 'tr']) {
    for (const file of fs.readdirSync(path.join(root, dir)).filter(name => name.endsWith('.html'))) {
      const html = read(`${dir}/${file}`);
      if (!html.includes('data-concierge-carousel')) continue;
      const selections = [...html.matchAll(/data-selected=["']([^"']+)["']/g)].map(match => match[1]);
      assert.ok(selections.length > 0, `${dir}/${file} has no selected concierge`);
      for (const value of selections) assert.ok(catalog.includes(`["${value}",`), `${dir}/${file} has unknown concierge ${value}`);
      const defaultsAt = html.indexOf('/assets/concierge-locale-defaults.js?v=1');
      const carouselAt = html.indexOf('concierge-carousel.js');
      assert.ok(defaultsAt >= 0 && defaultsAt < carouselAt, `${dir}/${file} must let locale defaults run before carousel hydration`);
    }
  }
});
