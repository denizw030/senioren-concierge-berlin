import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pages = [
  ['index.html', 'Im Alltag', 'Einfach sagen, was gebraucht wird.', 'Unterwegs', 'Der Concierge bleibt erreichbar.'],
  ['en/index.html', 'Everyday', 'Just say what you need.', 'On the go', 'Your Concierge stays within reach.'],
  ['tr/index.html', 'Günlük hayatta', 'Neye ihtiyacınız olduğunu söylemeniz yeterli.', 'Hareket halinde', 'Concierge’iniz her zaman ulaşılabilir.'],
];

test('required existing lifestyle assets are present', () => {
  for (const asset of [
    'assets/lifestyle/woman-living-room.png',
    'assets/lifestyle/young-man-car.png',
    'assets/overview-lifestyle.css',
  ]) assert.ok(fs.existsSync(path.join(root, asset)), `missing ${asset}`);
});

test('DE EN TR overview pages use the same two lifestyle assets and shared CSS', () => {
  for (const [file, homeKicker, homeTitle, roadKicker, roadTitle] of pages) {
    const html = read(file);
    assert.match(html, /\/assets\/overview-lifestyle\.css\?v=1/, `${file}: missing shared lifestyle CSS`);
    assert.equal((html.match(/\/assets\/lifestyle\/woman-living-room\.png/g) || []).length, 1, `${file}: woman image must appear exactly once`);
    assert.equal((html.match(/\/assets\/lifestyle\/young-man-car\.png/g) || []).length, 1, `${file}: car image must appear exactly once`);
    assert.equal((html.match(/data-nw-overview-lifestyle="home"/g) || []).length, 1, `${file}: home story must appear once`);
    assert.equal((html.match(/data-nw-overview-lifestyle="road"/g) || []).length, 1, `${file}: road story must appear once`);
    for (const marker of [homeKicker, homeTitle, roadKicker, roadTitle]) assert.ok(html.includes(marker), `${file}: missing ${marker}`);
    assert.ok(html.indexOf('data-nw-overview-lifestyle="home"') > html.indexOf('id="demo"'), `${file}: home story must follow demo`);
    assert.ok(html.indexOf('data-nw-overview-lifestyle="home"') < html.indexOf('id="safety"'), `${file}: home story must precede Safety`);
    assert.ok(html.indexOf('data-nw-overview-lifestyle="road"') > html.indexOf('id="safety"'), `${file}: road story must follow Safety`);
    assert.ok(html.indexOf('data-nw-overview-lifestyle="road"') < html.indexOf('id="family"'), `${file}: road story must precede Family`);
  }
});

test('lifestyle sections are responsive and restrained', () => {
  const css = read('assets/overview-lifestyle.css');
  assert.match(css, /grid-template-columns:\s*minmax\(0, 0\.96fr\) minmax\(0, 1\.04fr\)/);
  assert.match(css, /aspect-ratio:\s*3 \/ 2/);
  assert.match(css, /max-width:\s*720px/);
  assert.match(css, /object-fit:\s*cover/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /grid-template-columns:\s*1fr/);
});

test('lifestyle images are lazy-loaded with fixed intrinsic dimensions', () => {
  for (const [file] of pages) {
    const html = read(file);
    for (const src of ['woman-living-room.png', 'young-man-car.png']) {
      const pattern = new RegExp(`<img[\\s\\S]*?src="/assets/lifestyle/${src.replace('.', '\\.') }"[\\s\\S]*?width="1536"[\\s\\S]*?height="1024"[\\s\\S]*?loading="lazy"`, 'm');
      assert.match(html, pattern, `${file}: ${src} must be dimensioned and lazy-loaded`);
    }
  }
});
