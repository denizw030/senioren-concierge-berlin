import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const runtime = readFileSync(new URL('../assets/stewaro-entry-routing.js', import.meta.url), 'utf8');

function runRouting(pathname, lang) {
  const makeAnchor = (href) => ({
    raw: href,
    getAttribute(name) { return name === 'href' ? this.raw : null; },
    set href(value) { this.raw = value; },
    get href() { return this.raw; },
  });
  const links = [makeAnchor('/angehoerige?source=stewaro'), makeAnchor('/angehoerige')];
  const document = {
    readyState: 'complete',
    documentElement: { lang, dataset: {} },
    querySelectorAll(selector) { return selector === 'a[data-entry="loved-one"]' ? links : []; },
    querySelector() { return null; },
  };
  const window = { addEventListener() {} };
  const location = { pathname, hostname: 'stewaro.com', search: '' };
  class MutationObserver { observe() {} }
  vm.runInNewContext(runtime, { window, location, document, MutationObserver }, { timeout: 1000 });
  return { links, exported: window.STEWAROEntryRouting };
}

for (const [pathname, lang, familyPath] of [
  ['/tr/', 'tr', '/tr/angehoerige'],
  ['/tr/index.html', 'tr', '/tr/angehoerige'],
  ['/tr/angehoerige', 'tr', '/tr/angehoerige'],
  ['/en/', 'en', '/en/angehoerige'],
  ['/en/index.html', 'en', '/en/angehoerige'],
  ['/de/', 'de', '/angehoerige'],
  ['/', 'de', '/angehoerige'],
  ['/trick/', 'tr', '/angehoerige'],
  ['/en-us/', 'en', '/angehoerige'],
]) {
  test(`family entry runtime keeps exact locale segment: ${pathname}`, () => {
    const { links, exported } = runRouting(pathname, lang);
    assert.equal(links[0].href, familyPath + '?source=stewaro');
    assert.equal(links[1].href, familyPath);
    assert.equal(exported.parentEntry, familyPath + '?source=stewaro');
  });
}
