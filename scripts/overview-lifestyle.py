from __future__ import annotations

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
PAGES = {
    "index.html": {
        "lang": "de",
        "home_kicker": "Im Alltag",
        "home_title": "Einfach sagen, was gebraucht wird.",
        "home_text": "Ob zuhause, unterwegs oder zwischendurch: NAHWERK versteht das Anliegen, organisiert den nächsten Schritt und bleibt dran.",
        "home_alt": "Eine Frau nutzt zu Hause entspannt ihr Smartphone",
        "road_kicker": "Unterwegs",
        "road_title": "Der Concierge bleibt erreichbar.",
        "road_text": "Eine Nachricht genügt. NAHWERK übernimmt Recherche, Organisation und den nächsten freigegebenen Schritt – auch wenn gerade wenig Zeit ist.",
        "road_alt": "Ein Mann nutzt unterwegs im Auto sein Smartphone",
    },
    "en/index.html": {
        "lang": "en",
        "home_kicker": "Everyday",
        "home_title": "Just say what you need.",
        "home_text": "At home, on the go or in between: NAHWERK understands the request, organises the next step and stays on it.",
        "home_alt": "A woman uses her smartphone at home in a relaxed setting",
        "road_kicker": "On the go",
        "road_title": "Your Concierge stays within reach.",
        "road_text": "One message is enough. NAHWERK takes care of research, organisation and the next approved step — even when time is short.",
        "road_alt": "A man uses his smartphone while on the go in his car",
    },
    "tr/index.html": {
        "lang": "tr",
        "home_kicker": "Günlük hayatta",
        "home_title": "Neye ihtiyacınız olduğunu söylemeniz yeterli.",
        "home_text": "Evde, yolda veya gün içinde: NAHWERK talebi anlar, bir sonraki adımı organize eder ve takipte kalır.",
        "home_alt": "Bir kadın evinde rahatça akıllı telefonunu kullanıyor",
        "road_kicker": "Hareket halinde",
        "road_title": "Concierge’iniz her zaman ulaşılabilir.",
        "road_text": "Tek bir mesaj yeter. NAHWERK araştırmayı, organizasyonu ve onaylanan bir sonraki adımı üstlenir — zamanınız kısıtlı olsa bile.",
        "road_alt": "Bir erkek arabasında hareket halindeyken akıllı telefonunu kullanıyor",
    },
}

CSS_LINK = '      <link rel="stylesheet" href="/assets/overview-lifestyle.css?v=1" />'
HOME_START = "      <!-- NW-OVERVIEW-LIFESTYLE-HOME-START -->"
HOME_END = "      <!-- NW-OVERVIEW-LIFESTYLE-HOME-END -->"
ROAD_START = "      <!-- NW-OVERVIEW-LIFESTYLE-ROAD-START -->"
ROAD_END = "      <!-- NW-OVERVIEW-LIFESTYLE-ROAD-END -->"


def story_home(copy: dict[str, str]) -> str:
    return f'''{HOME_START}
      <section class="story-section nw-lifestyle-story nw-lifestyle-story--home" id="alltag-moment" data-nw-overview-lifestyle="home" aria-labelledby="nw-lifestyle-home-title">
        <div class="story-shell nw-lifestyle-grid">
          <figure class="nw-lifestyle-media">
            <img
              src="/assets/lifestyle/woman-living-room.png"
              width="1536"
              height="1024"
              alt="{copy['home_alt']}"
              loading="lazy"
              decoding="async"
            />
          </figure>
          <div class="nw-lifestyle-copy">
            <div class="story-kicker">{copy['home_kicker']}</div>
            <h2 class="story-title story-title--section" id="nw-lifestyle-home-title">{copy['home_title']}</h2>
            <p class="story-lead">{copy['home_text']}</p>
          </div>
        </div>
      </section>
{HOME_END}'''


def story_road(copy: dict[str, str]) -> str:
    return f'''{ROAD_START}
      <section class="story-section nw-lifestyle-story nw-lifestyle-story--road nw-lifestyle-story--reverse" id="unterwegs-moment" data-nw-overview-lifestyle="road" aria-labelledby="nw-lifestyle-road-title">
        <div class="story-shell nw-lifestyle-grid">
          <figure class="nw-lifestyle-media">
            <img
              src="/assets/lifestyle/young-man-car.png"
              width="1536"
              height="1024"
              alt="{copy['road_alt']}"
              loading="lazy"
              decoding="async"
            />
          </figure>
          <div class="nw-lifestyle-copy">
            <div class="story-kicker">{copy['road_kicker']}</div>
            <h2 class="story-title story-title--section" id="nw-lifestyle-road-title">{copy['road_title']}</h2>
            <p class="story-lead">{copy['road_text']}</p>
          </div>
        </div>
      </section>
{ROAD_END}'''


def replace_block(text: str, start: str, end: str, block: str) -> tuple[str, bool]:
    pattern = re.compile(re.escape(start) + r".*?" + re.escape(end), re.S)
    if pattern.search(text):
        updated = pattern.sub(block, text, count=1)
        return updated, updated != text
    return text, False


def patch_page(rel: str, copy: dict[str, str]) -> bool:
    path = ROOT / rel
    text = path.read_text(encoding="utf-8")
    original = text

    if '/assets/overview-lifestyle.css?' not in text:
        anchor = re.search(r'^[ \t]*<link rel="stylesheet" href="/?assets/story-conversion-final\.css\?v=\d+" />', text, re.M)
        if not anchor:
            raise SystemExit(f"{rel}: story stylesheet anchor missing")
        text = text[:anchor.end()] + "\n" + CSS_LINK + text[anchor.end():]

    home = story_home(copy)
    text, had_home = replace_block(text, HOME_START, HOME_END, home)
    if not had_home and HOME_START not in text:
        anchor = "\n      <!-- 3 · Safety als Vertrauen -->"
        if anchor not in text:
            raise SystemExit(f"{rel}: Safety insertion anchor missing")
        text = text.replace(anchor, "\n\n" + home + anchor, 1)

    road = story_road(copy)
    text, had_road = replace_block(text, ROAD_START, ROAD_END, road)
    if not had_road and ROAD_START not in text:
        anchor = "\n      <!-- 4 · Family als emotionaler Mehrwert -->"
        if anchor not in text:
            raise SystemExit(f"{rel}: Family insertion anchor missing")
        text = text.replace(anchor, "\n\n" + road + anchor, 1)

    if text == original:
        print(f"unchanged {rel}")
        return False
    path.write_text(text, encoding="utf-8")
    print(f"updated {rel}")
    return True


def main() -> None:
    for asset in [
        ROOT / "assets/lifestyle/woman-living-room.png",
        ROOT / "assets/lifestyle/young-man-car.png",
        ROOT / "assets/overview-lifestyle.css",
    ]:
        if not asset.exists():
            raise SystemExit(f"Missing required asset: {asset.relative_to(ROOT)}")

    changed = sum(int(patch_page(rel, copy)) for rel, copy in PAGES.items())
    print(f"overview lifestyle pages changed={changed}")


if __name__ == "__main__":
    main()
