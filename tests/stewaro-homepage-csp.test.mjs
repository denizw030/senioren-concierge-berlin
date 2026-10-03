import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('de/index.html', 'utf8');
test('German launch homepage has no inline executable script, style or event handlers', () => {
  assert.doesNotMatch(html, /<style\b/i);
  assert.doesNotMatch(html, /<script\b(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/i);
  assert.doesNotMatch(html, /\s(?:style|on[a-z]+)\s*=/i);
});
test('Homepage CSP resources are same-origin, present and retain ordered style identities', () => {
  const links = [...html.matchAll(/<link rel="stylesheet" href="\/(assets\/stewaro-home-de-[^"?]+\.css)\?v=\d+"(?: id="([^"]+)")?>/g)];
  assert.deepEqual(links.map(x => x[2] || 'base'), [
    'base', 'stewaro-static-safety', 'stewaro-gold-brand', 'stewaro-real-gold-sphere',
    'stewaro-care-luxury-v2', 'stewaro-leaf-luxury-v1', 'stewaro-precision-fullbleed-v1'
  ]);
  for (const [, path] of links) assert.ok(fs.readFileSync(path, 'utf8').length > 0);
  const script = 'assets/stewaro-home-de.js';
  assert.match(html, /<script src="\/assets\/stewaro-home-de\.js\?v=1"><\/script>/);
  new vm.Script(fs.readFileSync(script, 'utf8'));
  assert.ok(html.indexOf('stewaro-home-de.js?v=1') > html.indexOf('</footer>'), 'runtime keeps its after-markup execution position');
});
