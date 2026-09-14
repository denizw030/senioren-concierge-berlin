from __future__ import annotations

from pathlib import Path
from html import escape, unescape
import json
import re

ROOT = Path(__file__).resolve().parents[1]
DOMAIN = "https://nahwerkconcierge.com"
PAGES = [
    "index.html", "prime-concierge.html", "safety.html", "angehoerige.html",
    "telefonannahme.html", "pakete.html", "leistungen.html", "ablauf.html",
    "faq.html", "kontakt.html", "concierges.html", "senioren-concierge.html",
    "alltag-organisieren.html", "dokumente-verstehen.html", "technik-verstehen.html", "ueber-mich.html",
]
LANGS = ("en", "tr")
SKIP_BLOCK_RE = re.compile(r"(<(?:script|style|noscript|template|svg)\b.*?</(?:script|style|noscript|template|svg)\s*>)", re.I | re.S)
COMMENT_RE = re.compile(r"<!--.*?-->", re.S)
HEAD_RE = re.compile(r"<head\b.*?</head\s*>", re.I | re.S)
TEXT_RE = re.compile(r">([^<>]+)<", re.S)
ATTR_RE = re.compile(r"\b(aria-label|title|placeholder|alt)=([\"'])(.*?)\2", re.I | re.S)


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def useful(value: str) -> bool:
    if not value or value.startswith(("{{", "${")):
        return False
    return bool(re.search(r"[A-Za-zÄÖÜäöüßÀ-ÿ]", value))


def load_catalog(lang: str) -> dict[str, str]:
    merged: dict[str, str] = {}
    base = ROOT / "locales" / f"{lang}.json"
    if base.exists():
        merged.update(json.loads(base.read_text(encoding="utf-8")))
    for path in sorted((ROOT / "locales").glob(f"{lang}-extra*.json")):
        merged.update(json.loads(path.read_text(encoding="utf-8")))
    return merged


def page_url(lang: str, page: str) -> str:
    if lang == "de":
        return f"{DOMAIN}/" if page == "index.html" else f"{DOMAIN}/{page}"
    return f"{DOMAIN}/{lang}/" if page == "index.html" else f"{DOMAIN}/{lang}/{page}"


def get_title(html: str) -> str | None:
    match = re.search(r"<title>(.*?)</title>", html, re.I | re.S)
    return unescape(clean(match.group(1))) if match else None


def get_description(html: str) -> str | None:
    tag_match = re.search(r"<meta\b[^>]*\bname=[\"']description[\"'][^>]*>", html, re.I | re.S)
    if not tag_match:
        return None
    content_match = re.search(r"\bcontent=([\"'])(.*?)\1", tag_match.group(0), re.I | re.S)
    return unescape(clean(content_match.group(2))) if content_match else None


def replace_meta_content(html: str, key_attr: str, key_value: str, value: str) -> str:
    tag_re = re.compile(r"<meta\b[^>]*\b" + re.escape(key_attr) + r"=([\"'])" + re.escape(key_value) + r"\1[^>]*>", re.I | re.S)
    match = tag_re.search(html)
    if not match:
        return html
    tag = match.group(0)
    content_re = re.compile(r"\bcontent=([\"'])(.*?)\1", re.I | re.S)
    if content_re.search(tag):
        tag2 = content_re.sub(lambda m: f'content={m.group(1)}{escape(value, quote=True)}{m.group(1)}', tag, count=1)
    else:
        tag2 = tag[:-1] + f' content="{escape(value, quote=True)}">'
    return html[:match.start()] + tag2 + html[match.end():]


def replace_canonical(html: str, canonical: str) -> str:
    tag_re = re.compile(r"<link\b[^>]*\brel=([\"'])canonical\1[^>]*>", re.I | re.S)
    match = tag_re.search(html)
    if not match:
        return html
    tag = match.group(0)
    href_re = re.compile(r"\bhref=([\"'])(.*?)\1", re.I | re.S)
    tag2 = href_re.sub(lambda m: f'href={m.group(1)}{canonical}{m.group(1)}', tag, count=1) if href_re.search(tag) else tag[:-1] + f' href="{canonical}">'
    return html[:match.start()] + tag2 + html[match.end():]


def rewrite_assets(html: str) -> str:
    for attr in ("href", "src", "srcset"):
        html = html.replace(f'{attr}="assets/', f'{attr}="/assets/').replace(f"{attr}='assets/", f"{attr}='/assets/")
    return re.sub(r"url\(([\"']?)assets/", r"url(\1/assets/", html)


def rewrite_links(html: str, lang: str) -> str:
    def repl(match: re.Match[str]) -> str:
        quote, target = match.group(1), match.group(2)
        if target.startswith(("#", "/", "http://", "https://", "mailto:", "tel:", "javascript:")):
            return match.group(0)
        base = re.split(r"[?#]", target, maxsplit=1)[0]
        suffix = target[len(base):]
        if base == "index.html":
            return f'href={quote}/{lang}/{suffix}{quote}'
        if base in PAGES:
            return f'href={quote}/{lang}/{base}{suffix}{quote}'
        if base.endswith(".html"):
            return f'href={quote}/{target}{quote}'
        return match.group(0)
    return re.sub(r"href=([\"'])([^\"']+)\1", repl, html, flags=re.I)


def translate_visible_html(html: str, catalog: dict[str, str]) -> str:
    head_match = HEAD_RE.search(html)
    body_start = head_match.end() if head_match else 0
    prefix = html[:body_start]
    body = html[body_start:]
    parts = SKIP_BLOCK_RE.split(body)
    for i in range(0, len(parts), 2):
        segment = parts[i]
        if not segment:
            continue
        def text_repl(match: re.Match[str]) -> str:
            raw = match.group(1)
            key = clean(raw)
            translated = catalog.get(key)
            if not translated or translated == key:
                return match.group(0)
            lead = re.match(r"^\s*", raw).group(0)
            tail = re.search(r"\s*$", raw).group(0)
            return ">" + lead + escape(translated, quote=False) + tail + "<"
        segment = TEXT_RE.sub(text_repl, segment)
        def attr_repl(match: re.Match[str]) -> str:
            attr, quote, raw = match.group(1), match.group(2), match.group(3)
            key = clean(raw)
            translated = catalog.get(key)
            if not translated or translated == key:
                return match.group(0)
            return f"{attr}={quote}{escape(translated, quote=True)}{quote}"
        segment = ATTR_RE.sub(attr_repl, segment)
        parts[i] = segment
    return prefix + "".join(parts)


def extract_visible(html: str) -> set[str]:
    html = HEAD_RE.sub("", COMMENT_RE.sub("", html), count=1)
    parts = SKIP_BLOCK_RE.split(html)
    values: set[str] = set()
    for i in range(0, len(parts), 2):
        segment = parts[i]
        for match in TEXT_RE.finditer(segment):
            value = clean(match.group(1))
            if useful(value): values.add(value)
        for match in ATTR_RE.finditer(segment):
            value = clean(match.group(3))
            if useful(value): values.add(value)
    return values


def update_metadata(html: str, lang: str, page: str, translated_title: str | None, translated_desc: str | None) -> str:
    html = re.sub(r"(<html\b[^>]*\blang=)[\"'][^\"']+[\"']", rf'\1"{lang}"', html, count=1, flags=re.I)
    if translated_title:
        html = re.sub(r"<title>.*?</title>", f"<title>{escape(translated_title)}</title>", html, count=1, flags=re.I | re.S)
    if translated_desc:
        html = replace_meta_content(html, "name", "description", translated_desc)
    canonical = page_url(lang, page)
    html = replace_canonical(html, canonical)
    html = replace_meta_content(html, "property", "og:locale", "en_GB" if lang == "en" else "tr_TR")
    if translated_title: html = replace_meta_content(html, "property", "og:title", translated_title)
    if translated_desc: html = replace_meta_content(html, "property", "og:description", translated_desc)
    html = replace_meta_content(html, "property", "og:url", canonical)
    return html


def mirror_page(lang: str, page: str, catalog: dict[str, str]) -> None:
    generated_path = ROOT / lang / page
    translated_seed = generated_path.read_text(encoding="utf-8")
    source = (ROOT / page).read_text(encoding="utf-8")
    html = update_metadata(source, lang, page, get_title(translated_seed), get_description(translated_seed))
    html = rewrite_assets(html)
    html = rewrite_links(html, lang)
    html = translate_visible_html(html, catalog)
    html = re.sub(r"/assets/language-switcher\.js\?v=\d+", "/assets/language-switcher.js?v=11", html)
    html = re.sub(r"assets/story-conversion-final\.css\?v=\d+", "assets/story-conversion-final.css?v=2", html)
    html = "\n".join(line.rstrip() for line in html.splitlines()) + ("\n" if html.endswith("\n") else "")
    generated_path.write_text(html, encoding="utf-8")


def update_root_switcher_version() -> None:
    for page in PAGES:
        path = ROOT / page
        text = path.read_text(encoding="utf-8")
        text = re.sub(r"/assets/language-switcher\.js\?v=\d+", "/assets/language-switcher.js?v=11", text)
        text = re.sub(r"assets/story-conversion-final\.css\?v=\d+", "assets/story-conversion-final.css?v=2", text)
        path.write_text(text, encoding="utf-8")


def audit_catalogs(catalogs: dict[str, dict[str, str]]) -> None:
    source_values: set[str] = set()
    for page in PAGES:
        source_values.update(extract_visible((ROOT / page).read_text(encoding="utf-8")))
    allowed_exact = {
        "NAHWERK", "NAHWERK Concierge", "NAHWERK Safety", "NAHWERK Safety Check", "NAHWERK Family",
        "WhatsApp", "Family", "Safety", "FREE", "STANDARD", "PLUS", "PREMIUM", "PREMIUM PLUS", "FAMILY",
        "Lena", "James", "Konrad", "Alexander", "Luisa", "Leyla", "Martin", "Nilo", "Mira", "Hartmut", "Sarah", "Camila",
        "Eleni", "Zofia", "Mei", "Yuna", "Amara", "Emily", "David", "Arthur", "Kenji", "Sofia", "Isabella",
        "Fatima", "Ana", "Giulia", "Malik", "ODYSX", "PayPal", "Visa", "Mastercard", "Stripe", "Uber",
        "info@nahwerkconcierge.com", "support@nahwerkconcierge.com", "Berlin", "Europe/Berlin",
        "DE", "EN", "TR", "EUR", "GPT", "AI", "FAQ", "112"
    }
    any_missing = False
    for lang, catalog in catalogs.items():
        missing = []
        for value in sorted(source_values):
            if value in allowed_exact or value in catalog: continue
            if not re.search(r"[A-Za-zÄÖÜäöüßÀ-ÿ]", value): continue
            if re.fullmatch(r"[A-Z0-9_.:/+@-]{2,}", value): continue
            missing.append(value)
        if missing:
            any_missing = True
            print(f"\nMISSING {lang.upper()} CATALOG STRINGS ({len(missing)}):")
            for value in missing: print("- " + value)
    if any_missing:
        raise SystemExit("Localization catalogs are incomplete; add the listed strings before PROD publish.")


def main() -> None:
    catalogs = {lang: load_catalog(lang) for lang in LANGS}
    update_root_switcher_version()
    audit_catalogs(catalogs)
    for lang in LANGS:
        for page in PAGES: mirror_page(lang, page, catalogs[lang])
    print(f"Mirrored exact PROD design and localized {len(PAGES) * len(LANGS)} public pages with shared assets.")


if __name__ == "__main__":
    main()