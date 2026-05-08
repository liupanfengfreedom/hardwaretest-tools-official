import json
import re
import sys
import time
from html import unescape
from pathlib import Path
from urllib.error import URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from bs4 import BeautifulSoup, Comment

ROOT = Path(r"F:\WebTool\toolsite")
LOCALES = ["es", "fr", "ar", "bn", "pt", "ru", "ur", "id", "de", "mr", "te", "tr", "ta"]
ROUTES = sorted(path.relative_to(ROOT / "en").as_posix() for path in (ROOT / "en").rglob("*.html"))
CACHE_PATH = ROOT / "scripts" / ".cleanup-localization-cache.json"

TRANSLATABLE_ATTRS = ("title", "placeholder", "aria-label", "alt")
TRANSLATABLE_META_NAMES = {
    "description",
    "keywords",
    "twitter:title",
    "twitter:description",
    "apple-mobile-web-app-title",
    "application-name",
}
TRANSLATABLE_META_PROPERTIES = {"og:title", "og:description", "og:image:alt", "og:site_name"}
JSON_STRING_KEYS = {"name", "description", "caption", "headline", "text", "alternateName"}

BRAND_TOKENS = {
    "StarryRing": "__STARRYRING__",
    "KeyCheck Pro": "__KEYCHECKPRO__",
    "Starry Tool": "__STARRYTOOL__",
    "Starry Toolbox": "__STARRYTOOLBOX__",
    "CyberPass Pro": "__CYBERPASSPRO__",
    "HardwareTest": "__HARDWARETEST__",
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


def has_english_signal(text: str) -> bool:
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


def translate_chunk(payload: str, locale_code: str) -> str:
    protected = protect_text(payload)
    url = (
        "https://translate.googleapis.com/translate_a/single"
        f"?client=gtx&sl=auto&tl={locale_code}&dt=t&q={quote(protected)}"
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
    raise RuntimeError(f"cleanup translate failed for {locale_code}: {last_error}")


def translate_texts(texts, locale_code: str):
    locale_cache = CACHE.setdefault(locale_code, {})
    uncached = [text for text in texts if text not in locale_cache]
    if not uncached:
        return {text: locale_cache[text] for text in texts}

    max_chars = 3000
    while uncached:
        batch = []
        length = 0
        while uncached:
            candidate = uncached[0]
            marker = f"__CLNSEP{len(batch)}__"
            added = len(marker) + len(candidate) + 2
            if batch and length + added > max_chars:
                break
            batch.append(uncached.pop(0))
            length += added

        payload = "\n".join(f"__CLNSEP{index}__{text}" for index, text in enumerate(batch))
        translated_payload = translate_chunk(payload, locale_code)
        pieces = re.split(r"__CLNSEP(\d+)__", translated_payload)
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


def collect_json_strings(payload):
    strings = set()
    if isinstance(payload, dict):
        for key, value in payload.items():
            if isinstance(value, str) and key in JSON_STRING_KEYS and has_english_signal(value):
                strings.add(value)
            else:
                strings.update(collect_json_strings(value))
    elif isinstance(payload, list):
        for item in payload:
            strings.update(collect_json_strings(item))
    return strings


def translate_json_payload(payload, translations):
    if isinstance(payload, dict):
        translated = {}
        for key, value in payload.items():
            if isinstance(value, str) and key in JSON_STRING_KEYS and has_english_signal(value):
                translated[key] = translations.get(value, value)
            else:
                translated[key] = translate_json_payload(value, translations)
        return translated
    if isinstance(payload, list):
        return [translate_json_payload(item, translations) for item in payload]
    return payload


def cleanup_page(locale_code: str, route: str):
    path = ROOT / locale_code / route
    soup = BeautifulSoup(path.read_text(encoding="utf-8", errors="ignore"), "html.parser")
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
        if has_english_signal(normalized):
            strings.add(normalized)

    for tag in soup.find_all(True):
        if tag.find_parent(class_="language-dropdown"):
            continue

        for attr in TRANSLATABLE_ATTRS:
            value = tag.get(attr)
            if value and has_english_signal(value):
                strings.add(" ".join(value.split()).strip())

        if tag.name == "meta":
            value = tag.get("content")
            meta_name = tag.get("name")
            meta_property = tag.get("property")
            if value and (
                meta_name in TRANSLATABLE_META_NAMES or
                meta_property in TRANSLATABLE_META_PROPERTIES
            ) and has_english_signal(value):
                strings.add(" ".join(value.split()).strip())

    json_scripts = []
    for script_tag in soup.find_all("script", attrs={"type": "application/ld+json"}):
        try:
            payload = json.loads(script_tag.string or script_tag.get_text())
        except json.JSONDecodeError:
            continue
        json_scripts.append((script_tag, payload))
        strings.update(collect_json_strings(payload))

    if not strings:
        return 0

    translations = translate_texts(sorted(strings, key=lambda item: (len(item), item)), locale_code)

    for element in soup.find_all(string=True):
        if isinstance(element, Comment):
            continue
        parent = element.parent
        if parent and parent.name in {"script", "style"}:
            continue
        if parent and parent.find_parent(class_="language-dropdown"):
            continue
        normalized = " ".join(str(element).split()).strip()
        if normalized in translations:
            element.replace_with(translations[normalized])

    for tag in soup.find_all(True):
        if tag.find_parent(class_="language-dropdown"):
            continue
        for attr in TRANSLATABLE_ATTRS:
            value = tag.get(attr)
            if value:
                normalized = " ".join(value.split()).strip()
                if normalized in translations:
                    tag[attr] = translations[normalized]
        if tag.name == "meta":
            value = tag.get("content")
            if value:
                normalized = " ".join(value.split()).strip()
                if normalized in translations:
                    tag["content"] = translations[normalized]

    for script_tag, payload in json_scripts:
        script_tag.string = json.dumps(
            translate_json_payload(payload, translations),
            ensure_ascii=False,
            indent=4,
        )

    html = soup.decode(formatter="html").lstrip("\ufeff")
    html = re.sub(r"^\s*html\s*(?=<html\b)", "", html, count=1, flags=re.IGNORECASE)
    html = "<!DOCTYPE html>\n" + html.lstrip()
    path.write_text(html, encoding="utf-8")
    return len(translations)


def main():
    locales = sys.argv[1:] or LOCALES
    for locale_code in locales:
        total = 0
        for route in ROUTES:
            count = cleanup_page(locale_code, route)
            total += count
            if count:
                print(f"{locale_code} {route}: {count}", flush=True)
        print(f"{locale_code} total cleanup strings={total}", flush=True)


if __name__ == "__main__":
    main()
