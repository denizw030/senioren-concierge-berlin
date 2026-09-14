from __future__ import annotations

from pathlib import Path
from urllib.parse import parse_qsl, urlencode
import re

ROOT = Path(__file__).resolve().parents[1]
LANGS = ("en", "tr")
PUBLIC_PAGES = [
    "index.html", "prime-concierge.html", "safety.html", "angehoerige.html",
    "telefonannahme.html", "pakete.html", "leistungen.html", "ablauf.html",
    "faq.html", "kontakt.html", "concierges.html", "senioren-concierge.html",
    "alltag-organisieren.html", "dokumente-verstehen.html", "technik-verstehen.html", "ueber-mich.html",
]
AUTH_PAGES = ("registrieren.html", "anmelden.html", "erster-schritt.html")
AUTH_SCRIPT = '<script src="assets/auth-i18n.js?v=1"></script>'


def inject_auth_runtime(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    text = re.sub(r'\s*<script\s+src=["\']/?assets/auth-i18n\.js\?v=\d+["\']></script>', "", text, flags=re.I)
    marker = "</body>"
    if marker not in text.lower():
        raise SystemExit(f"Missing </body> in {path.name}")
    idx = text.lower().rfind(marker)
    text = text[:idx] + "    " + AUTH_SCRIPT + "\n  " + text[idx:]
    path.write_text(text, encoding="utf-8")


def with_lang_query(target: str, lang: str) -> str:
    hash_part = ""
    if "#" in target:
        target, hash_part = target.split("#", 1)
        hash_part = "#" + hash_part
    query = ""
    if "?" in target:
        path, query = target.split("?", 1)
    else:
        path = target
    pairs = [(k, v) for k, v in parse_qsl(query, keep_blank_values=True) if k != "lang"]
    pairs.append(("lang", lang))
    return f"{path}?{urlencode(pairs)}{hash_part}"


def rewrite_generated_auth_links(path: Path, lang: str) -> None:
    text = path.read_text(encoding="utf-8")

    def repl(match: re.Match[str]) -> str:
        quote, target = match.group(1), match.group(2)
        plain = target.lstrip("/")
        base = plain.split("?", 1)[0].split("#", 1)[0]
        if base not in {"registrieren.html", "anmelden.html"}:
            return match.group(0)
        root_target = "/" + plain
        return f'href={quote}{with_lang_query(root_target, lang)}{quote}'

    text = re.sub(r'href=(["\'])([^"\']+)\1', repl, text, flags=re.I)
    path.write_text(text, encoding="utf-8")


def patch_onboarding_redirects() -> None:
    path = ROOT / "assets" / "onboarding.js"
    text = path.read_text(encoding="utf-8")
    for target in ("erster-schritt.html", "anmelden.html"):
        replacement = f'window.NAHWERKLocale?.href("{target}") || "{target}"'
        text = text.replace(f'location.href = "{target}";', f'location.href = {replacement};')
    path.write_text(text, encoding="utf-8")


def main() -> None:
    for page in AUTH_PAGES:
        path = ROOT / page
        if path.exists():
            inject_auth_runtime(path)

    patch_onboarding_redirects()

    for lang in LANGS:
        for page in PUBLIC_PAGES:
            path = ROOT / lang / page
            if path.exists():
                rewrite_generated_auth_links(path, lang)

    print("Auth locale continuity prepared for EN/TR public → registration/login flow.")


if __name__ == "__main__":
    main()
