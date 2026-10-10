import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('privacy notice publishes the STEWARO controller identity from the current imprint', () => {
  const privacy = read('datenschutz/index.html');
  assert.match(privacy, /<h2>1\. Verantwortlicher<\/h2>/);
  assert.match(privacy, /<strong>STEWARO<\/strong>/);
  assert.match(privacy, /Deniz Wannenmacher/);
  assert.match(privacy, /Osdorfer Straße 108/);
  assert.match(privacy, /12207 Berlin/);
  assert.match(privacy, /dw@stewaro\.com/);
  assert.doesNotMatch(privacy, /aria-label="Kontaktdaten des Verantwortlichen"/);
});

test('pricing page marks Preise as the current canonical navigation item', () => {
  const pricing = read('pakete.html');
  assert.match(pricing, /<a class="active" href="\/pakete" aria-current="page">Preise<\/a>/);
  assert.doesNotMatch(pricing, /<a class="active" href="(?:\/)?leistungen(?:\.html)?">Leistungen<\/a>/);
  assert.doesNotMatch(pricing, />Tarife<\/a>/);
});

test('launch-readiness cleanup does not change frozen public prices or FREE quotas', () => {
  const pricing = read('pakete.html');
  for (const expected of ['0 €', '5,99 €', '10,99 €', '19,99 €', '34,99 €', '59,66 €']) {
    assert.ok(pricing.includes(expected), `missing frozen price ${expected}`);
  }
  assert.ok(pricing.includes('App unbegrenzt · Web unbegrenzt · 20 WhatsApp-Nachrichten'));
});

test('homepage Safety copy is bound to configured escalation behavior', () => {
  const home = read('de/index.html');
  assert.doesNotMatch(home, /startet sofort die vereinbarte Sicherheitskette/);
  assert.match(home, /kann die zuvor eingerichtete Sicherheitskette nach den festgelegten Regeln beginnen/);
});


test('pricing page presents FIDEL instead of legacy persona selection', () => {
  const pricing = read('pakete.html');
  assert.match(pricing, /Alle Pakete nutzen denselben persönlichen Concierge FIDEL/);
  assert.doesNotMatch(pricing, /Persönlichen Concierge wählen|Telefonannahme Standalone|spezialisierter Telefonagent/);
  assert.doesNotMatch(pricing, /Kunden(?:nachrichten|bereich|konto)/);
});

test('launch legal hub keeps STEWARO as brand and FIDEL as KI-Concierge', () => {
  const privacy = read('datenschutz/index.html');
  const about = read('ueber-mich.html');
  assert.match(privacy, /Datenschutz \| STEWARO & FIDEL/);
  assert.match(about, /STEWARO ist die Marke\. FIDEL ist der KI-Concierge\./);
  assert.doesNotMatch(about, /NAHWERK|Nahwerk|Hartmut|Alexander|Nilo|Mira/);
});
