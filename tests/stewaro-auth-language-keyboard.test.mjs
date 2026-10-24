import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('assets/app-language-switcher.js', 'utf8');
const begin = source.indexOf('  const createSwitcher = () => {');
const end = source.indexOf('  const pinToToggle =', begin);
assert.ok(begin >= 0 && end > begin);
const createFactory = new Function('SUPPORTED', 'detectLang', 'hrefFor', 'document', 'localStorage', 'location', source.slice(begin, end) + '; return createSwitcher;');

class Element {
  constructor(tag, doc) {
    this.tag = tag;
    this.doc = doc;
    this.children = [];
    this.listeners = {};
    this.dataset = {};
    this.attributes = {};
    this.classes = new Set();
    this.classList = {
      add: key => this.classes.add(key),
      remove: key => this.classes.delete(key),
      contains: key => this.classes.has(key),
      toggle: (key, force) => {
        const active = force === undefined ? !this.classes.has(key) : force;
        if (active) this.classes.add(key);
        else this.classes.delete(key);
        return active;
      }
    };
  }
  setAttribute(key, value) { this.attributes[key] = value; }
  appendChild(child) { this.children.push(child); child.parent = this; }
  append(...children) { children.forEach(child => this.appendChild(child)); }
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
  focus() { this.doc.activeElement = this; }
  contains(node) {
    for (let current = node; current; current = current.parent) if (current === this) return true;
    return false;
  }
  dispatch(type, extra = {}) {
    const event = {
      ...extra, prevented: false,
      preventDefault() { this.prevented = true; },
      stopPropagation() {}
    };
    for (const handler of this.listeners[type] || []) handler(event);
    return event;
  }
}
function fixture(lang = 'en') {
  const doc = {
    listeners: {}, activeElement: null,
    createElement(tag) { return new Element(tag, this); },
    addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); },
    dispatch(type, event) { for (const handler of this.listeners[type] || []) handler(event); }
  };
  const supported = {
    de: { code: 'DE', label: 'Deutsch', flag: '🇩🇪' },
    en: { code: 'EN', label: 'English', flag: '🇬🇧' },
    tr: { code: 'TR', label: 'Türkçe', flag: '🇹🇷' }
  };
  const navigation = [], stored = [];
  const create = createFactory(
    supported, () => lang, key => '/anmelden?lang=' + key, doc,
    { setItem: (key, value) => stored.push([key, value]) },
    { assign: value => navigation.push(value) }
  );
  const wrapper = create();
  return { doc, wrapper, button: wrapper.children[0], menu: wrapper.children[1],
    options: wrapper.children[1].children, navigation, stored };
}

test('ArrowDown opens the accessible language menu and focuses its first option', () => {
  const f = fixture();
  const event = f.button.dispatch('keydown', { key: 'ArrowDown' });
  assert.equal(event.prevented, true);
  assert.equal(f.wrapper.classList.contains('is-open'), true);
  assert.equal(f.doc.activeElement, f.options[0]);
  assert.equal(f.button.attributes['aria-expanded'], 'true');
  assert.equal(f.button.attributes['aria-controls'], f.menu.id);
  assert.equal(f.menu.attributes.role, 'menu');
});

test('ArrowUp starts at last option; arrows wrap; Home and End navigate', () => {
  const f = fixture();
  f.button.dispatch('keydown', { key: 'ArrowUp' });
  assert.equal(f.doc.activeElement, f.options[2]);
  f.menu.dispatch('keydown', { key: 'ArrowDown' });
  assert.equal(f.doc.activeElement, f.options[0]);
  f.menu.dispatch('keydown', { key: 'ArrowUp' });
  assert.equal(f.doc.activeElement, f.options[2]);
  f.menu.dispatch('keydown', { key: 'Home' });
  assert.equal(f.doc.activeElement, f.options[0]);
  f.menu.dispatch('keydown', { key: 'End' });
  assert.equal(f.doc.activeElement, f.options[2]);
});

test('pointer opening focuses the selected language; Escape returns to toggle', () => {
  const f = fixture('en');
  f.button.dispatch('click');
  assert.equal(f.doc.activeElement, f.options[1]);
  f.doc.dispatch('keydown', { key: 'Escape' });
  assert.equal(f.wrapper.classList.contains('is-open'), false);
  assert.equal(f.doc.activeElement, f.button);
  assert.equal(f.button.attributes['aria-expanded'], 'false');
});

test('leaving the menu closes it without stealing focus', () => {
  const f = fixture();
  f.button.dispatch('click');
  f.wrapper.dispatch('focusout', { relatedTarget: f.options[2] });
  assert.equal(f.wrapper.classList.contains('is-open'), true);
  f.wrapper.dispatch('focusout', { relatedTarget: null });
  assert.equal(f.wrapper.classList.contains('is-open'), false);
});

test('language selection preserves the existing same-origin navigation', () => {
  const f = fixture();
  f.button.dispatch('keydown', { key: 'ArrowDown' });
  f.options[0].dispatch('click');
  assert.equal(f.navigation[0], '/anmelden?lang=de');
  assert.equal(f.stored[0][0], 'nw_language');
  assert.equal(f.stored[0][1], 'de');
});
