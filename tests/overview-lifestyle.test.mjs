import { homepageSource } from './helpers/homepage-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pages = ['de/index.html', 'en/index.html', 'tr/index.html'];
const visible = html => html
  .replace(/<script[\s\S]*?<\/script>/gi,' ')
  .replace(/<style[\s\S]*?<\/style>/gi,' ')
  .replace(/<[^>]+>/g,' ')
  .replace(/\s+/g,' ')
  .trim();

test('current STEWARO homepage brand assets are present', () => {
  for (const asset of ['assets/logos/stewaro-icon.svg','assets/logos/stewaro-wordmark.svg']) {
    assert.ok(fs.existsSync(path.join(root, asset)), `missing ${asset}`);
  }
});

test('DE EN TR homepages share the new full-bleed STEWARO design', () => {
  for (const file of pages) {
    const html = homepageSource(file);
    assert.match(html, /class="site-header"/, `${file}: missing precision header`);
    assert.match(html, /class="brand-word"/, `${file}: missing STEWARO wordmark lockup`);
    assert.match(html, /\/assets\/logos\/stewaro-icon\.svg/, `${file}: missing STEWARO icon`);
    assert.match(html, /\/assets\/logos\/stewaro-wordmark\.svg/, `${file}: missing STEWARO wordmark asset`);
    assert.match(html, /class="hero-image hero-video"/, `${file}: missing full-bleed hero video`);
    assert.doesNotMatch(html, /overview-lifestyle\.css|woman-living-room\.png|young-man-car\.png/, `${file}: legacy overview lifestyle layer returned`);
  }
});

test('new homepage remains responsive and preserves reduced-motion handling', () => {
  for (const file of pages) {
    const html = homepageSource(file);
    assert.match(html, /@media\s*\(max-width:\s*980px\)/, `${file}: missing tablet layout`);
    assert.match(html, /@media\s*\(max-width:\s*600px\)/, `${file}: missing mobile layout`);
    assert.match(html, /prefers-reduced-motion:\s*reduce/, `${file}: missing reduced-motion guard`);
  }
});

test('STEWARO is the brand and FIDEL is the concierge on every locale homepage', () => {
  for (const file of pages) {
    const copy = visible(read(file));
    assert.match(copy, /STEWARO/);
    assert.match(copy, /FIDEL/);
    assert.doesNotMatch(copy, /NAHWERK|ODYSX|Hartmut|Frida|Alexander|Nilo|Mira/);
  }
});
