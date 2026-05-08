import json
import re
import shutil
import sys
import time
from html import unescape
from pathlib import Path
from urllib.error import URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from bs4 import BeautifulSoup, Comment

ROOT = Path(r"F:\WebTool\toolsite")
CACHE_PATH = ROOT / "scripts" / ".residual-translation-cache.json"
LOCALES = ["es", "fr", "ar", "bn", "pt", "ru", "ur", "id", "de", "pcm", "mr", "te", "tr", "ta"]
TARGET_ROUTES = [
    "index.html",
    "toolbox/index.html",
    "toolbox/camera/index.html",
    "toolbox/dead-pixel/index.html",
    "toolbox/keyboard/index.html",
    "toolbox/keyboard/apple-keyboard/index.html",
    "toolbox/mic/index.html",
    "toolbox/mouse/index.html",
    "toolbox/mouse/instruction/index.html",
    "toolbox/mouse/principle/index.html",
    "toolbox/mouse/cps/index.html",
    "toolbox/mouse/polling-rate/index.html",
    "toolbox/mouse/scroll-wheel/index.html",
    "toolbox/mouse/double-click/index.html",
    "toolbox/mouse/double-click/instruction/index.html",
    "toolbox/mouse/double-click/principle/index.html",
    "utility-tools/index.html",
    "utility-tools/design-media/app-icon-generator/index.html",
    "utility-tools/math/password-generator/index.html",
    "utility-tools/netdev/post-tool/index.html",
    "utility-tools/netdev/websocket-test/index.html",
]

BRAND_TOKENS = {
    "StarryRing": "__STARRYRING__",
    "KeyCheck Pro": "__KEYCHECKPRO__",
    "Starry Tool": "__STARRYTOOL__",
    "Starry Toolbox": "__STARRYTOOLBOX__",
    "CyberPass Pro": "__CYBERPASSPRO__",
    "HardwareTest": "__HARDWARETEST__",
}

PCM_MANUAL = {
    "Mouse Test": "Mouse test",
    "Keyboard Test": "Keyboard test",
    "Mic Test": "Mic test",
    "App Icon Generator": "App icon generator",
    "Password Generator": "Password generator",
    "WebSocket test tool": "Tool to test WebSocket",
    "WebSocket Online Test Tool - Free WS/WSS Client | StarryRing": "Online WebSocket test tool - free WS/WSS client | StarryRing",
    "Online WebSocket Test Tool": "Online WebSocket test tool",
    "Free online WebSocket testing tool. Supports WS/WSS connections, custom headers, message stats, templates, log search. No download, fast debugging.": "Free online WebSocket testing tool. E support WS/WSS connection, custom headers, message stats, templates, and log search. No download, fast debugging.",
    "App Icon Studio - Smart Icon Generator | Free Online App Icon Maker | StarryRing": "App Icon Studio - smart icon generator | free online app icon maker | StarryRing",
    "Free online app icon generator. Create full-size iOS & Android icons with real-time preview, smart cropping, and batch export.": "Free online app icon generator. Create full-size iOS and Android icons with real-time preview, smart cropping, and batch export.",
    "CyberPass Pro - Password Generator": "CyberPass Pro - password generator",
    "Free online password generator, create high-strength, secure random passwords. Character-level control, password strength analysis, batch generation for enhanced account security.": "Free online password generator. Create strong secure random passwords. Character-level control, password strength analysis, and batch generation for better account security.",
}


def load_cache():
    if CACHE_PATH.exists():
        try:
            return json.loads(CACHE_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return {}
    return {}


def save_cache(cache):
    CACHE_PATH.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")


CACHE = load_cache()


def protect_text(text: str) -> str:
    for source, token in BRAND_TOKENS.items():
        text = text.replace(source, token)
    return text


def unprotect_text(text: str) -> str:
    for source, token in BRAND_TOKENS.items():
        text = text.replace(token, source)
    return text


def should_translate_text(text: str) -> bool:
    normalized = " ".join(text.split()).strip()
    if not normalized:
        return False
    if normalized.startswith(("http", "/", "@", "#", ".")):
        return False
    if "starryring.com/" in normalized.lower():
        return False
    if re.fullmatch(r"[\d\s:.,\-–—+/|()%&]+", normalized):
        return False
    if len(re.findall(r"[A-Za-z]{3,}", normalized)) == 0:
        return False
    return True


def translate(text: str, locale_code: str) -> str:
    if locale_code == "pcm":
        return PCM_MANUAL.get(text, text)

    locale_cache = CACHE.setdefault(locale_code, {})
    if text in locale_cache:
        return locale_cache[text]

    protected = protect_text(text)
    url = (
        "https://translate.googleapis.com/translate_a/single"
        f"?client=gtx&sl=en&tl={locale_code}&dt=t&q={quote(protected)}"
    )
    translated = None
    for attempt in range(4):
        try:
            request = Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urlopen(request, timeout=30) as response:
                data = json.loads(response.read().decode("utf-8"))
            translated = "".join(part[0] for part in data[0] if part and part[0])
            break
        except (URLError, TimeoutError, FileNotFoundError, json.JSONDecodeError):
            time.sleep(0.8 * (attempt + 1))
    translated = unescape(unprotect_text(translated or text))
    locale_cache[text] = translated
    return translated


def localize_page(locale_code: str, route: str):
    path = ROOT / locale_code / route
    if not path.exists():
        return 0, []

    original = path.read_text(encoding="utf-8", errors="ignore")
    soup = BeautifulSoup(original, "html.parser")
    translations = {}
    refs = []

    for element in soup.find_all(string=True):
        if isinstance(element, Comment):
            continue
        parent = element.parent
        if parent and parent.name in {"script", "style"}:
            continue
        if parent and parent.find_parent(class_="language-dropdown"):
            continue
        normalized = " ".join(str(element).split()).strip()
        if should_translate_text(normalized):
            translated = translations.setdefault(normalized, translate(normalized, locale_code))
            if translated:
                element.replace_with(translated)

    for tag in soup.find_all(True):
        if tag.find_parent(class_="language-dropdown"):
            continue
        for attr in ("content", "title", "placeholder", "aria-label", "alt"):
            value = tag.get(attr)
            if not value:
                continue
            if attr == "content":
                if tag.name != "meta":
                    continue
                if tag.get("name") not in {"description", "twitter:title", "twitter:description", "author", "copyright"} and tag.get("property") not in {"og:title", "og:description", "og:image:alt", "og:site_name"}:
                    continue
            if should_translate_text(value):
                translated = translations.setdefault(value, translate(value, locale_code))
                tag[attr] = translated

    html = str(soup)
    for source, target in translations.items():
        html = html.replace(source, target)

    replacements = [
        ("/script-en.js", f"/script-{locale_code}.js"),
        ("/home-en.js", f"/home-{locale_code}.js"),
        ("/en-main.js", f"/{locale_code}-main.js"),
    ]
    for old, new in replacements:
        if old in html:
            for m in re.findall(rf'(/static/js/[^"\']+){re.escape(old)}', html):
                refs.append((m + old, m + new))
            html = html.replace(old, new)

    html = html.replace("HTML<html", "<!DOCTYPE html>\n<html")
    if not html.lstrip().lower().startswith("<!doctype html>"):
        html = "<!DOCTYPE html>\n" + html.lstrip()
    html = html.replace(" - English Version", "")
    for source, token in BRAND_TOKENS.items():
        html = html.replace(token, source)
    html = re.sub(r"__[^_]{1,80}__", lambda m: m.group(0).strip("_"), html)
    path.write_text(html, encoding="utf-8")
    save_cache(CACHE)
    changed = sum(1 for s, t in translations.items() if s != t)
    return changed, refs


def copy_script_ref(source_ref: str, target_ref: str):
    source_path = ROOT / source_ref.lstrip("/").replace("/", "\\")
    target_path = ROOT / target_ref.lstrip("/").replace("/", "\\")
    if source_path.exists():
        target_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source_path, target_path)


def main():
    selected = sys.argv[1:] or LOCALES
    for locale_code in selected:
        refs = set()
        total_changed = 0
        for route in TARGET_ROUTES:
            changed, route_refs = localize_page(locale_code, route)
            total_changed += changed
            refs.update(route_refs)
            print(f"{locale_code} {route}: {changed}", flush=True)
        for source_ref, target_ref in sorted(refs):
            copy_script_ref(source_ref, target_ref)
        print(f"{locale_code} total changed: {total_changed}, script copies: {len(refs)}", flush=True)


if __name__ == "__main__":
    main()
