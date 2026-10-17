import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const target = resolve(process.argv[2] || 'tr/index.html');
const apply = process.argv.includes('--apply');
const original = readFileSync(target, 'utf8');
const pattern = /(<a\b[^>]*href=")\/angehoerige(\?source=stewaro)?("[^>]*data-entry="loved-one"[^>]*>)/g;
const links = [...original.matchAll(pattern)];
const expected = ['/angehoerige?source=stewaro', '/angehoerige', '/angehoerige?source=stewaro'];
const actual = links.map(match => '/angehoerige' + (match[2] || ''));
if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  throw new Error(`HOLD: expected exactly three known Turkish family CTAs; found ${JSON.stringify(actual)}`);
}
if (!original.includes('STEWARO’yu kendiniz için keşfedin')) {
  throw new Error('HOLD: parent Turkish self-discovery CTA drift');
}
const changed = original.replace(pattern, (_match, before, query = '', after) => before + '/tr/angehoerige' + query + after);
if (changed === original) throw new Error('HOLD: no change');
if (apply) {
  writeFileSync(target, changed, 'utf8');
  process.stdout.write('APPLIED: exactly three Turkish family links updated; run the locale regression test.\n');
} else {
  process.stdout.write('READY: exactly three Turkish family links can be updated; pass --apply after HEAD check.\n');
}
