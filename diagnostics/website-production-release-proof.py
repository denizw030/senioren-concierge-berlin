import json
import time
import urllib.parse
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
    "primeConcierge": f"{BASE}/prime-concierge.html",
    "concierges": f"{BASE}/concierges.html",
    "seniorConcierge": f"{BASE}/senioren-concierge.html",
    "services": f"{BASE}/leistungen.html",
    "contact": f"{BASE}/kontakt.html",
    "hero": f"{BASE}/assets/prime/nahwerk-overview-hero-weboptimized-hq.webp",
    "alexander": f"{BASE}/assets/voice/alexander-telefon-agent-v2.webp",
    "luisa": f"{BASE}/assets/voice/agents/luisa.webp",
    "konrad": f"{BASE}/assets/voice/agents/konrad.webp",
    "james": f"{BASE}/assets/voice/agents/james.webp",
}

RUNTIME_NAV = {
    "Übersicht": "index.html",
    "Persönlicher Concierge": "prime-concierge.html",
    "Concierges": "concierges.html",
    "Senioren Concierge": "senioren-concierge.html",
    "Für Angehörige": "senioren-concierge.html#angehoerige",
    "Leistungen": "leistungen.html",
    "Kontakt": "kontakt.html",
}


def http_get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "NAHWERK-production-release-proof/1.1"})
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
        const r=img.getBoundingClientRect();
        const s=getComputedStyle(img);
        return {
          complete:img.complete,
          naturalWidth:img.naturalWidth,
          naturalHeight:img.naturalHeight,
          currentSrc:img.currentSrc||img.src,
          displayed:!!(r.width>0 && r.height>0 && s.display!=='none' && s.visibility!=='hidden' && Number(s.opacity)>0),
          rect:{x:r.x,y:r.y,width:r.width,height:r.height},
          objectFit:s.objectFit,
          objectPosition:s.objectPosition
        };
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


def assert_rendered_image(name, state, stats, *, hero=False):
    assert state["complete"], f"{name}: image not complete"
    assert state["naturalWidth"] > 0 and state["naturalHeight"] > 0, f"{name}: image decode failed {state}"
    assert state["displayed"], f"{name}: image not visibly rendered {state}"
    assert state["rect"]["width"] > 20 and state["rect"]["height"] > 20, f"{name}: rendered box too small {state}"
    assert stats["samples"] > 500, f"{name}: too few rendered pixels {stats}"
    if hero:
        assert stats["maxLum"] > 20, f"{name}: hero appears black {stats}"
        assert stats["stdLum"] > 4, f"{name}: hero appears visually empty/flat {stats}"
        assert stats["nonDarkRatio"] > 0.01, f"{name}: hero overwhelmingly black {stats}"
    else:
        assert stats["maxLum"] > 35, f"{name}: image appears black {stats}"
        assert stats["stdLum"] > 8, f"{name}: image appears visually empty/flat {stats}"
        assert stats["nonDarkRatio"] > 0.05, f"{name}: image overwhelmingly black {stats}"


def runtime_navigation(driver):
    WebDriverWait(driver, 20).until(
        lambda d: any(
            (a.get_attribute("textContent") or "").strip() == "Persönlicher Concierge"
            for a in d.find_elements(By.CSS_SELECTOR, ".top .links a")
        )
    )
    links = driver.find_elements(By.CSS_SELECTOR, ".top .links a")
    rendered = {}
    for a in links:
        label = (a.get_attribute("textContent") or "").strip()
        if label:
            rendered[label] = a.get_attribute("href") or ""
    for label, suffix in RUNTIME_NAV.items():
        assert label in rendered, f"runtime navigation missing {label}; got {sorted(rendered)}"
        href = rendered[label]
        assert href.endswith(suffix), f"runtime navigation {label}: expected *{suffix}, got {href}"
    return rendered


def open_mobile_navigation(driver):
    if driver.execute_script("return window.innerWidth") > 1280:
        return {"mobile": False, "usable": True}
    toggle = driver.find_element(By.CSS_SELECTOR, ".top .nav-toggle")
    assert toggle.is_displayed(), "mobile navigation toggle not visible"
    if toggle.get_attribute("aria-expanded") != "true":
        toggle.click()
    WebDriverWait(driver, 10).until(
        lambda d: "is-open" in (d.find_element(By.CSS_SELECTOR, ".top .links").get_attribute("class") or "")
    )
    nav = driver.find_element(By.CSS_SELECTOR, ".top .links")
    assert nav.is_displayed(), "mobile navigation did not become visible"
    prime = next(
        a for a in driver.find_elements(By.CSS_SELECTOR, ".top .links a")
        if (a.get_attribute("textContent") or "").strip() == "Persönlicher Concierge"
    )
    assert prime.is_displayed(), "mobile runtime navigation links are not usable"
    return {"mobile": True, "usable": True, "ariaExpanded": toggle.get_attribute("aria-expanded")}


def js_runtime_errors(driver):
    severe = [entry for entry in driver.get_log("browser") if entry.get("level") == "SEVERE"]
    runtime_tokens = ("Uncaught", "TypeError", "ReferenceError", "SyntaxError", "RangeError", "EvalError")
    runtime = [entry for entry in severe if any(token in entry.get("message", "") for token in runtime_tokens)]
    return severe, runtime


def assert_no_horizontal_overflow(driver, page):
    values = driver.execute_script(
        "return {scrollWidth:document.documentElement.scrollWidth,innerWidth:window.innerWidth}"
    )
    assert values["scrollWidth"] <= values["innerWidth"] + 4, f"{page}: horizontal overflow {values}"
    return values


def assert_visible_box(driver, selector, name):
    element = driver.find_element(By.CSS_SELECTOR, selector)
    state = driver.execute_script(
        """
        const e=arguments[0],r=e.getBoundingClientRect(),s=getComputedStyle(e);
        return {displayed:!!(r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)>0),rect:{x:r.x,y:r.y,width:r.width,height:r.height}};
        """,
        element,
    )
    assert state["displayed"], f"{name}: not visibly rendered {state}"
    return state


def click_runtime_target(driver, label, suffix):
    open_mobile_navigation(driver)
    link = next(
        a for a in driver.find_elements(By.CSS_SELECTOR, ".top .links a")
        if (a.get_attribute("textContent") or "").strip() == label
    )
    assert link.is_displayed(), f"navigation target {label} not visible for click"
    driver.execute_script("arguments[0].scrollIntoView({block:'center'})", link)
    link.click()
    WebDriverWait(driver, 20).until(lambda d: urllib.parse.urlparse(d.current_url).path.endswith(suffix))
    WebDriverWait(driver, 20).until(lambda d: d.execute_script("return document.readyState") == "complete")
    severe, runtime = js_runtime_errors(driver)
    assert not runtime, f"{label}: JS runtime error after navigation {runtime}"
    return {"url": driver.current_url, "severeConsole": severe, "runtimeErrors": runtime}


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
    viewport = {"label": label, "width": width, "height": height, "homepage": {}, "telephone": {}, "navigationClicks": {}}
    try:
        homepage_url = f"{BASE}/?release-proof={MERGE_SHA}"
        driver.get(homepage_url)
        WebDriverWait(driver, 20).until(lambda d: d.execute_script("return document.readyState") == "complete")

        h1 = driver.find_element(By.TAG_NAME, "h1").text.strip()
        assert "Ein persönlicher Concierge, der erledigt." in h1, f"homepage hero copy mismatch: {h1!r}"
        nav = runtime_navigation(driver)
        mobile_nav = open_mobile_navigation(driver)
        if mobile_nav["mobile"]:
            driver.find_element(By.CSS_SELECTOR, ".top .nav-toggle").click()
            WebDriverWait(driver, 10).until(
                lambda d: "is-open" not in (d.find_element(By.CSS_SELECTOR, ".top .links").get_attribute("class") or "")
            )

        hero = driver.find_element(By.CSS_SELECTOR, "img.story-hero-art")
        hero_state = wait_image(driver, hero)
        hero_stats = pixel_stats(driver, hero)
        assert hero_state["currentSrc"].split("?")[0].endswith("/assets/prime/nahwerk-overview-hero-weboptimized-hq.webp"), hero_state
        assert_rendered_image("Homepage hero", hero_state, hero_stats, hero=True)
        cta_state = assert_visible_box(driver, ".home-hero .overview-hero-cta-primary", "Homepage primary CTA")
        overflow = assert_no_horizontal_overflow(driver, "homepage")
        severe, runtime = js_runtime_errors(driver)
        assert not runtime, f"homepage JS runtime errors: {runtime}"

        viewport["homepage"] = {
            "h1": h1,
            "hero": hero_state,
            "heroPixels": hero_stats,
            "cta": cta_state,
            "navigation": nav,
            "mobileNavigation": mobile_nav,
            "layout": overflow,
            "severeConsole": severe,
            "runtimeErrors": runtime,
        }
        driver.save_screenshot(str(OUT / f"homepage-{label}.png"))

        for nav_label, suffix in [
            ("Persönlicher Concierge", "prime-concierge.html"),
            ("Concierges", "concierges.html"),
        ]:
            driver.get(homepage_url)
            WebDriverWait(driver, 20).until(lambda d: d.execute_script("return document.readyState") == "complete")
            runtime_navigation(driver)
            viewport["navigationClicks"][nav_label] = click_runtime_target(driver, nav_label, suffix)

        driver.get(f"{BASE}/telefonannahme.html?release-proof={MERGE_SHA}")
        WebDriverWait(driver, 20).until(lambda d: d.execute_script("return document.readyState") == "complete")
        assert driver.find_element(By.TAG_NAME, "h1").text.strip() == "NAHWERK geht für Sie ans Telefon."
        nav = runtime_navigation(driver)
        mobile_nav = open_mobile_navigation(driver)
        if mobile_nav["mobile"]:
            driver.find_element(By.CSS_SELECTOR, ".top .nav-toggle").click()
            WebDriverWait(driver, 10).until(
                lambda d: "is-open" not in (d.find_element(By.CSS_SELECTOR, ".top .links").get_attribute("class") or "")
            )

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
            assert_rendered_image(name, state, stats)
            before[name] = {"image": state, "pixels": stats, "visible": cards[idx].is_displayed()}
        driver.save_screenshot(str(OUT / f"telephone-before-reveal-{label}.png"))

        reveal = driver.find_element(By.CSS_SELECTOR, "button[data-tr-show-agents]")
        driver.execute_script("arguments[0].scrollIntoView({block:'center'})", reveal)
        assert reveal.is_displayed(), "agent reveal control not visible"
        reveal.click()
        WebDriverWait(driver, 10).until(lambda _d: cards[2].is_displayed() and cards[3].is_displayed())
        assert reveal.get_attribute("aria-expanded") == "true", "reveal aria-expanded must be true"

        after = {}
        for idx, name in enumerate(["Alexander", "Luisa", "Konrad", "James"]):
            img = cards[idx].find_element(By.TAG_NAME, "img")
            state = wait_image(driver, img)
            stats = pixel_stats(driver, img)
            assert_rendered_image(name, state, stats)
            assert cards[idx].is_displayed(), f"{name} not visible after reveal"
            after[name] = {"image": state, "pixels": stats, "visible": True}

        overflow = assert_no_horizontal_overflow(driver, "telephone")
        driver.save_screenshot(str(OUT / f"telephone-after-reveal-{label}.png"))
        severe, runtime = js_runtime_errors(driver)
        assert not runtime, f"telephone JS runtime errors: {runtime}"

        viewport["telephone"] = {
            "names": names,
            "navigation": nav,
            "mobileNavigation": mobile_nav,
            "beforeReveal": before,
            "afterReveal": after,
            "ariaExpanded": reveal.get_attribute("aria-expanded"),
            "layout": overflow,
            "severeConsole": severe,
            "runtimeErrors": runtime,
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
            "navigation": {
                "Persönlicher Concierge": v["homepage"]["navigation"]["Persönlicher Concierge"],
                "Concierges": v["homepage"]["navigation"]["Concierges"],
            },
            "navigationClicks": v["navigationClicks"],
            "hero": v["homepage"]["hero"],
            "agents": {k: x["image"] for k, x in v["telephone"]["afterReveal"].items()},
            "reveal": v["telephone"]["ariaExpanded"],
            "homepageRuntimeErrors": v["homepage"]["runtimeErrors"],
            "telephoneRuntimeErrors": v["telephone"]["runtimeErrors"],
        }
        for v in report["viewports"]
    ],
}, ensure_ascii=False))
