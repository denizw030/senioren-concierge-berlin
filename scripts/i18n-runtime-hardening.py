from __future__ import annotations

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"


def write_if_changed(path: Path, text: str) -> bool:
    old = path.read_text(encoding="utf-8") if path.exists() else None
    if old == text:
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    print(f"updated {path.relative_to(ROOT)}")
    return True


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f"Missing patch anchor: {label}")
    return text.replace(old, new, 1)


def absolutize_runtime_assets() -> None:
    for path in sorted(ASSETS.glob("*.js")):
        text = path.read_text(encoding="utf-8")
        fixed = re.sub(r'(["\'`])assets/', r'\1/assets/', text)
        write_if_changed(path, fixed)


def patch_acquisition() -> None:
    path = ASSETS / "acquisition-v1.js"
    text = path.read_text(encoding="utf-8")
    old_constants = (
        '  const FREE_ENTRY_COPY="Lernen Sie NAHWERK kostenlos kennen: chatten, Fragen stellen, Aufgaben vorbereiten und eine echte Concierge-Ausführung ausprobieren. Keine Zahlungsdaten erforderlich. Kein automatisches Upgrade. Danach können Sie Guthaben schon ab 5 € online aufladen.";\n'
        '  const FREE_LIMITS_COPY="FREE: bis zu 50 App-Dialoge / Monat · bis zu 20 WhatsApp-Dialoge / Monat · 1 echte Concierge-Ausführung.";'
    )
    new_constants = '''  const locale=(()=>{\n    const first=location.pathname.split("/").filter(Boolean)[0];\n    if(first==="en"||first==="tr")return first;\n    const query=new URLSearchParams(location.search).get("lang");\n    if(query==="en"||query==="tr")return query;\n    try{const stored=localStorage.getItem("nw_language");if(stored==="en"||stored==="tr")return stored}catch(_){}\n    return "de";\n  })();\n  const JOURNEY_COPY={\n    de:{\n      aria:"In drei Schritten zum kostenlosen Einstieg",\n      oneTitle:"Kostenlos registrieren",\n      oneBody:"Lernen Sie NAHWERK kostenlos kennen: chatten, Fragen stellen, Aufgaben vorbereiten und eine echte Concierge-Ausführung ausprobieren. Keine Zahlungsdaten erforderlich. Kein automatisches Upgrade. Danach können Sie Guthaben schon ab 5 € online aufladen.",\n      limits:"FREE: bis zu 50 App-Dialoge / Monat · bis zu 20 WhatsApp-Dialoge / Monat · 1 echte Concierge-Ausführung.",\n      twoTitle:"Aufgabe übergeben",\n      twoBody:"Zum Beispiel einen Hautarzt finden, passende Optionen vergleichen oder den nächsten Schritt organisieren lassen.",\n      threeTitle:"NAHWERK bleibt dran",\n      threeBody:"NAHWERK recherchiert, organisiert, fragt bei nötigen Entscheidungen nach und meldet Ergebnis oder nächsten Schritt zurück."\n    },\n    en:{\n      aria:"Three steps to get started for free",\n      oneTitle:"Register for free",\n      oneBody:"Get to know NAHWERK for free: chat, ask questions, prepare tasks and try one real Concierge execution. No payment details required. No automatic upgrade. Afterwards, you can top up credit online from €5.",\n      limits:"FREE: up to 50 app conversations / month · up to 20 WhatsApp conversations / month · 1 real Concierge execution.",\n      twoTitle:"Hand over a task",\n      twoBody:"For example, find a dermatologist, compare suitable options or have the next step organised.",\n      threeTitle:"NAHWERK stays on it",\n      threeBody:"NAHWERK researches, organises, asks for approval when a decision is needed and reports back with the result or next step."\n    },\n    tr:{\n      aria:"Ücretsiz başlangıç için üç adım",\n      oneTitle:"Ücretsiz kayıt ol",\n      oneBody:"NAHWERK'i ücretsiz deneyin: sohbet edin, sorular sorun, görevleri hazırlayın ve gerçek bir Concierge işlemini deneyin. Ödeme bilgisi gerekmez. Otomatik yükseltme yoktur. Sonrasında çevrim içi olarak 5 €'dan başlayan bakiye yükleyebilirsiniz.",\n      limits:"FREE: ayda en fazla 50 uygulama görüşmesi · ayda en fazla 20 WhatsApp görüşmesi · 1 gerçek Concierge işlemi.",\n      twoTitle:"Bir görev verin",\n      twoBody:"Örneğin bir dermatolog bulun, uygun seçenekleri karşılaştırın veya sonraki adımı organize ettirin.",\n      threeTitle:"NAHWERK takipte kalır",\n      threeBody:"NAHWERK araştırır, organize eder, gerekli kararlarda onay ister ve sonucu ya da sonraki adımı size bildirir."\n    }\n  };\n  const journeyCopy=JOURNEY_COPY[locale]||JOURNEY_COPY.de;'''
    text = replace_once(text, old_constants, new_constants, "acquisition locale copy")

    old_function = re.search(r'  function syncFreeEntryJourney\(\)\{.*?\n  \}\n  document\.addEventListener\("click"', text, re.S)
    if not old_function:
        if "journeyCopy.oneTitle" not in text:
            raise SystemExit("Missing acquisition journey function anchor")
    else:
        new_function = '''  function syncFreeEntryJourney(){\n    let grid=document.querySelector(".nw-journey-grid");\n    if(!grid){\n      const conversion=document.querySelector('.story-final[data-story-step="6"] .story-shell');\n      if(!conversion)return false;\n      grid=document.createElement("div");\n      grid.className="nw-journey-grid";\n      const actions=conversion.querySelector(".story-actions");\n      conversion.insertBefore(grid,actions||null);\n    }\n    grid.setAttribute("aria-label",journeyCopy.aria);\n    grid.innerHTML=`<article class="nw-journey-card"><span>01</span><h3>${journeyCopy.oneTitle}</h3><p>${journeyCopy.oneBody}</p><p class="nw-free-limits">${journeyCopy.limits}</p></article><article class="nw-journey-card"><span>02</span><h3>${journeyCopy.twoTitle}</h3><p>${journeyCopy.twoBody}</p></article><article class="nw-journey-card"><span>03</span><h3>${journeyCopy.threeTitle}</h3><p>${journeyCopy.threeBody}</p></article>`;\n    return true;\n  }\n  document.addEventListener("click"'''
        text = text[:old_function.start()] + new_function + text[old_function.end():]
    write_if_changed(path, text)


def patch_locale_runtime() -> None:
    path = ASSETS / "locale-runtime.js"
    text = path.read_text(encoding="utf-8")

    anchor = "  const localizedProduct = (value) => productNames[clean(value)]?.[lang] || clean(value);\n"
    addition = '''  const localizedProduct = (value) => productNames[clean(value)]?.[lang] || clean(value);\n\n  const normalizeAssetRef = (value) => {\n    if (!value) return value;\n    const raw = String(value);\n    return raw\n      .replace(/^\\/(?:en|tr)\\/assets\\//i, '/assets/')\n      .replace(/^assets\\//i, '/assets/')\n      .replace(/(^|,\\s*)\\/(?:en|tr)\\/assets\\//gi, '$1/assets/')\n      .replace(/(^|,\\s*)assets\\//gi, '$1/assets/');\n  };\n\n  const repairAssetRefs = () => {\n    document.querySelectorAll('img,source,audio,video').forEach((el) => {\n      ['src','data-src','srcset','data-srcset','poster'].forEach((attr) => {\n        const raw = el.getAttribute?.(attr);\n        if (!raw) return;\n        const fixed = normalizeAssetRef(raw);\n        if (fixed !== raw) el.setAttribute(attr, fixed);\n      });\n    });\n  };\n'''
    if "const repairAssetRefs" not in text:
        text = replace_once(text, anchor, addition, "locale runtime asset repair")

    german_welcome = '''    if ((match = key.match(/^Willkommen bei (.+)\\.$/))) {\n      const product = localizedProduct(match[1]);\n      return lang === 'tr' ? `${product}'e hoş geldiniz.` : `Welcome to ${product}.`;\n    }\n'''
    english_welcome = german_welcome + '''    if ((match = key.match(/^Welcome to (.+)\\.$/)) && lang === 'en') {\n      return `Welcome to ${localizedProduct(match[1])}.`;\n    }\n'''
    if "^Welcome to (.+)" not in text:
        text = replace_once(text, german_welcome, english_welcome, "English mixed product repair")

    apply_old = '''      document.documentElement.lang = lang;\n      repairOdysxBar();\n      translateTree(document.body);'''
    apply_new = '''      document.documentElement.lang = lang;\n      repairAssetRefs();\n      repairOdysxBar();\n      translateTree(document.body);'''
    if "repairAssetRefs();\n      repairOdysxBar();" not in text:
        text = replace_once(text, apply_old, apply_new, "locale apply asset repair")

    obs_old = "new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, characterData: true });"
    obs_new = "new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['src','srcset','data-src','data-srcset','poster'] });"
    if obs_new not in text:
        text = replace_once(text, obs_old, obs_new, "locale asset observer")

    write_if_changed(path, text)


def patch_auth_i18n() -> None:
    path = ASSETS / "auth-i18n.js"
    text = path.read_text(encoding="utf-8")

    anchor = "  const lang = detectLang();\n  const clean = (value) => String(value || '').replace(/\\s+/g, ' ').trim();\n"
    addition = '''  const lang = detectLang();\n  const clean = (value) => String(value || '').replace(/\\s+/g, ' ').trim();\n  const productNames = {\n    'Persönlicher Concierge': { en:'Personal Concierge', tr:'Kişisel Concierge' },\n    'Senioren Concierge': { en:'Senior Concierge', tr:'İleri yaş Concierge' },\n    'Prime Concierge': { en:'Personal Concierge', tr:'Kişisel Concierge' }\n  };\n  const localizedProduct = (value) => productNames[clean(value)]?.[lang] || clean(value);\n  const hardFragments = {\n    en: {\n      'Deine':'Your',\n      'WhatsApp-Telefonnummer':'WhatsApp phone number',\n      'Deine Telefonnummer wird als':'Your phone number is used for',\n      'WhatsApp-Zugang verwendet.':'WhatsApp access.',\n      'Web-Konto +':'Web account +',\n      'Persönlicher Concierge':'Personal Concierge'\n    },\n    tr: {\n      'Deine':'Size ait',\n      'WhatsApp-Telefonnummer':'WhatsApp telefon numarası',\n      'Deine Telefonnummer wird als':'Telefon numaranız',\n      'WhatsApp-Zugang verwendet.':'WhatsApp erişimi için kullanılır.',\n      'Web-Konto +':'Web hesabı +',\n      'Persönlicher Concierge':'Kişisel Concierge'\n    }\n  };\n'''
    if "const hardFragments" not in text:
        text = replace_once(text, anchor, addition, "auth hard fragments")

    catalog_line = "    if (catalog[key]) return catalog[key];\n"
    if "hardFragments[lang]?.[key]" not in text:
        text = replace_once(text, catalog_line, catalog_line + "    if (hardFragments[lang]?.[key]) return hardFragments[lang][key];\n", "auth fragment lookup")

    old_welcome = '''    if ((m = key.match(/^Willkommen bei (.+)\\.$/))) return lang === 'tr' ? `${m[1]}'e hoş geldiniz.` : `Welcome to ${m[1]}.`;\n'''
    new_welcome = '''    if ((m = key.match(/^Willkommen bei (.+)\\.$/))) {\n      const product = localizedProduct(m[1]);\n      return lang === 'tr' ? `${product}'e hoş geldiniz.` : `Welcome to ${product}.`;\n    }\n    if ((m = key.match(/^Welcome to (.+)\\.$/)) && lang === 'en') return `Welcome to ${localizedProduct(m[1])}.`;\n    if ((m = key.match(/^(.+)'e hoş geldiniz\\.$/)) && lang === 'tr') return `${localizedProduct(m[1])}'e hoş geldiniz.`;\n    if ((m = key.match(/^Nur nötig, wenn (?:Sie|du) (.+) selbst über$/))) return lang === 'tr' ? `Yalnızca ${m[1]}'yu` : `Only required if you use ${m[1]} yourself via`;\n    if (key === 'WhatsApp nutzen.') return lang === 'tr' ? 'WhatsApp üzerinden kendiniz kullanacaksanız gereklidir.' : 'WhatsApp.';\n'''
    if "^Welcome to (.+)" not in text:
        text = replace_once(text, old_welcome, new_welcome, "auth product welcome")

    rewrite_anchor = '''  const rewriteLinks = () => {\n'''
    repair_function = '''  const whatsappIcon = () => {\n    const img = document.createElement('img');\n    img.src = '/assets/icons/whatsapp-mark.svg?v=1';\n    img.alt = '';\n    img.setAttribute('aria-hidden', 'true');\n    img.style.cssText = 'width:16px;height:16px;object-fit:contain;display:inline-block;vertical-align:-2px;margin:0 4px';\n    return img;\n  };\n\n  const repairRegistrationSurface = () => {\n    if (basename() !== 'registrieren.html' || lang === 'de') return;\n    const copy = lang === 'tr' ? {\n      phoneBefore:'', phoneAfter:'WhatsApp telefon numaranız',\n      hint:'Yalnızca seçtiğiniz Concierge’i WhatsApp üzerinden kendiniz kullanacaksanız gereklidir.',\n      selfStrong:'Kendiniz için:', selfBefore:'Telefon numaranız', selfAfter:'WhatsApp erişimi için kullanılır.',\n      previewBefore:'Web hesabı +', previewAfter:'WhatsApp.'\n    } : {\n      phoneBefore:'Your', phoneAfter:'WhatsApp phone number',\n      hint:'Only required if you use your selected Concierge yourself via WhatsApp.',\n      selfStrong:'For yourself:', selfBefore:'Your phone number is used for', selfAfter:'WhatsApp access.',\n      previewBefore:'Web account +', previewAfter:'WhatsApp.'\n    };\n\n    const label = document.querySelector('#ownerPhoneField label[for="ownerPhone"]');\n    const expectedLabel = clean(`${copy.phoneBefore} ${copy.phoneAfter}`);\n    if (label && clean(label.textContent) !== expectedLabel) {\n      label.replaceChildren();\n      if (copy.phoneBefore) label.append(document.createTextNode(copy.phoneBefore + ' '));\n      label.append(whatsappIcon(), document.createTextNode(' ' + copy.phoneAfter));\n    }\n\n    const hint = document.getElementById('ownerPhoneHint');\n    if (hint && clean(hint.textContent) !== copy.hint) hint.textContent = copy.hint;\n\n    const self = document.getElementById('selfHint');\n    const expectedSelf = clean(`${copy.selfStrong} ${copy.selfBefore} ${copy.selfAfter}`);\n    if (self && clean(self.textContent) !== expectedSelf) {\n      const strong = document.createElement('strong');\n      strong.textContent = copy.selfStrong;\n      self.replaceChildren(strong, document.createTextNode(' ' + copy.selfBefore + ' '), whatsappIcon(), document.createTextNode(' ' + copy.selfAfter));\n    }\n\n    const preview = document.querySelector('.preview h3');\n    const expectedPreview = clean(`${copy.previewBefore} ${copy.previewAfter}`);\n    if (preview && clean(preview.textContent) !== expectedPreview) {\n      preview.replaceChildren(document.createTextNode(copy.previewBefore + ' '), whatsappIcon(), document.createTextNode(' ' + copy.previewAfter));\n    }\n  };\n\n'''
    if "const repairRegistrationSurface" not in text:
        text = replace_once(text, rewrite_anchor, repair_function + rewrite_anchor, "registration composite repair")

    apply_old = '''      document.documentElement.lang = lang;\n      translateTree(document.body);\n      rewriteLinks();'''
    apply_new = '''      document.documentElement.lang = lang;\n      translateTree(document.body);\n      repairRegistrationSurface();\n      rewriteLinks();'''
    if "repairRegistrationSurface();" not in text[text.find("const apply"):]:
        text = replace_once(text, apply_old, apply_new, "auth apply registration repair")

    if "const revealLocalizedPage" not in text:
        text = replace_once(
            text,
            "  const loadCatalog = async () => {\n",
            "  const revealLocalizedPage = () => document.documentElement.classList.remove('nw-locale-pending');\n\n  const loadCatalog = async () => {\n",
            "auth reveal helper",
        )
    load_end = '''    } catch (_) {}\n    apply();\n  };'''
    load_end_new = '''    } catch (_) {}\n    apply();\n    revealLocalizedPage();\n  };'''
    if "apply();\n    revealLocalizedPage();\n  };" not in text:
        text = replace_once(text, load_end, load_end_new, "auth reveal after catalog")

    start_old = '''    setTimeout(schedule, 1000);\n  };'''
    start_new = '''    setTimeout(schedule, 1000);\n    setTimeout(revealLocalizedPage, 2500);\n  };'''
    if "setTimeout(revealLocalizedPage, 2500);" not in text:
        text = replace_once(text, start_old, start_new, "auth reveal fail-safe")

    write_if_changed(path, text)


def create_locale_boot() -> None:
    path = ASSETS / "locale-boot.js"
    text = '''(() => {\n  'use strict';\n  const supported = new Set(['en','tr']);\n  const query = new URLSearchParams(location.search).get('lang');\n  let stored = null;\n  try { stored = localStorage.getItem('nw_language'); } catch (_) {}\n  const lang = supported.has(query) ? query : supported.has(stored) ? stored : null;\n  if (!lang) return;\n  document.documentElement.classList.add('nw-locale-pending');\n  const style = document.createElement('style');\n  style.id = 'nw-locale-first-paint';\n  style.textContent = 'html.nw-locale-pending{background:#070706}html.nw-locale-pending body{visibility:hidden}';\n  document.head.appendChild(style);\n  setTimeout(() => document.documentElement.classList.remove('nw-locale-pending'), 3000);\n})();\n'''
    write_if_changed(path, text)


def patch_html_versions_and_boot() -> None:
    boot_pages = {"registrieren.html", "anmelden.html", "erster-schritt.html"}
    for path in sorted(ROOT.rglob("*.html")):
        if any(part in {".git", "node_modules"} for part in path.parts):
            continue
        text = path.read_text(encoding="utf-8")
        fixed = text
        fixed = re.sub(r'/assets/locale-runtime\.js\?v=\d+', '/assets/locale-runtime.js?v=2', fixed)
        fixed = re.sub(r'assets/locale-runtime\.js\?v=\d+', 'assets/locale-runtime.js?v=2', fixed)
        fixed = re.sub(r'/assets/acquisition-v1\.js\?v=\d+', '/assets/acquisition-v1.js?v=2', fixed)
        fixed = re.sub(r'assets/acquisition-v1\.js\?v=\d+', 'assets/acquisition-v1.js?v=2', fixed)
        fixed = re.sub(r'/assets/concierge-voice-preview\.js\?v=\d+', '/assets/concierge-voice-preview.js?v=7', fixed)
        fixed = re.sub(r'assets/concierge-voice-preview\.js\?v=\d+', 'assets/concierge-voice-preview.js?v=7', fixed)
        fixed = re.sub(r'/assets/auth-i18n\.js\?v=\d+', '/assets/auth-i18n.js?v=4', fixed)
        fixed = re.sub(r'assets/auth-i18n\.js\?v=\d+', 'assets/auth-i18n.js?v=4', fixed)
        if path.parent == ROOT and path.name in boot_pages and 'locale-boot.js' not in fixed:
            marker = '</head>'
            if marker not in fixed:
                raise SystemExit(f"Missing </head> in {path.name}")
            fixed = fixed.replace(marker, '    <script src="/assets/locale-boot.js?v=1"></script>\n  </head>', 1)
        write_if_changed(path, fixed)


def create_test() -> None:
    path = ROOT / "tests" / "i18n-runtime-hardening.test.mjs"
    text = '''import test from "node:test";\nimport assert from "node:assert/strict";\nimport fs from "node:fs";\nimport path from "node:path";\n\nconst root = process.cwd();\nconst read = p => fs.readFileSync(path.join(root,p),"utf8");\n\ntest("localized app pages hide German first paint until catalog is ready", () => {\n  for (const page of ["registrieren.html","anmelden.html","erster-schritt.html"]) {\n    assert.match(read(page), /\\/assets\\/locale-boot\\.js\\?v=1/);\n  }\n  assert.match(read("assets/auth-i18n.js"), /revealLocalizedPage/);\n});\n\ntest("registration runtime repairs mixed-language composite WhatsApp labels", () => {\n  const js = read("assets/auth-i18n.js");\n  assert.match(js, /repairRegistrationSurface/);\n  assert.match(js, /Web account \\+/);\n  assert.match(js, /Web hesabı \\+/);\n  assert.match(js, /Welcome to/);\n  assert.match(js, /Kişisel Concierge/);\n});\n\ntest("runtime-created asset URLs are root absolute", () => {\n  const files = fs.readdirSync(path.join(root,"assets")).filter(name => name.endsWith(".js"));\n  for (const name of files) {\n    const js = read(path.join("assets",name));\n    assert.doesNotMatch(js, /["'`]assets\\//, `${name} contains a path-relative runtime asset`);\n  }\n  const carousel = read("assets/concierge-carousel.js");\n  assert.match(carousel, /`\\/assets\\/voice\\/samples\\/\\$\\{key\\}-\\$\\{code\\}\\.mp3/);\n});\n\ntest("localized public runtime repairs late-added asset references", () => {\n  const js = read("assets/locale-runtime.js");\n  assert.match(js, /repairAssetRefs/);\n  assert.match(js, /attributeFilter: \\['src','srcset','data-src','data-srcset','poster'\\]/);\n});\n\ntest("overview journey copy is authored in German English and Turkish", () => {\n  const js = read("assets/acquisition-v1.js");\n  for (const phrase of ["Kostenlos registrieren","Register for free","Ücretsiz kayıt ol","NAHWERK stays on it","NAHWERK takipte kalır"]) {\n    assert.ok(js.includes(phrase), `missing ${phrase}`);\n  }\n});\n'''
    write_if_changed(path, text)


def main() -> None:
    absolutize_runtime_assets()
    patch_acquisition()
    patch_locale_runtime()
    patch_auth_i18n()
    create_locale_boot()
    patch_html_versions_and_boot()
    create_test()
    print("i18n runtime hardening complete")


if __name__ == "__main__":
    main()
