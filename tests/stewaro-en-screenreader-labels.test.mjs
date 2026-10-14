import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../en/index.html', import.meta.url), 'utf8');
const labels = [...html.matchAll(/\baria-label="([^"]+)"/g)].map(match => match[1]);

test('English STEWARO homepage has English navigation landmarks', () => {
  assert.match(html, /<html[^>]+lang="en"/);
  for (const label of ['STEWARO navigation', 'Main navigation', 'Legal information']) {
    assert.ok(labels.includes(label), 'missing accessible label: ' + label);
  }
  assert.equal(labels.filter(label => label === 'STEWARO home').length, 2);
});

test('English STEWARO steps and flow are announced in English', () => {
  assert.ok(labels.includes('In three simple steps'));
  assert.ok(labels.includes('How it works'));
  for (const label of ['STEWARO Startseite', 'Hauptnavigation', 'In drei einfachen Schritten', 'Ablauf', 'Rechtliches']) {
    assert.ok(!labels.includes(label), 'German label in English homepage: ' + label);
  }
});
