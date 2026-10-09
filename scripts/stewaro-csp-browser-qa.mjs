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
  const documentNavigations = [];
  ws.addEventListener('message', event => {
    const message = JSON.parse(String(event.data));
    if (message.id && pending.has(message.id)) {
      const item = pending.get(message.id); pending.delete(message.id);
      message.error ? item.reject(Error(message.error.message)) : item.resolve(message.result || {});
    }
    if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    if (message.method === 'Page.frameRequestedNavigation' && message.params?.url) documentNavigations.push(message.params.url);
    if (message.method === 'Network.requestWillBeSent' && message.params?.type === 'Document' && message.params.request?.url) documentNavigations.push(message.params.request.url);
    if (message.method === 'Fetch.requestPaused' && message.params?.request?.url?.startsWith('https://account.stewaro.com/')) {
      documentNavigations.push(message.params.request.url);
      // The fixture never accesses a real Klient login; the requested URL itself is the E2E signal.
      void send('Fetch.failRequest', { requestId: message.params.requestId, errorReason: 'Aborted' }).catch(() => {});
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw Error(result.exceptionDetails.text);
    return result.result.value;
  };
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Fetch.enable', { patterns: [{ urlPattern: 'https://account.stewaro.com/*', requestStage: 'Request' }] });
  return { send, evaluate, exceptions, documentNavigations, close: () => ws.close() };
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
    await sleep(page === 'konto.html' ? 2500 : 1500);
    const body = await browser.evaluate('document.body?.innerText?.trim() || ""');
    if (page === 'konto.html') {
      // The canonical Account split must deny anonymous portal display and
      // actually navigate to the exact HTTPS login, not merely show a blank page.
      const currentUrl = await browser.evaluate('location.href').catch(() => 'unavailable');
      assert.ok(browser.documentNavigations.includes('https://account.stewaro.com/anmelden') || currentUrl === 'https://account.stewaro.com/anmelden',
        'Anonymous konto must request canonical Account login redirect; observed=' + JSON.stringify({ currentUrl, documentNavigations: browser.documentNavigations }));
    } else {
      assert.ok(body.length > 0, `Anonymous ${page} must render`);
    }
    assert.ok(!browser.exceptions.some(value => /SyntaxError/.test(value)), `Anonymous ${page}: syntax failure`);
    errors.push(browser.exceptions.map(value => value.replace(/http:\/\/127\.0\.0\.1:\d+/g, 'FIXTURE').replace(/stewaro-csp-[^\s:]+\.js/g, 'INLINE_RUNTIME').split('\n')[0]).sort());
    browser.close();
  }
  assert.deepEqual(errors[1], errors[0], `Anonymous runtime parity: ${page}`);
  console.log('STEWARO_CSP_ANONYMOUS_RUNTIME_GREEN', page);
}
console.log('STEWARO_CSP_ANONYMOUS_BROWSER_GREEN');

let violationCount = 0;
for (const page of ['de/index.html', 'zugang.html', 'anmelden.html', 'registrieren.html', 'web-concierge.html', 'konto.html', 'app-live.html', 'impressum.html', 'kontakt.html']) {
  const browser = await connect();
  await browser.send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__stewaroCspViolations = []; document.addEventListener('securitypolicyviolation', event => window.__stewaroCspViolations.push({ directive: event.effectiveDirective, blocked: event.blockedURI, source: event.sourceFile, line: event.lineNumber }));` });
  await browser.send('Page.navigate', { url: `http://127.0.0.1:8767/${page}` });
  await sleep(1500);
  const violations = await browser.evaluate('window.__stewaroCspViolations || []');
  violationCount += violations.length;
  console.log('STEWARO_CSP_ENFORCED_FIXTURE_DIAGNOSTIC', JSON.stringify({ page, violations }));
  browser.close();
}
// A diagnostic can finish successfully while explicitly proving enforcement still blocked.
console.log('STEWARO_CSP_ENFORCEMENT_READINESS', violationCount === 0 ? 'ANONYMOUS_GREEN_AUTH_E2E_PENDING' : 'BLOCKED_RUNTIME_VIOLATIONS', violationCount);
