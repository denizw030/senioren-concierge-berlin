import json
import math
import os
import time
import urllib.request
from pathlib import Path

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

BASE = "https://nahwerkconcierge.com"
MERGE_SHA = "4c454e6031ab83e37ca4ddbd3d29e96fdd84245b"
OUT = Path("production-proof")
OUT.mkdir(exist_ok=True)

URLS = {
    "homepage": f"{BASE}/",
    "telephone": f"{BASE}/telefonannahme.html",
    "hero": f"{BASE}/assets/prime/nahwerk-overview-hero-weboptimized-hq.webp",
    "alexander": f"{BASE}/assets/voice/alexander-telefon-agent-v2.webp",
    "luisa": f"{BASE}/assets/voice/agents/luisa.webp",
    "konrad": f"{BASE}/assets/voice/agents/konrad.webp",
    "james": f"{BASE}/assets/voice/agents/james.webp",
}


def http_get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "NAHWERK-production-release-proof/1.0"})
    started = time.monotonic()
    with urllib.request.urlopen(req, timeout=30) as response:
        body = response.read()
        return {
            "url": url,
            "status": response.status,
            "bytes": len(body),
            "contentType": response.headers.get("Content-Type"),
            "elapsedMs": round((time.monotonic() - started) * 1000, 1),
            "finalUrl": response.geturl(),
        }


def image_state(driver, element):
    return driver.execute_script(
        """
        const img=arguments[0];
        return {complete:img.complete,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,currentSrc:img.currentSrc||img.src};
        """,
        element,
    )


def wait_image(driver, element):
    WebDriverWait(driver, 20).until(
        lambda _d: image_state(driver, element)["complete"] and image_state(driver, element)["naturalWidth"] > 0
    )
    return image_state(driver, element)


def pixel_stats(driver, element):
    return driver.execute_script(
        """
        const img=arguments[0];
        const c=document.createElement('canvas');
        c.width=32;c.height=40;
        const x=c.getContext('2d',{willReadFrequently:true});
        x.drawImage(img,0,0,c.width,c.height);
        const d=x.getImageData(0,0,c.width,c.height).data;
        let n=0,sum=0,sum2=0,min=255,max=0,nonDark=0;
        for(let i=0;i<d.length;i+=4){
          if(d[i+3]===0) continue;
          const lum=0.2126*d[i]+0.7152*d[i+1]+0.0722*d[i+2];
          n++;sum+=lum;sum2+=lum*lum;min=Math.min(min,lum);max=Math.max(max,lum);if(lum>20)nonDark++;
        }
        const mean=n?sum/n:0;
        const variance=n?Math.max(0,sum2/n-mean*mean):0;
        return {samples:n,minLum:min,maxLum:max,meanLum:mean,stdLum:Math.sqrt(variance),nonDarkRatio:n?nonDark/n:0};
        """,
        element,
    )


def assert_portrait(name, state, stats):
    assert state["complete"], f"{name}: image not complete"
    assert state["naturalWidth"] > 0 and state["naturalHeight"] > 0, f"{name}: image decode failed {state}"
    assert stats["samples"] > 500, f"{name}: too few rendered pixels {stats}"
    assert stats["maxLum"] > 35, f"{name}: image appears black {stats}"
    assert stats["stdLum"] > 8, f"{name}: image appears visually empty/flat {stats}"
    assert stats["nonDarkRatio"] > 0.05, f"{name}: image overwhelmingly black {stats}"


def navigation(driver):
    expected = {
        "Übersicht": "index.html",
        "Concierge": "prime-concierge.html",
        "Safety": "safety.html",
        "Family": "angehoerige.html",
        "Telefon": "telefonannahme.html",
        "Tarife": "pakete.html",
    }
    result = {}
    for label, suffix in expected.items():
        links = driver.find_elements(By.CSS_SELECTOR, ".top .links a")
        match = next((a for a in links if a.text.strip() == label), None)
        assert match is not None, f"navigation missing {label}"
        href = match.get_attribute("href") or ""
        assert href.endswith(suffix), f"navigation {label}: {href}"
        result[label] = href
    return result


def new_driver(width, height):
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-gpu")
    options.add_argument("--hide-scrollbars")
    options.add_argument(f"--window-size={width},{height}")
    options.add_argument("--force-device-scale-factor=1")
    options.set_capability("goog:loggingPrefs", {"browser": "ALL"})
    driver = webdriver.Chrome(options=options)
    driver.set_page_load_timeout(30)
    driver.set_window_size(width, height)
    return driver


report = {
    "mergeSha": MERGE_SHA,
    "base": BASE,
    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "http": {},
    "viewports": [],
}

for name, url in URLS.items():
    probe = http_get(url)
    assert probe["status"] == 200, f"HTTP {name}: {probe}"
    assert probe["bytes"] > 1000, f"HTTP {name}: suspiciously small response {probe}"
    report["http"][name] = probe

for width, height, label in [(1440, 1000, "desktop"), (390, 844, "mobile")]:
    driver = new_driver(width, height)
    viewport = {"label": label, "width": width, "height": height, "homepage": {}, "telephone": {}}
    try:
        driver.get(f"{BASE}/?release-proof={MERGE_SHA}")
        WebDriverWait(driver, 20).until(lambda d: d.execute_script("return document.readyState") == "complete")
        h1 = driver.find_element(By.TAG_NAME, "h1").text.strip()
        assert "Ein persönlicher Concierge, der erledigt." in h1, f"homepage hero copy mismatch: {h1!r}"
        hero = driver.find_element(By.CSS_SELECTOR, "img.story-hero-art")
        hero_state = wait_image(driver, hero)
        assert hero_state["currentSrc"].split("?")[0].endswith("/assets/prime/nahwerk-overview-hero-weboptimized-hq.webp"), hero_state
        assert driver.execute_script("return document.documentElement.scrollWidth <= window.innerWidth + 4"), "homepage horizontal overflow"
        viewport["homepage"] = {
            "h1": h1,
            "hero": hero_state,
            "navigation": navigation(driver),
            "scrollWidth": driver.execute_script("return document.documentElement.scrollWidth"),
            "innerWidth": driver.execute_script("return window.innerWidth"),
        }
        driver.save_screenshot(str(OUT / f"homepage-{label}.png"))

        driver.get(f"{BASE}/telefonannahme.html?release-proof={MERGE_SHA}")
        WebDriverWait(driver, 20).until(lambda d: d.execute_script("return document.readyState") == "complete")
        assert driver.find_element(By.TAG_NAME, "h1").text.strip() == "NAHWERK geht für Sie ans Telefon."
        nav = navigation(driver)
        cards = driver.find_elements(By.CSS_SELECTOR, "#telephoneAgentGrid .tr-agent-card")
        assert len(cards) == 4, f"expected four agent cards, got {len(cards)}"
        names = [c.find_element(By.TAG_NAME, "h3").text.strip() for c in cards]
        assert names == ["Alexander", "Luisa", "Konrad", "James"], names
        assert cards[0].is_displayed() and cards[1].is_displayed(), "Alexander/Luisa must be initially visible"
        assert not cards[2].is_displayed() and not cards[3].is_displayed(), "Konrad/James must start hidden"

        before = {}
        for idx, name in enumerate(["Alexander", "Luisa"]):
            img = cards[idx].find_element(By.TAG_NAME, "img")
            state = wait_image(driver, img)
            stats = pixel_stats(driver, img)
            assert_portrait(name, state, stats)
            before[name] = {"image": state, "pixels": stats, "visible": cards[idx].is_displayed()}
        driver.save_screenshot(str(OUT / f"telephone-before-reveal-{label}.png"))

        reveal = driver.find_element(By.CSS_SELECTOR, "button[data-tr-show-agents]")
        driver.execute_script("arguments[0].scrollIntoView({block:'center'})", reveal)
        reveal.click()
        WebDriverWait(driver, 10).until(lambda _d: cards[2].is_displayed() and cards[3].is_displayed())
        assert reveal.get_attribute("aria-expanded") == "true", "reveal aria-expanded must be true"

        after = {}
        for idx, name in enumerate(["Alexander", "Luisa", "Konrad", "James"]):
            img = cards[idx].find_element(By.TAG_NAME, "img")
            state = wait_image(driver, img)
            stats = pixel_stats(driver, img)
            assert_portrait(name, state, stats)
            assert cards[idx].is_displayed(), f"{name} not visible after reveal"
            after[name] = {"image": state, "pixels": stats, "visible": True}
        assert driver.execute_script("return document.documentElement.scrollWidth <= window.innerWidth + 4"), "telephone horizontal overflow"
        driver.save_screenshot(str(OUT / f"telephone-after-reveal-{label}.png"))

        severe = [entry for entry in driver.get_log("browser") if entry.get("level") == "SEVERE"]
        viewport["telephone"] = {
            "names": names,
            "navigation": nav,
            "beforeReveal": before,
            "afterReveal": after,
            "ariaExpanded": reveal.get_attribute("aria-expanded"),
            "scrollWidth": driver.execute_script("return document.documentElement.scrollWidth"),
            "innerWidth": driver.execute_script("return window.innerWidth"),
            "severeConsole": severe,
        }
        report["viewports"].append(viewport)
    finally:
        driver.quit()

Path(OUT / "report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
print(json.dumps({
    "result": "PRODUCTION_BROWSER_GREEN",
    "mergeSha": MERGE_SHA,
    "http": {k: {"status": v["status"], "bytes": v["bytes"]} for k, v in report["http"].items()},
    "viewports": [
        {
            "label": v["label"],
            "hero": v["homepage"]["hero"],
            "agents": {k: x["image"] for k, x in v["telephone"]["afterReveal"].items()},
            "reveal": v["telephone"]["ariaExpanded"],
        }
        for v in report["viewports"]
    ],
}, ensure_ascii=False))
