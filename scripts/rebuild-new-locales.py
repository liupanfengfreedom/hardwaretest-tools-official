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
SOURCE_LOCALE = "en"
TARGET_LOCALES = ["es", "fr", "ar", "bn", "pt", "ru", "ur", "id", "de", "pcm", "mr", "te", "tr", "ta"]
CACHE_PATH = ROOT / "scripts" / ".full-localization-cache.json"
RTL_LOCALES = {"ar", "ur"}
ENGLISH_ROUTE_ROOT = ROOT / SOURCE_LOCALE
ROUTES = sorted(path.relative_to(ENGLISH_ROUTE_ROOT).as_posix() for path in ENGLISH_ROUTE_ROOT.rglob("*.html"))

TRANSLATABLE_META_NAMES = {"description", "keywords", "twitter:title", "twitter:description"}
TRANSLATABLE_META_PROPERTIES = {"og:title", "og:description", "og:image:alt"}
TRANSLATABLE_ATTRS = ("title", "placeholder", "aria-label", "alt")
URL_ATTRS = ("href", "src", "action", "content")
SCRIPT_SUFFIX_REPLACEMENTS = [
    ("/script-en.js", "/script-{locale}.js"),
    ("/home-en.js", "/home-{locale}.js"),
    ("/en-main.js", "/{locale}-main.js"),
]

BRAND_TOKENS = {
    "StarryRing": "__STARRYRING__",
    "KeyCheck Pro": "__KEYCHECKPRO__",
    "Starry Tool": "__STARRYTOOL__",
    "Starry Toolbox": "__STARRYTOOLBOX__",
    "CyberPass Pro": "__CYBERPASSPRO__",
    "HardwareTest": "__HARDWARETEST__",
}

PCM_PHRASES = {
    "About Us": "About us",
    "Contact Us": "Contact us",
    "Disclaimer": "Disclaimer",
    "Privacy Policy": "Privacy policy",
    "Terms of Service": "Terms of service",
    "Toolbox": "Toolbox",
    "Utility Tools": "Utility tools",
    "Mouse Test": "Mouse test",
    "Keyboard Test": "Keyboard test",
    "Mic Test": "Mic test",
    "Speaker Test": "Speaker test",
    "Camera Test": "Camera test",
    "Dead Pixel Test": "Dead pixel test",
    "Password Generator": "Password generator",
    "Random Number Generator": "Random number generator",
    "Currency Converter": "Currency converter",
    "JSON Parser": "JSON parser",
    "QR Code Generator": "QR code generator",
    "WebSocket Test": "WebSocket test",
    "Click to view": "Click make you open am",
    "Currently viewing": "Na dis you dey view now",
    "Learn more": "Learn more",
    "How to use": "How to use am",
    "Free online": "Free online",
    "Generate": "Generate",
    "Convert": "Convert",
    "Test": "Test",
    "Calculator": "Calculator",
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
    if normalized.startswith(("http", "/", "#", "@", "mailto:", "tel:")):
        return False
    if "starryring.com/" in normalized.lower():
        return False
    if re.fullmatch(r"[\d\s:.,\-–—+/|()%&=<>[\]{}]+", normalized):
        return False
    return len(re.findall(r"[A-Za-z]{3,}", normalized)) > 0


def pcm_translate(text: str) -> str:
    translated = text
    for source, target in sorted(PCM_PHRASES.items(), key=lambda item: -len(item[0])):
        translated = translated.replace(source, target)
    return translated


def translate_chunk(payload: str, locale_code: str) -> str:
    if locale_code == "pcm":
        return pcm_translate(payload)

    protected = protect_text(payload)
    url = (
        "https://translate.googleapis.com/translate_a/single"
        f"?client=gtx&sl=en&tl={locale_code}&dt=t&q={quote(protected)}"
    )
    last_error = None
    for attempt in range(5):
        try:
            request = Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urlopen(request, timeout=60) as response:
                data = json.loads(response.read().decode("utf-8"))
            translated = "".join(part[0] for part in data[0] if part and part[0])
            return unescape(unprotect_text(translated))
        except (URLError, TimeoutError, json.JSONDecodeError) as exc:
            last_error = exc
            time.sleep(1.2 * (attempt + 1))
    raise RuntimeError(f"translate chunk failed for {locale_code}: {last_error}")


def translate_texts(texts, locale_code: str):
    locale_cache = CACHE.setdefault(locale_code, {})
    uncached = [text for text in texts if text not in locale_cache]
    if not uncached:
        return {text: locale_cache[text] for text in texts}

    max_chars = 3200
    while uncached:
        batch = []
        length = 0
        while uncached:
            candidate = uncached[0]
            marker = f"__SRSEP{len(batch)}__"
            added = len(marker) + len(candidate) + 2
            if batch and length + added > max_chars:
                break
            batch.append(uncached.pop(0))
            length += added

        payload = "\n".join(f"__SRSEP{index}__{text}" for index, text in enumerate(batch))
        translated_payload = translate_chunk(payload, locale_code)
        pieces = re.split(r"__SRSEP(\d+)__", translated_payload)

        translated_map = {}
        if len(pieces) > 1:
            for index in range(1, len(pieces), 2):
                key = int(pieces[index])
                value = pieces[index + 1].strip()
                if key < len(batch):
                    translated_map[batch[key]] = value

        if len(translated_map) != len(batch):
            for text in batch:
                translated_map[text] = translate_chunk(text, locale_code)

        for source, target in translated_map.items():
            locale_cache[source] = target or source
        save_cache(CACHE)

    return {text: locale_cache[text] for text in texts}


def localize_site_url(value: str, locale_code: str) -> str:
    if not value:
        return value
    value = value.replace("https://starryring.com/en/", f"https://starryring.com/{locale_code}/")
    if value.startswith("/en/"):
        return value.replace("/en/", f"/{locale_code}/", 1)
    return value


def collect_page_strings(soup: BeautifulSoup):
    strings = set()

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
            strings.add(normalized)

    for tag in soup.find_all(True):
        if tag.find_parent(class_="language-dropdown"):
            continue
        for attr in TRANSLATABLE_ATTRS:
            value = tag.get(attr)
            if should_translate_text(value or ""):
                strings.add(" ".join(value.split()).strip())

        if tag.name == "meta":
            meta_name = tag.get("name")
            meta_property = tag.get("property")
            value = tag.get("content")
            if value and (
                meta_name in TRANSLATABLE_META_NAMES or
                meta_property in TRANSLATABLE_META_PROPERTIES
            ) and should_translate_text(value):
                strings.add(" ".join(value.split()).strip())

    for script_tag in soup.find_all("script", attrs={"type": "application/ld+json"}):
        try:
            payload = json.loads(script_tag.string or script_tag.get_text())
        except json.JSONDecodeError:
            continue
        strings.update(collect_json_strings(payload))

    return strings


def collect_json_strings(payload):
    strings = set()
    if isinstance(payload, dict):
        for key, value in payload.items():
            if isinstance(value, str) and key in {"name", "description", "caption", "headline", "text", "alternateName"} and should_translate_text(value):
                strings.add(value)
            else:
                strings.update(collect_json_strings(value))
    elif isinstance(payload, list):
        for item in payload:
            strings.update(collect_json_strings(item))
    return strings


def translate_json_payload(payload, translations, locale_code: str):
    if isinstance(payload, dict):
        translated = {}
        for key, value in payload.items():
            if isinstance(value, str):
                if key in {"url"}:
                    translated[key] = localize_site_url(value, locale_code)
                elif key in {"name", "description", "caption", "headline", "text", "alternateName"} and should_translate_text(value):
                    translated[key] = translations.get(value, value)
                else:
                    translated[key] = value
            else:
                translated[key] = translate_json_payload(value, translations, locale_code)
        return translated
    if isinstance(payload, list):
        return [translate_json_payload(item, translations, locale_code) for item in payload]
    return payload


def ensure_locale_script(source_ref: str, target_ref: str):
    source_path = ROOT / source_ref.lstrip("/").replace("/", "\\")
    target_path = ROOT / target_ref.lstrip("/").replace("/", "\\")
    if source_path.exists() and not target_path.exists():
        target_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source_path, target_path)


def rewrite_script_refs(html: str, locale_code: str):
    refs = []
    for old, new in SCRIPT_SUFFIX_REPLACEMENTS:
        replacement = new.format(locale=locale_code)
        if old not in html:
            continue
        for source_ref in re.findall(rf'(/static/js/[^"\']+){re.escape(old)}', html):
            refs.append((source_ref + old, source_ref + replacement))
        html = html.replace(old, replacement)
    return html, refs


def rebuild_page(locale_code: str, route: str):
    source_path = ENGLISH_ROUTE_ROOT / route
    target_path = ROOT / locale_code / route

    soup = BeautifulSoup(source_path.read_text(encoding="utf-8", errors="ignore"), "html.parser")
    html_tag = soup.find("html")
    if html_tag:
        html_tag["lang"] = locale_code
        if locale_code in RTL_LOCALES:
            html_tag["dir"] = "rtl"
        elif "dir" in html_tag.attrs:
            del html_tag["dir"]

    strings = sorted(collect_page_strings(soup), key=lambda item: (len(item), item))
    translations = translate_texts(strings, locale_code) if strings else {}

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
            element.replace_with(translations.get(normalized, normalized))

    for tag in soup.find_all(True):
        if tag.find_parent(class_="language-dropdown"):
            continue

        for attr in TRANSLATABLE_ATTRS:
            value = tag.get(attr)
            if value and should_translate_text(value):
                normalized = " ".join(value.split()).strip()
                tag[attr] = translations.get(normalized, value)

        for attr in URL_ATTRS:
            value = tag.get(attr)
            if value:
                tag[attr] = localize_site_url(value, locale_code)

        if tag.name == "meta":
            value = tag.get("content")
            meta_name = tag.get("name")
            meta_property = tag.get("property")
            if value and (
                meta_name in TRANSLATABLE_META_NAMES or
                meta_property in TRANSLATABLE_META_PROPERTIES
            ) and should_translate_text(value):
                normalized = " ".join(value.split()).strip()
                tag["content"] = translations.get(normalized, value)

    for script_tag in soup.find_all("script", attrs={"type": "application/ld+json"}):
        try:
            payload = json.loads(script_tag.string or script_tag.get_text())
        except json.JSONDecodeError:
            continue
        script_tag.string = json.dumps(
            translate_json_payload(payload, translations, locale_code),
            ensure_ascii=False,
            indent=4,
        )

    html = soup.decode(formatter="html").lstrip("\ufeff")
    html = re.sub(r"^\s*html\s*(?=<html\b)", "", html, count=1, flags=re.IGNORECASE)
    html = "<!DOCTYPE html>\n" + html.lstrip()
    html, refs = rewrite_script_refs(html, locale_code)
    html = html.replace("https://starryring.com/en/", f"https://starryring.com/{locale_code}/")
    html = re.sub(r'(?<![A-Za-z])"/en/', f'"/{locale_code}/', html)
    html = re.sub(r"(?<![A-Za-z])'/en/", f"'/{locale_code}/", html)
    html = html.replace("__SRSEP", "SRSEP")

    target_path.parent.mkdir(parents=True, exist_ok=True)
    target_path.write_text(html, encoding="utf-8")
    for source_ref, target_ref in refs:
        ensure_locale_script(source_ref, target_ref)
    return len(translations), len(refs)


def main():
    locales = sys.argv[1:] or TARGET_LOCALES
    for locale_code in locales:
        total_strings = 0
        total_script_refs = 0
        for route in ROUTES:
            translated_count, script_ref_count = rebuild_page(locale_code, route)
            total_strings += translated_count
            total_script_refs += script_ref_count
            print(f"{locale_code} {route}: strings={translated_count} scriptRefs={script_ref_count}", flush=True)
        print(f"{locale_code} total strings={total_strings} total scriptRefs={total_script_refs}", flush=True)


if __name__ == "__main__":
    main()
