import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DOMAIN = 'https://nahwerkconcierge.com';
const MARKER = 'NAHWERK CLEAN ROUTES + FLOATING CONCIERGE 2026-09-16';

const read = (p) => fs.readFileSync(path.join(ROOT,p),'utf8');
const write = (p,c) => { const f=path.join(ROOT,p); fs.mkdirSync(path.dirname(f),{recursive:true}); fs.writeFileSync(f,c); };
const exists = (p) => fs.existsSync(path.join(ROOT,p));
const assertReplace = (src, from, to, label) => {
  if (!src.includes(from)) throw new Error(`Expected source not found: ${label}`);
  return src.replace(from,to);
};

function cleanInternalUrl(raw, locale='') {
  if (!raw || /^(?:#|mailto:|tel:|javascript:|data:)/i.test(raw)) return raw;
  let url;
  try {
    const base = `${DOMAIN}/${locale ? locale + '/' : ''}`;
    url = new URL(raw, base);
  } catch (_) { return raw; }
  if (url.origin !== DOMAIN || url.pathname.startsWith('/oauth/')) return raw;
  if (/\/index\.html$/i.test(url.pathname)) {
    url.pathname = url.pathname.replace(/\/index\.html$/i,'/');
  } else if (/\.html$/i.test(url.pathname)) {
    url.pathname = url.pathname.replace(/\.html$/i,'');
  } else return raw;
  if (url.pathname === '/') url.pathname = '/de/';
  return `${url.pathname}${url.search}${url.hash}`;
}

function rewriteHtml(content, locale='') {
  const attrPattern = /\b(href|action|data-plan-url)=(['"])([^'"]+)\2/gi;
  content = content.replace(attrPattern, (m,attr,q,value) => `${attr}=${q}${cleanInternalUrl(value,locale)}${q}`);
  content = content.replace(/(<link\b[^>]*\brel=(['"])canonical\2[^>]*\bhref=)(['"])([^'"]+)\3/gi,
    (m,prefix,q1,q2,value) => `${prefix}${q2}${cleanInternalUrl(value,locale)}${q2}`);
  content = content.replace(/(<meta\b[^>]*\bproperty=(['"])og:url\2[^>]*\bcontent=)(['"])([^'"]+)\3/gi,
    (m,prefix,q1,q2,value) => `${prefix}${q2}${cleanInternalUrl(value,locale)}${q2}`);
  content = content.replace(/((?:window\.)?location\.href\s*=\s*)(['"])([^'"]+\.html(?:[?#][^'"]*)?)\2/gi,
    (m,prefix,q,value) => `${prefix}${q}${cleanInternalUrl(value,locale)}${q}`);
  content = content.replace(/((?:window\.)?location\.replace\(\s*)(['"])([^'"]+\.html(?:[?#][^'"]*)?)\2/gi,
    (m,prefix,q,value) => `${prefix}${q}${cleanInternalUrl(value,locale)}${q}`);
  return content;
}

function ensureBase(content, href='/') {
  if (/<base\b/i.test(content)) return content;
  return content.replace(/<head(\s[^>]*)?>/i, (m) => `${m}<base href="${href}">`);
}

function legacyRedirect(target) {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><link rel="canonical" href="${DOMAIN}${target.replace(/\/$/,'')}"><title>Weiterleitung | NAHWERK</title><script>location.replace(${JSON.stringify(target)}+location.search+location.hash)</script><noscript><meta http-equiv="refresh" content="0;url=${target}"></noscript></head><body></body></html>`;
}

// 1) Auth routing: clean and legacy paths resolve to the same canonical page name.
let auth = read('assets/auth-nav.js');
auth = assertReplace(
  auth,
  '  const page = () => location.pathname.split("/").pop() || "index.html";',
  `  const page = () => {\n    const pathname = String(location.pathname || "/").replace(/\\/+$/, "");\n    const last = pathname.split("/").filter(Boolean).pop() || "index";\n    if (last === "de" || last === "en" || last === "tr" || last === "index") return "index.html";\n    return last.endsWith(".html") ? last : last + ".html";\n  };`,
  'auth page normalizer'
);
auth = auth.replace('link.href = "konto.html";', 'link.href = "/konto";');
auth = auth.replace('location.href = "index.html";', 'location.href = "/de/";');
auth = auth.replace('brand.href = "index.html";', 'brand.href = "/de/";');
auth = auth.replace('const NAV = [["index.html", "Übersicht"], ["prime-concierge.html", "Persönlicher Concierge"], ["concierges.html", "NAHWERK weltweit"], ["senioren-concierge.html", "Senioren Concierge"], ["senioren-concierge.html#angehoerige", "Für Angehörige"], ["leistungen.html", "Leistungen"], ["kontakt.html", "Kontakt"]];', 'const NAV = [["/de/", "Übersicht"], ["/prime-concierge", "Persönlicher Concierge"], ["/concierges", "NAHWERK weltweit"], ["/senioren-concierge", "Senioren Concierge"], ["/senioren-concierge#angehoerige", "Für Angehörige"], ["/leistungen", "Leistungen"], ["/kontakt", "Kontakt"]];');
auth = auth.replace('makeLink(`anmelden.html${suffix}`', 'makeLink(`/anmelden${suffix}`');
auth = auth.replace('makeLink(`registrieren.html${suffix}`', 'makeLink(`/registrieren${suffix}`');
auth = auth.replace("document.querySelectorAll('.footer a[href=\"anmelden.html\"],.footer a[href=\"registrieren.html\"]')", "document.querySelectorAll('.footer a[href=\"anmelden.html\"],.footer a[href=\"/anmelden\"],.footer a[href=\"registrieren.html\"],.footer a[href=\"/registrieren\"]')");
auth = auth.replace("!box.querySelector('a[href=\"konto.html\"]')", "!box.querySelector('a[href=\"konto.html\"],a[href=\"/konto\"]')");
auth = auth.replace('box.appendChild(makeLink("konto.html", "Kundenbereich"));', 'box.appendChild(makeLink("/konto", "Kundenbereich"));');
auth = auth.replace('location.replace("konto.html")', 'location.replace("/konto")');
auth = auth.replace('location.replace("anmelden.html")', 'location.replace("/anmelden")');
auth = auth.replace("document.querySelectorAll('[href^=\"registrieren.html\"]')", "document.querySelectorAll('[href^=\"registrieren.html\"],[href^=\"/registrieren\"]')");
auth = auth.replace('link.setAttribute("href", `${url.pathname.split("/").pop()}?${url.searchParams.toString()}`);', 'link.setAttribute("href", `/registrieren?${url.searchParams.toString()}`);');

if (!auth.includes(MARKER)) {
  auth = auth.replace('  document.addEventListener("DOMContentLoaded", async () => {', `  // ${MARKER}\n  const FLOATING_CONCIERGE_EXCLUDE = new Set(["web-concierge.html", "anmelden.html", "registrieren.html", "passwort-zuruecksetzen.html"]);\n  function removeFloatingConcierge() {\n    document.getElementById("nwFloatingConcierge")?.remove();\n  }\n  function ensureFloatingConcierge() {\n    removeFloatingConcierge();\n    if (!isLoggedIn() || FLOATING_CONCIERGE_EXCLUDE.has(page())) return;\n    const link = document.createElement("a");\n    link.id = "nwFloatingConcierge";\n    link.className = "nw-floating-concierge";\n    link.href = "/web-concierge";\n    link.setAttribute("aria-label", "Persönlichen NAHWERK Concierge öffnen");\n    link.innerHTML = '<span class="nw-floating-concierge-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 6.8A2.8 2.8 0 0 1 7.8 4h8.4A2.8 2.8 0 0 1 19 6.8v5.9a2.8 2.8 0 0 1-2.8 2.8h-4.7L7 19v-3.5A2.8 2.8 0 0 1 5 12.8Z"></path><path d="M9 9h6M9 12h4"></path></svg></span><span>Concierge</span>';\n    document.body.appendChild(link);\n  }\n\n  document.addEventListener("DOMContentLoaded", async () => {`);
  auth = auth.replace('    if (valid) {\n      updateNav();', '    if (valid) {\n      updateNav();\n      ensureFloatingConcierge();');
  auth = auth.replace('    } else {\n      normalizeShell();', '    } else {\n      removeFloatingConcierge();\n      normalizeShell();');
}
write('assets/auth-nav.js', auth);

// 2) Shared UI route recognition must work on both /foo and /foo.html.
let siteUi = read('assets/site-ui.js');
siteUi = siteUi.replace("const isCustomerAccount = /(?:^|\\/)konto\\.html$/.test(location.pathname);", "const isCustomerAccount = /(?:^|\\/)konto(?:\\.html)?\\/?$/.test(location.pathname);");
siteUi = siteUi.replace("const isProdCustomerSurface = /(?:^|\\/)(?:konto|payg|web-concierge)\\.html$/.test(location.pathname);", "const isProdCustomerSurface = /(?:^|\\/)(?:konto|payg|web-concierge)(?:\\.html)?\\/?$/.test(location.pathname);");
siteUi = siteUi.replace(/\/\(\?:\^\|\\\/\)anmelden\\\.html\$/g, '/(?:^|\\/)anmelden(?:\\.html)?\\/?$');
siteUi = siteUi.replace('payg.href = "payg.html";', 'payg.href = "/payg";');
siteUi = siteUi.replace('concierge.href = "web-concierge.html";', 'concierge.href = "/web-concierge";');
write('assets/site-ui.js', siteUi);

// 3) Early product/language boot stays authoritative; clean cosmetic URL after auth has consumed the route.
let localeBoot = read('assets/locale-boot.js');
localeBoot = localeBoot.replace("const isLoginPage = /(?:^|\\/)anmelden\\.html$/.test(location.pathname);", "const isLoginPage = /(?:^|\\/)anmelden(?:\\.html)?\\/?$/.test(location.pathname);");
if (!localeBoot.includes(MARKER)) {
  const addon = `\n\n(() => {\n  'use strict';\n  // ${MARKER}\n  const SECURITY_PATH = /^\\/oauth\\//i;\n  const COSMETIC_PARAMS = ['produkt','product','lang'];\n  const cleanPath = (pathname) => {\n    if (SECURITY_PATH.test(pathname)) return pathname;\n    if (/\\/index\\.html$/i.test(pathname)) return pathname.replace(/\\/index\\.html$/i,'/');\n    if (/\\.html$/i.test(pathname)) return pathname.replace(/\\.html$/i,'');\n    if (/^\\/(?:de|en|tr)\\/$/i.test(pathname)) return pathname;\n    if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0,-1);\n    return pathname;\n  };\n  const cleanInternal = (raw) => {\n    if (!raw || /^(?:#|mailto:|tel:|javascript:|data:)/i.test(raw)) return raw;\n    let url;\n    try { url = new URL(raw, location.href); } catch (_) { return raw; }\n    if (url.origin !== location.origin || SECURITY_PATH.test(url.pathname)) return raw;\n    const next = cleanPath(url.pathname);\n    if (next === url.pathname) return raw;\n    url.pathname = next;\n    return url.pathname + url.search + url.hash;\n  };\n  const rewriteLinks = (root=document) => {\n    root.querySelectorAll?.('a[href],form[action],[data-plan-url]').forEach((el) => {\n      ['href','action','data-plan-url'].forEach((attr) => {\n        if (!el.hasAttribute(attr)) return;\n        const raw = el.getAttribute(attr);\n        const next = cleanInternal(raw);\n        if (next !== raw) el.setAttribute(attr,next);\n      });\n    });\n  };\n  const cleanAddress = () => {\n    if (SECURITY_PATH.test(location.pathname)) return;\n    const url = new URL(location.href);\n    url.pathname = cleanPath(url.pathname);\n    COSMETIC_PARAMS.forEach((key) => url.searchParams.delete(key));\n    const next = url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : '') + url.hash;\n    const current = location.pathname + location.search + location.hash;\n    if (next !== current) history.replaceState(history.state,'',next);\n  };\n  const install = () => {\n    rewriteLinks();\n    cleanAddress();\n    if (document.documentElement.dataset.nwCleanRouteObserver === '1') return;\n    document.documentElement.dataset.nwCleanRouteObserver = '1';\n    new MutationObserver((mutations) => mutations.forEach((m) => m.addedNodes.forEach((node) => {\n      if (node.nodeType === Node.ELEMENT_NODE) rewriteLinks(node);\n    }))).observe(document.body,{childList:true,subtree:true});\n  };\n  const afterAuth = () => {\n    const auth = window.SCBAuth;\n    if (auth?.validateSession) Promise.resolve(auth.validateSession()).finally(() => setTimeout(install,0));\n    else setTimeout(install,0);\n  };\n  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',afterAuth,{once:true});\n  else afterAuth();\n})();\n`;
  localeBoot += addon;
}
write('assets/locale-boot.js', localeBoot);

// 4) Black footer on dark surfaces + floating concierge presentation.
let css = read('assets/site.css');
css = css.replace('.footer {\n  background: #020202 !important;', '.footer {\n  background: #000 !important;');
if (!css.includes(MARKER)) css += `\n\n/* ${MARKER} */\nbody:not(.nw-portal-light) .footer{background:#000!important}\n.nw-floating-concierge{position:fixed;z-index:46;right:max(18px,env(safe-area-inset-right));bottom:max(18px,env(safe-area-inset-bottom));display:inline-flex;align-items:center;gap:9px;min-height:46px;padding:9px 14px 9px 10px;border:1px solid rgba(218,187,112,.24);border-radius:999px;background:rgba(5,6,8,.88);color:#f4f2ec!important;box-shadow:0 14px 40px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.05);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);font-size:13px;font-weight:700;letter-spacing:-.01em;text-decoration:none!important;transition:transform .18s ease,border-color .18s ease,background .18s ease}\n.nw-floating-concierge:hover{transform:translateY(-1px);border-color:rgba(218,187,112,.46);background:rgba(10,11,14,.94)}\n.nw-floating-concierge:focus-visible{outline:2px solid #e4c477!important;outline-offset:3px!important}\n.nw-floating-concierge-icon{display:grid;place-items:center;width:29px;height:29px;border-radius:50%;background:rgba(214,182,107,.1);color:#e3c474}\n.nw-floating-concierge-icon svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}\nbody.nw-portal-light .nw-floating-concierge,body.senior-product .nw-floating-concierge{border-color:rgba(112,87,39,.18);background:rgba(250,247,240,.92);color:#2c2922!important;box-shadow:0 12px 34px rgba(70,53,24,.14),inset 0 1px 0 rgba(255,255,255,.7)}\n@media(max-width:620px){.nw-floating-concierge{right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));min-height:44px;padding:8px 12px 8px 9px}.nw-floating-concierge-icon{width:28px;height:28px}}\n`;
write('assets/site.css', css);

// 5) Source-visible links/canonicals: clean root + localized customer pages.
const protectedSkip = new Set(['404.html','index.html','konto.html','datenschutz.html']);
const rootHtml = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html') && !protectedSkip.has(f));
for (const file of rootHtml) write(file, rewriteHtml(read(file),''));
for (const locale of ['en','tr']) {
  const dir = path.join(ROOT,locale);
  if (!fs.existsSync(dir)) continue;
  for (const file of fs.readdirSync(dir).filter((f)=>f.endsWith('.html') && f !== 'index.html')) {
    write(`${locale}/${file}`, rewriteHtml(read(`${locale}/${file}`),locale));
  }
}
// Existing Google verification/legal routes: only navigation URLs are normalized; legal text is preserved.
for (const legal of ['datenschutz/index.html','nutzungsbedingungen/index.html']) {
  if (exists(legal)) write(legal, rewriteHtml(read(legal),''));
}
// Old privacy .html must land on the Google-ready canonical privacy page.
write('datenschutz.html', legacyRedirect('/datenschutz/'));

// 6) Canonical GitHub Pages routes are full index pages, not 404 tricks or shadow chat pages.
function makeCanonicalCopy(source, dest, locale='') {
  let html = rewriteHtml(read(source),locale);
  html = ensureBase(html, locale ? `/${locale}/` : '/');
  write(dest,html);
}
for (const file of fs.readdirSync(ROOT).filter((f)=>f.endsWith('.html'))) {
  if (['404.html','index.html','datenschutz.html','voice-audition.html'].includes(file)) continue;
  const slug = file.replace(/\.html$/,'');
  makeCanonicalCopy(file,`${slug}/index.html`,'');
}
for (const locale of ['en','tr']) {
  const dir = path.join(ROOT,locale);
  if (!fs.existsSync(dir)) continue;
  for (const file of fs.readdirSync(dir).filter((f)=>f.endsWith('.html') && f !== 'index.html')) {
    const slug=file.replace(/\.html$/,'');
    makeCanonicalCopy(`${locale}/${file}`,`${locale}/${slug}/index.html`,locale);
  }
}

// 7) Sitemap: clean public URLs only, plus Google legal terms route.
let sitemap = read('sitemap.xml').replace(/\.html(?=<\/loc>)/g,'');
if (!sitemap.includes(`${DOMAIN}/datenschutz/`)) {
  sitemap = sitemap.replace('</urlset>',`  <url><loc>${DOMAIN}/datenschutz/</loc></url>\n</urlset>`);
}
if (!sitemap.includes(`${DOMAIN}/nutzungsbedingungen/`)) {
  sitemap = sitemap.replace('</urlset>',`  <url><loc>${DOMAIN}/nutzungsbedingungen/</loc></url>\n</urlset>`);
}
write('sitemap.xml',sitemap);

// 8) Static contract test for this scope.
const test = `import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport fs from 'node:fs';\n\nconst read=(p)=>fs.readFileSync(p,'utf8');\nconst auth=read('assets/auth-nav.js');\nconst boot=read('assets/locale-boot.js');\nconst css=read('assets/site.css');\nconst sitemap=read('sitemap.xml');\n\ntest('auth recognizes clean and legacy customer routes',()=>{\n  assert.match(auth,/last\\.endsWith\\(\\\"\\.html\\\"\\) \\? last : last \\+ \\"\\.html\\\"/);\n  assert.match(auth,/const PROTECTED = new Set\\(\\[\\\"konto\\.html\\\", \\"concierge-anpassen\\.html\\\"\\]\\)/);\n});\n\ntest('floating concierge is fail-closed behind server validation',()=>{\n  assert.match(auth,/const valid = await validateSession\\(\\)/);\n  assert.match(auth,/if \\(valid\\) \\{[\\s\\S]*ensureFloatingConcierge\\(\\)/);\n  assert.match(auth,/if \\(!isLoggedIn\\(\\) \\|\\| FLOATING_CONCIERGE_EXCLUDE/);\n  assert.match(auth,/href = \\"\\/web-concierge\\\"/);\n  assert.doesNotMatch(auth,/web-concierge-chat\\.js/);\n});\n\ntest('clean URL runtime preserves security callbacks and removes only cosmetic params',()=>{\n  assert.match(boot,/SECURITY_PATH = \/\\^\\\\\\/oauth/);\n  assert.match(boot,/COSMETIC_PARAMS = \\['produkt','product','lang'\\]/);\n  assert.match(boot,/auth\\?\\.validateSession/);\n});\n\ntest('clean GitHub Pages routes are real index files',()=>{\n  for (const p of ['anmelden/index.html','impressum/index.html','agb/index.html','widerruf/index.html','konto/index.html','kontakt/index.html','leistungen/index.html','web-concierge/index.html','datenschutz/index.html','nutzungsbedingungen/index.html']) assert.equal(fs.existsSync(p),true,p);\n});\n\ntest('public sitemap and key canonicals contain no html suffixes',()=>{\n  assert.doesNotMatch(sitemap,/\\.html<\\/loc>/);\n  for (const p of ['anmelden/index.html','impressum/index.html','agb/index.html','widerruf/index.html','kontakt/index.html','leistungen/index.html']) {\n    const html=read(p);\n    const canonical=html.match(/<link[^>]+rel=[\\\"']canonical[\\\"'][^>]+href=[\\\"']([^\\\"']+)/i)?.[1] || '';\n    assert.ok(canonical && !canonical.includes('.html'),p);\n  }\n});\n\ntest('dark footer is deep black and floating button has mobile safe-area',()=>{\n  assert.match(css,/body:not\\(\\.nw-portal-light\\) \\.footer\\{background:#000!important\\}/);\n  assert.match(css,/env\\(safe-area-inset-right\\)/);\n  assert.match(css,/env\\(safe-area-inset-bottom\\)/);\n});\n\ntest('legacy privacy url forwards to Google-ready privacy route',()=>{\n  assert.match(read('datenschutz.html'),/location\\.replace\\(\\\"\\/datenschutz\\/\\\"/);\n  assert.match(read('datenschutz/index.html'),/Google-\\/Gmail-Daten \\(OAuth\\)/);\n});\n`;
write('tests/web-clean-routes-floating.test.mjs',test);

// 9) Scope guard: no OAuth callback/Gmail runtime/account-theme files are changed by this script.
const forbidden = [
  'oauth/google/callback/index.html',
  'assets/account-premium-ui.css',
  'assets/account-premium-ui-base-v2.css'
];
for (const p of forbidden) if (!exists(p) && p !== 'assets/account-premium-ui-base-v2.css') throw new Error(`Required protected file missing: ${p}`);

console.log('NAHWERK clean URLs + floating concierge transformation complete.');
