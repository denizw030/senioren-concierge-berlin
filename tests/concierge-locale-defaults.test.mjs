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
    if (!html.includes('data-concierge-carousel')) continue;
    const defaultsAt = html.indexOf('/assets/concierge-locale-defaults.js?v=1');
    const carouselAt = html.indexOf('/assets/concierge-carousel.js');
    assert.ok(defaultsAt >= 0, `${path.relative(root, full)} is missing locale defaults runtime`);
    assert.ok(carouselAt >= 0 && defaultsAt < carouselAt, `${path.relative(root, full)} loads locale defaults too late`);
  }
});

test('localized source markup is pinned to the requested concierge', () => {
  for (const [dir, key] of [['en', 'lukas'], ['tr', 'leyla']]) {
    for (const file of fs.readdirSync(path.join(root, dir)).filter(name => name.endsWith('.html'))) {
      const html = read(`${dir}/${file}`);
      if (!html.includes('data-concierge-carousel')) continue;
      const selections = [...html.matchAll(/data-selected=["']([^"']+)["']/g)].map(match => match[1]);
      assert.ok(selections.length > 0, `${dir}/${file} has no selected concierge`);
      assert.ok(selections.every(value => value === key), `${dir}/${file} is not pinned to ${key}`);
    }
  }
});
