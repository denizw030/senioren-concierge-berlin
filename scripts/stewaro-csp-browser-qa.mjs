import fs from 'node:fs';
import assert from 'node:assert/strict';

const cdp = `http://127.0.0.1:${process.env.CDP_PORT}`;
const targets = Object.keys(JSON.parse(fs.readFileSync('tests/fixtures/stewaro-csp-original-hashes.json', 'utf8')));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function connect() {
  const target = await (await fetch(cdp + '/json/new?about:blank', { method: 'PUT' })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
  let seq = 0;
  const pending = new Map();
  const exceptions = [];
  ws.addEventListener('message', event => {
    const message = JSON.parse(String(event.data));
    if (message.id && pending.has(message.id)) {
      const item = pending.get(message.id); pending.delete(message.id);
      message.error ? item.reject(Error(message.error.message)) : item.resolve(message.result || {});
    }
    if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw Error(result.exceptionDetails.text);
    return result.result.value;
  };
  await send('Page.enable'); await send('Runtime.enable');
  return { send, evaluate, exceptions, close: () => ws.close() };
}

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  for (const page of targets) {
    const samples = [];
    for (const [port, selector] of [[8766, '[style]'], [8765, '[data-stewaro-csp-style]']]) {
      const browser = await connect();
      await browser.send('Emulation.setDeviceMetricsOverride', { ...viewport, mobile: viewport.width < 600, deviceScaleFactor: 1 });
      // This fixture compares the CSS cascade without inventing any authenticated session.
      await browser.send('Emulation.setScriptExecutionDisabled', { value: true });
      await browser.send('Page.navigate', { url: `http://127.0.0.1:${port}/${page}` });
      for (let i = 0; i < 100; i++) { if (await browser.evaluate('document.readyState') === 'complete') break; await sleep(100); }
      const sample = await browser.evaluate(`(() => {
        const elements = [...document.querySelectorAll(${JSON.stringify(selector)})];
        return elements.map(element => ({ tag: element.tagName, id: element.id, computed: Object.fromEntries([...getComputedStyle(element)].map(property => [property, getComputedStyle(element).getPropertyValue(property)])) }));
      })()`);
      samples.push(sample); browser.close();
    }
    // Computed CSS includes URLs, which intentionally point to different fixture origins.
    const normalize = value => JSON.parse(JSON.stringify(value).replaceAll('127.0.0.1:8766', '127.0.0.1:8765'));
    assert.deepEqual(normalize(samples[1]), normalize(samples[0]), `CSS cascade parity: ${page} ${viewport.width}`);
    console.log('STEWARO_CSP_CSS_PARITY_GREEN', page, viewport.width, samples[0].length);
  }
}

for (const page of ['zugang.html', 'anmelden.html', 'registrieren.html', 'web-concierge.html', 'konto.html', 'app-live.html']) {
  const errors = [];
  for (const port of [8766, 8765]) {
    const browser = await connect();
    await browser.send('Page.navigate', { url: `http://127.0.0.1:${port}/${page}` });
    await sleep(1500);
    const body = await browser.evaluate('document.body?.innerText?.trim() || ""');
    assert.ok(body.length > 0, `Anonymous ${page} must render`);
    assert.ok(!browser.exceptions.some(value => /SyntaxError/.test(value)), `Anonymous ${page}: syntax failure`);
    errors.push(browser.exceptions.map(value => value.replace(/http:\/\/127\.0\.0\.1:\d+/g, 'FIXTURE').replace(/stewaro-csp-[^\s:]+\.js/g, 'INLINE_RUNTIME').split('\n')[0]).sort());
    browser.close();
  }
  assert.deepEqual(errors[1], errors[0], `Anonymous runtime parity: ${page}`);
  console.log('STEWARO_CSP_ANONYMOUS_RUNTIME_GREEN', page);
}
console.log('STEWARO_CSP_ANONYMOUS_BROWSER_GREEN');
