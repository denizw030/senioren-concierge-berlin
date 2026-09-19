from __future__ import annotations

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
DOMAIN = "https://nahwerkconcierge.com"
EXCLUDED_TOP = {".git", ".github", "android-app", "api", "docs", "tests"}
SCRIPT_TAG = '<script src="/assets/clean-url.js?v=1"></script>'
CLEAN_SCRIPT_RE = re.compile(
    r'''\s*<script\s+src=["']/assets/clean-url\.js\?v=1["'][^>]*></script>\s*''',
    re.I,
)
LOCALE_RUNTIME_RE = re.compile(
    r'''<script\s+src=["']/assets/locale-runtime\.js\?v=\d+["'][^>]*></script>''',
    re.I,
)
LANGUAGE_SWITCHER_RE = re.compile(
    r'''<script\s+src=["']/assets/language-switcher\.js\?v=\d+["'][^>]*></script>''',
    re.I,
)

def ensure_clean_url_script(text: str) -> str:
    # Always normalize placement so DE/EN/TR keep an identical script stack.
    text = CLEAN_SCRIPT_RE.sub("\n", text)
    anchor = LOCALE_RUNTIME_RE.search(text) or LANGUAGE_SWITCHER_RE.search(text)
    if anchor:
        return text[:anchor.end()] + "\n    " + SCRIPT_TAG + text[anchor.end():]
    if "</head>" in text:
        return text.replace("</head>", f"  {SCRIPT_TAG}\n</head>", 1)
    return SCRIPT_TAG + "\n" + text

def public_html_files():
    for path in ROOT.rglob("*.html"):
        rel = path.relative_to(ROOT)
        if rel.parts and rel.parts[0] in EXCLUDED_TOP:
            continue
        yield path

def clean_route_pairs():
    pairs = []
    for legacy in public_html_files():
        if legacy.name == "index.html":
            continue
        target = legacy.with_suffix("") / "index.html"
        if target.exists():
            old = legacy.relative_to(ROOT).as_posix()
            new = target.parent.relative_to(ROOT).as_posix()
            pairs.append((old, new))
    return sorted(pairs, key=lambda item: len(item[0]), reverse=True)

PAIRS = clean_route_pairs()

def locale_home(path: Path) -> str:
    rel = path.relative_to(ROOT)
    if rel.parts and rel.parts[0] in {"en", "tr"}:
        return f"/{rel.parts[0]}/"
    return "/de/"

def clean_text(text: str, path: Path) -> str:
    for old, new in PAIRS:
        text = text.replace(f"{DOMAIN}/{old}", f"{DOMAIN}/{new}")
        text = text.replace(f"/{old}", f"/{new}")
        # Relative links are safe to clean when they name a real clean-route sibling.
        old_name = old.split("/")[-1]
        new_name = new.split("/")[-1]
        text = re.sub(
            rf'(?<![A-Za-z0-9_.-]){re.escape(old_name)}(?=([?#][^\s"\'<>]*)?["\'<>\s])',
            new_name,
            text,
        )

    text = text.replace(f"{DOMAIN}/de/index.html", f"{DOMAIN}/de/")
    text = text.replace(f"{DOMAIN}/en/index.html", f"{DOMAIN}/en/")
    text = text.replace(f"{DOMAIN}/tr/index.html", f"{DOMAIN}/tr/")
    text = text.replace(f"{DOMAIN}/index.html", f"{DOMAIN}/de/")
    text = text.replace("/de/index.html", "/de/")
    text = text.replace("/en/index.html", "/en/")
    text = text.replace("/tr/index.html", "/tr/")
    text = re.sub(
        r'(?P<attr>\b(?:href|action)\s*=\s*["\'])index\.html(?P<tail>(?:[?#][^"\']*)?["\'])',
        lambda m: f"{m.group('attr')}{locale_home(path)}{m.group('tail')}",
        text,
        flags=re.I,
    )
    return text

changed = []
for path in public_html_files():
    original = path.read_text(encoding="utf-8")
    updated = clean_text(original, path)
    if path.name != "404.html":
        updated = ensure_clean_url_script(updated)
    if updated != original:
        path.write_text(updated, encoding="utf-8")
        changed.append(path.relative_to(ROOT).as_posix())

for name in ("sitemap.xml", "robots.txt"):
    path = ROOT / name
    if path.exists():
        original = path.read_text(encoding="utf-8")
        updated = clean_text(original, path)
        if updated != original:
            path.write_text(updated, encoding="utf-8")
            changed.append(name)

# Hard guards: public discovery and customer navigation must not advertise .html URLs.
sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
if ".html" in sitemap:
    raise SystemExit("sitemap.xml still contains .html URLs")

robots = (ROOT / "robots.txt").read_text(encoding="utf-8")
if re.search(r"^Disallow:\s+\S+\.html(?:$|[?#])", robots, flags=re.M | re.I):
    raise SystemExit("robots.txt still contains .html route blocks")

url_attr = re.compile(r"""\b(?:href|action)\s*=\s*["'][^"']*\.html(?:[?#][^"']*)?["']""", re.I)
for path in public_html_files():
    if path.name == "404.html":
        continue
    html = path.read_text(encoding="utf-8")
    if url_attr.search(html):
        raise SystemExit(f"{path.relative_to(ROOT)} still contains a .html customer URL")

print(f"clean-url postprocess: {len(changed)} files updated")
