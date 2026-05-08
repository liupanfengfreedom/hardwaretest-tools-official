import ast
import json
import re
import sys
import time
from pathlib import Path
from urllib.error import URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from bs4 import BeautifulSoup

ROOT = Path(r"F:\WebTool\toolsite")
JS_ROOT = ROOT / "static" / "js"
LOCALES = ["es", "fr", "ar", "bn", "pt", "ru", "ur", "id", "de", "mr", "te", "tr", "ta", "pcm"]
CACHE_PATH = ROOT / "scripts" / ".runtime-js-localization-cache.json"

STRING_RE = re.compile(r"""('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")""")
HTML_TAG_RE = re.compile(r"<[A-Za-z][^>]*>")
IDENTIFIERISH_RE = re.compile(r"^[A-Za-z0-9_./:#@%+\\-]+$")
SPACE_IDENTIFIERISH_RE = re.compile(r"^[a-z0-9_-]+(?:\s+[a-z0-9_-]+)+$")
COMMON_UI_WORDS = {
    "Start", "Stop", "Reset", "Generate", "Connect", "Disconnect", "Upload", "Download",
    "Error", "Success", "Ready", "Loading", "Please", "Copied", "Delete", "No matches",
    "No history", "Permission denied", "Not Connected", "Both Channels", "Left Channel",
    "Right Channel", "Allow Access", "Deny", "Log cleared", "Test reset", "No microphone detected",
    "Current typical", "Equal Payment", "Decreasing Principal", "Any Button", "Primary Color",
    "Background, Text", "Accent Color, Buttons", "Dark Background, Borders", "Needs Update"
}
SKIP_PREFIXES = (
    "/", "#", ".", "http", "data:", "audio/", "video/", "image/", "rgba(", "rgb(",
    "var(", "translate", "scale(", "matrix(", "blur(", "hsl(", "url(", "px", "rem", "deg",
)
SKIP_SUBSTRINGS = (
    "font-", "class=", "id=", "dataset.", "querySelector", "getElementById", "addEventListener",
    "localStorage", "sessionStorage", "JSON.", "Math.", "Date.", "performance.", "document.",
    "window.", "navigator.", "location.", "history.", "stroke=", "fill=", "viewBox", "xmlns",
    "audio/ogg", "audio/webm", "image/svg+xml", "image/png", "application/json", "use strict",
)

BRAND_TOKENS = {
    "StarryRing": "__STARRYRING__",
    "KeyCheck Pro": "__KEYCHECKPRO__",
    "Starry Tool": "__STARRYTOOL__",
    "Starry Toolbox": "__STARRYTOOLBOX__",
    "CyberPass Pro": "__CYBERPASSPRO__",
    "HardwareTest": "__HARDWARETEST__",
}

PCM_PHRASES = {
    "Allow Access": "Allow access",
    "Deny": "No gree",
    "Camera Permission Request": "Camera permission request",
    "We guarantee: All data is processed locally only, not uploaded to any servers.": "We promise say all data stay for your device only, e no go upload go any server.",
    "Permission denied": "Permission denied",
    "Not Connected": "Never connect",
    "Both Channels": "Both channel",
    "Left Channel": "Left channel",
    "Right Channel": "Right channel",
    "Start Playback": "Start playback",
    "Stop Playback": "Stop playback",
    "No microphone detected": "No microphone show",
    "Start failed:": "Start fail:",
    "unknown error": "unknown error",
    "Recording start error:": "Recording start error:",
    "Log cleared": "Log don clear",
    "Test reset": "Test don reset",
    "No matches": "No match",
    "No history": "No history",
    "Delete": "Delete",
    "Start": "Start",
    "Stop": "Stop",
    "Reset": "Reset",
    "Generate": "Generate",
    "Connect": "Connect",
    "Disconnect": "Disconnect",
    "Upload": "Upload",
    "Download": "Download",
    "Error": "Error",
    "Success": "Success",
    "Ready": "Ready",
    "Loading": "Loading",
    "Please": "Abeg",
    "Copied": "Copied",
    "Current typical": "Current common one",
    "Equal Payment": "Equal payment",
    "Decreasing Principal": "Principal dey reduce",
    "Any Button": "Any button",
    "Primary Color": "Main color",
    "Accent Color, Buttons": "Accent color, buttons",
    "Background, Text": "Background, text",
    "Dark Background, Borders": "Dark background, border",
    "Needs Update": "Need update",
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
    text = re.sub(r"(\{\{[^{}]+\}\}|\$\{[^{}]+\}|\{[A-Za-z0-9_]+\})", lambda m: f"__PH_{abs(hash(m.group(0))) % 1000000}__", text)
    return text


def unprotect_text(text: str, original: str) -> str:
    protected_original = protect_text(original)
    placeholders = re.findall(r"(\{\{[^{}]+\}\}|\$\{[^{}]+\}|\{[A-Za-z0-9_]+\})", original)
    tokens = re.findall(r"__PH_\d+__", protected_original)
    token_map = {token: placeholder for token, placeholder in zip(tokens, placeholders)}
    for token, placeholder in token_map.items():
        text = text.replace(token, placeholder)
    for source, token in BRAND_TOKENS.items():
        text = text.replace(token, source)
    return text


def should_translate_string(value: str) -> bool:
    norm = " ".join(value.split()).strip()
    if not norm:
        return False
    if any(norm.startswith(prefix) for prefix in SKIP_PREFIXES):
        return False
    if any(piece in norm for piece in SKIP_SUBSTRINGS):
        return False
    if ";" in norm and re.search(r"\b[a-z-]+\s*:", norm):
        return False
    if len(re.findall(r"[A-Za-z]{3,}", norm)) == 0:
        return False
    if HTML_TAG_RE.search(norm):
        return False
    if SPACE_IDENTIFIERISH_RE.fullmatch(norm):
        return False
    if norm in COMMON_UI_WORDS:
        return True
    if IDENTIFIERISH_RE.fullmatch(norm) and norm not in COMMON_UI_WORDS:
        return False
    if len(norm) < 12 and " " not in norm and norm not in COMMON_UI_WORDS:
        return False
    return True


def translate_text(text: str, locale_code: str) -> str:
    if locale_code == "pcm":
        return PCM_PHRASES.get(text, text)

    locale_cache = CACHE.setdefault(locale_code, {})
    if text in locale_cache:
        return locale_cache[text]

    protected = protect_text(text)
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
            translated = unprotect_text(translated, text)
            locale_cache[text] = translated
            return translated
        except (URLError, TimeoutError, json.JSONDecodeError) as exc:
            last_error = exc
            time.sleep(1.0 * (attempt + 1))
    raise RuntimeError(f"translate_text failed for {locale_code}: {last_error} :: {text[:120]}")


def escape_with_quote(value: str, quote_char: str) -> str:
    if quote_char == "'":
        escaped = value.replace("\\", "\\\\").replace("'", "\\'")
    else:
        escaped = value.replace("\\", "\\\\").replace('"', '\\"')
    escaped = escaped.replace("\n", "\\n")
    return f"{quote_char}{escaped}{quote_char}"


def process_script(path: Path, locale_code: str) -> int:
    text = path.read_text(encoding="utf-8", errors="ignore")
    matches = list(STRING_RE.finditer(text))
    if not matches:
        return 0

    replacements = []
    for match in matches:
        token = match.group(0)
        quote_char = token[0]
        try:
            value = ast.literal_eval(token)
        except Exception:
            continue
        if not isinstance(value, str):
            continue
        if not should_translate_string(value):
            continue
        translated = translate_text(value, locale_code)
        if translated != value:
            replacements.append((match.start(), match.end(), escape_with_quote(translated, quote_char)))

    if not replacements:
        return 0

    output = []
    cursor = 0
    for start, end, replacement in replacements:
        output.append(text[cursor:start])
        output.append(replacement)
        cursor = end
    output.append(text[cursor:])
    path.write_text("".join(output), encoding="utf-8")
    return len(replacements)


def find_locale_scripts(locale_code: str):
    return sorted(JS_ROOT.rglob(f"*{locale_code}.js"))


def main():
    locales = sys.argv[1:] or LOCALES
    for locale_code in locales:
        total = 0
        for path in find_locale_scripts(locale_code):
            count = process_script(path, locale_code)
            total += count
            if count:
                print(f"{locale_code} {path.relative_to(ROOT).as_posix()}: {count}", flush=True)
        save_cache(CACHE)
        print(f"{locale_code} total replacements={total}", flush=True)


if __name__ == "__main__":
    main()
