from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEGAL = [
    'impressum.html','datenschutz.html','agb.html','widerruf.html',
    'ki-transparenz.html','datenloeschung.html','vertrag-widerrufen.html'
]


def write_if_changed(path: Path, text: str) -> bool:
    old = path.read_text(encoding='utf-8')
    if old == text:
        return False
    path.write_text(text, encoding='utf-8')
    print(f'updated {path.relative_to(ROOT)}')
    return True


def patch_auth_i18n() -> bool:
    path = ROOT / 'assets/auth-i18n.js'
    text = path.read_text(encoding='utf-8')
    old = "    'konto.html','payg.html','web-concierge.html','concierge-anpassen.html'\n  ]);"
    new = "    'konto.html','payg.html','web-concierge.html','concierge-anpassen.html','zugang-uebertragen.html',\n    'impressum.html','datenschutz.html','agb.html','widerruf.html','ki-transparenz.html',\n    'datenloeschung.html','vertrag-widerrufen.html'\n  ]);"
    if new not in text:
        if old not in text:
            raise SystemExit('auth-i18n APP_PAGES anchor missing')
        text = text.replace(old, new, 1)
    return write_if_changed(path, text)


def patch_app_switcher() -> bool:
    path = ROOT / 'assets/app-language-switcher.js'
    text = path.read_text(encoding='utf-8')
    old = "  const PAGES = new Set(['registrieren.html','anmelden.html','erster-schritt.html']);"
    new = "  const PAGES = new Set(['registrieren.html','anmelden.html','erster-schritt.html','passwort-zuruecksetzen.html','impressum.html','datenschutz.html','agb.html','widerruf.html','ki-transparenz.html','datenloeschung.html','vertrag-widerrufen.html']);"
    if new not in text:
        if old not in text:
            raise SystemExit('app-language-switcher PAGES anchor missing')
        text = text.replace(old, new, 1)
    return write_if_changed(path, text)


def patch_legal_page(name: str) -> bool:
    path = ROOT / name
    text = path.read_text(encoding='utf-8')
    boot = '<script src="/assets/locale-boot.js?v=1"></script>'
    runtime = '\n'.join([
        '<script src="/assets/legal-i18n.js?v=1"></script>',
        '<script src="/assets/auth-i18n.js?v=3"></script>',
        '<script src="/assets/app-language-switcher.js?v=3"></script>',
    ])
    if boot not in text:
        if '</head>' not in text:
            raise SystemExit(f'{name}: head close missing')
        text = text.replace('</head>', f'  {boot}\n</head>', 1)
    if '/assets/legal-i18n.js' not in text:
        if name == 'vertrag-widerrufen.html':
            anchor = '<script src="assets/electronic-withdrawal.js?v=1"></script>'
            if anchor not in text:
                raise SystemExit(f'{name}: withdrawal script anchor missing')
            text = text.replace(anchor, runtime + '\n  ' + anchor, 1)
        elif '<script src="assets/auth-nav.js?v=40"></script>' in text:
            text = text.replace('<script src="assets/auth-nav.js?v=40"></script>', runtime + '\n<script src="assets/auth-nav.js?v=40"></script>', 1)
        elif '</body>' in text:
            text = text.replace('</body>', runtime + '\n</body>', 1)
        else:
            raise SystemExit(f'{name}: body close missing')
    return write_if_changed(path, text)


def patch_runtime_typo() -> bool:
    path = ROOT / 'assets/legal-i18n.js'
    text = path.read_text(encoding='utf-8')
    text = text.replace('href="pakete.html">Paketler sayfasında', 'href="pakete.html">Paketler sayfasında')
    return write_if_changed(path, text)


changed = 0
changed += int(patch_auth_i18n())
changed += int(patch_app_switcher())
changed += int(patch_runtime_typo())
for page in LEGAL:
    changed += int(patch_legal_page(page))
print(f'changed={changed}')
