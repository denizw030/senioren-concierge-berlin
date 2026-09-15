from __future__ import annotations

from pathlib import Path
import argparse
import shutil

ROOT = Path(__file__).resolve().parents[1]
ROOT_INDEX = ROOT / "index.html"
DE_INDEX = ROOT / "de" / "index.html"
TMP_ROOT_INDEX = Path("/tmp/nahwerk-root-index.redirect.html")


def patch_de_home(text: str) -> str:
    text = text.replace('href="https://nahwerkconcierge.com/" />\n    <link rel="alternate" hreflang="en"', 'href="https://nahwerkconcierge.com/de/" />\n    <link rel="alternate" hreflang="en"', 1)
    text = text.replace("href='https://nahwerkconcierge.com/' />\n    <link rel='alternate' hreflang='en'", "href='https://nahwerkconcierge.com/de/' />\n    <link rel='alternate' hreflang='en'", 1)
    return text


def save_root() -> None:
    if not ROOT_INDEX.exists():
        raise SystemExit("Missing root index.html")
    TMP_ROOT_INDEX.write_text(ROOT_INDEX.read_text(encoding="utf-8"), encoding="utf-8")


def use_de_source() -> None:
    if not TMP_ROOT_INDEX.exists():
        raise SystemExit("Root redirect backup missing; run save-root first")
    if not DE_INDEX.exists():
        raise SystemExit("Missing de/index.html")
    de_text = patch_de_home(DE_INDEX.read_text(encoding="utf-8"))
    if 'href="https://nahwerkconcierge.com/de/"' not in de_text and "href='https://nahwerkconcierge.com/de/'" not in de_text:
        raise SystemExit("German homepage canonical/hreflang does not target /de/")
    DE_INDEX.write_text(de_text, encoding="utf-8")
    ROOT_INDEX.write_text(de_text, encoding="utf-8")


def restore_root() -> None:
    if not TMP_ROOT_INDEX.exists():
        raise SystemExit("Root redirect backup missing; run save-root first")
    if not ROOT_INDEX.exists():
        raise SystemExit("Temporary German source is missing")
    mirrored_de = patch_de_home(ROOT_INDEX.read_text(encoding="utf-8"))
    DE_INDEX.parent.mkdir(exist_ok=True)
    DE_INDEX.write_text(mirrored_de, encoding="utf-8")
    shutil.copyfile(TMP_ROOT_INDEX, ROOT_INDEX)
    TMP_ROOT_INDEX.unlink(missing_ok=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=("save-root", "use-de-source", "restore-root"))
    args = parser.parse_args()
    if args.mode == "save-root":
        save_root()
    elif args.mode == "use-de-source":
        use_de_source()
    else:
        restore_root()


if __name__ == "__main__":
    main()
