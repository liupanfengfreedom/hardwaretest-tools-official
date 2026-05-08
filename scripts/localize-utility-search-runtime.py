import json
import time
from pathlib import Path
from urllib.error import URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

ROOT = Path(r"F:\WebTool\toolsite")
TARGET_DIR = ROOT / "static" / "js" / "utility-tools"
LOCALES = ["es", "fr", "ar", "bn", "pt", "ru", "ur", "id", "de", "mr", "te", "tr", "ta", "pcm"]
CACHE_PATH = ROOT / "scripts" / ".utility-search-runtime-cache.json"

PHRASES = [
    "{count} tools",
    "Found {count} matching tools",
    "Type a keyword to quickly find the tool you need",
    "Press ESC to clear • Ctrl+K to search quickly",
]

PCM_MAP = {
    "{count} tools": "{count} tools",
    "Found {count} matching tools": "Found {count} tool wey match",
    "Type a keyword to quickly find the tool you need": "Type keyword make you quick find di tool wey you need",
    "Press ESC to clear • Ctrl+K to search quickly": "Press ESC to clear • Ctrl+K to search quick",
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


def translate(locale: str, text: str) -> str:
    if locale == "pcm":
        return PCM_MAP.get(text, text)
    locale_cache = CACHE.setdefault(locale, {})
    if text in locale_cache:
        return locale_cache[text]
    protected = text.replace("{count}", "__COUNT__")
    url = (
        "https://translate.googleapis.com/translate_a/single"
        f"?client=gtx&sl=en&tl={locale}&dt=t&q={quote(protected)}"
    )
    last_error = None
    for attempt in range(5):
        try:
            request = Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urlopen(request, timeout=60) as response:
                data = json.loads(response.read().decode("utf-8"))
            translated = "".join(part[0] for part in data[0] if part and part[0]).replace("__COUNT__", "{count}")
            locale_cache[text] = translated
            return translated
        except (URLError, TimeoutError, json.JSONDecodeError) as exc:
            last_error = exc
            time.sleep(1.0 * (attempt + 1))
    raise RuntimeError(f"utility search translate failed for {locale}: {last_error}")


def localize_file(locale: str):
    path = TARGET_DIR / f"script-{locale}.js"
    text = path.read_text(encoding="utf-8", errors="ignore")
    original = text
    for phrase in PHRASES:
        text = text.replace(phrase, translate(locale, phrase))
    if text != original:
        path.write_text(text, encoding="utf-8")
        return 1
    return 0


def main():
    changed = 0
    for locale in LOCALES:
        changed += localize_file(locale)
        print(locale, "done", flush=True)
    save_cache(CACHE)
    print("changed-files", changed)


if __name__ == "__main__":
    main()
