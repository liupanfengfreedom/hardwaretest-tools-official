import json
import re
import sys
import time
from http.client import RemoteDisconnected
from pathlib import Path
from urllib.error import URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

ROOT = Path(r"F:\WebTool\toolsite")
TARGET_DIR = ROOT / "static" / "js" / "toolbox" / "mic"
SOURCE = TARGET_DIR / "script-en.js"
LOCALES = ["es", "fr", "ar", "bn", "pt", "ru", "ur", "id", "de", "mr", "te", "tr", "ta", "pcm"]
CACHE_PATH = ROOT / "scripts" / ".mic-runtime-cache.json"

MANUAL_PHRASES = [
    "Microphone ",
    "No microphone detected",
    "Calculating...",
    "Testing...",
    "Connecting...",
    "Running",
    "Connected",
    "Permission denied",
    "Not Connected",
    "Click page to activate audio",
]

SKIP_SUBSTRINGS = [
    "getElementById",
    "querySelector",
    "classList",
    "rgba(",
    "Math.",
    "create",
    "connect(",
    "currentTime",
    "clientWidth",
    "clientHeight",
    "canvas",
    "waveCanvas",
    "specCanvas",
]

PCM_MAP = {
    "Microphone ": "Microphone ",
    "No microphone detected": "No microphone show",
    "Calculating...": "Dey calculate...",
    "Testing...": "Dey test...",
    "Connecting...": "Dey connect...",
    "Running": "Running",
    "Connected": "Connected",
    "Permission denied": "Permission no gree",
    "Not Connected": "No connect",
    "Click page to activate audio": "Click page make audio activate",
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


def extract_phrases():
    text = SOURCE.read_text(encoding="utf-8", errors="ignore")
    pattern = re.compile(r"""(['"])(.*?)(?<!\\)\1""", re.S)
    phrases = set(MANUAL_PHRASES)
    for match in pattern.finditer(text):
        value = match.group(2)
        if len(value) < 4:
            continue
        if "\n" in value or "${" in value:
            continue
        if value.startswith((".", "#", "@")):
            continue
        if not re.search(r"[A-Za-z]", value):
            continue
        if re.fullmatch(r"[A-Za-z0-9_-]+", value) and value not in MANUAL_PHRASES:
            continue
        if value not in MANUAL_PHRASES and " " not in value:
            continue
        if any(token in value for token in SKIP_SUBSTRINGS):
            continue
        phrases.add(value)
    return sorted(phrases, key=len, reverse=True)


def translate(locale: str, text: str) -> str:
    if locale == "pcm":
        return PCM_MAP.get(text, text)
    locale_cache = CACHE.setdefault(locale, {})
    if text in locale_cache:
        return locale_cache[text]
    url = (
        "https://translate.googleapis.com/translate_a/single"
        f"?client=gtx&sl=en&tl={locale}&dt=t&q={quote(text)}"
    )
    last_error = None
    for attempt in range(5):
        try:
            request = Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urlopen(request, timeout=60) as response:
                data = json.loads(response.read().decode("utf-8"))
            translated = "".join(part[0] for part in data[0] if part and part[0])
            locale_cache[text] = translated
            return translated
        except (URLError, TimeoutError, json.JSONDecodeError, RemoteDisconnected) as exc:
            last_error = exc
            time.sleep(attempt + 1)
    raise RuntimeError(f"mic translate failed for {locale}: {last_error}")


def localize_file(path: Path, locale: str, phrases):
    text = path.read_text(encoding="utf-8", errors="ignore")
    original = text
    for phrase in phrases:
        translated = translate(locale, phrase)
        text = text.replace(f"'{phrase}'", f"'{translated}'")
        text = text.replace(f'"{phrase}"', f'"{translated}"')
    if text != original:
        path.write_text(text, encoding="utf-8")
        return 1
    return 0


def main():
    phrases = extract_phrases()
    locales = sys.argv[1:] or LOCALES
    changed = 0
    for locale in locales:
        changed += localize_file(TARGET_DIR / f"script-{locale}.js", locale, phrases)
        print(locale, "done", flush=True)
    save_cache(CACHE)
    print("changed-files", changed)


if __name__ == "__main__":
    main()
