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
CACHE_PATH = ROOT / "scripts" / ".translation-cache.json"
LOCALES = ["es", "fr", "ar", "bn", "pt", "ru", "ur", "id", "de", "pcm", "mr", "te", "tr", "ta"]
TARGET_ROUTES = [
    "index.html",
    "about-us/index.html",
    "contact-us/index.html",
    "disclaimer/index.html",
    "privacy/index.html",
    "terms/index.html",
    "toolbox/camera/index.html",
    "toolbox/dead-pixel/index.html",
    "toolbox/keyboard/index.html",
    "toolbox/keyboard/apple-keyboard/index.html",
    "toolbox/mic/index.html",
    "toolbox/mouse/index.html",
    "toolbox/mouse/cps/index.html",
    "toolbox/mouse/double-click/index.html",
    "toolbox/mouse/double-click/instruction/index.html",
    "toolbox/mouse/double-click/principle/index.html",
    "toolbox/mouse/instruction/index.html",
    "toolbox/mouse/polling-rate/index.html",
    "toolbox/mouse/principle/index.html",
    "toolbox/mouse/scroll-wheel/index.html",
    "toolbox/speaker/index.html",
    "toolbox/index.html",
    "utility-tools/design-media/app-icon-generator/index.html",
    "utility-tools/design-media/audio-converter/index.html",
    "utility-tools/design-media/color-grading/index.html",
    "utility-tools/design-media/favicon-generator/index.html",
    "utility-tools/design-media/image-converter/index.html",
    "utility-tools/design-media/online-voice-recorder/index.html",
    "utility-tools/index.html",
    "utility-tools/math/aes-decrypt/index.html",
    "utility-tools/math/aes-encrypt/index.html",
    "utility-tools/math/crc32-generator/index.html",
    "utility-tools/math/currency-calculator/index.html",
    "utility-tools/math/deposit-interest-rate-calculator/index.html",
    "utility-tools/math/loan-interest-rate-calculator/index.html",
    "utility-tools/math/md5-generator/index.html",
    "utility-tools/math/password-generator/index.html",
    "utility-tools/math/random-number-generator/index.html",
    "utility-tools/math/rsa-decrypt/index.html",
    "utility-tools/math/rsa-encrypt/index.html",
    "utility-tools/netdev/json-parser/index.html",
    "utility-tools/netdev/ping/index.html",
    "utility-tools/netdev/post-tool/index.html",
    "utility-tools/netdev/qr-code-generator/index.html",
    "utility-tools/netdev/websocket-test/index.html",
]

BRAND_TOKENS = {
    "StarryRing": "__STARRYRING__",
    "KeyCheck Pro": "__KEYCHECKPRO__",
    "HardwareTest": "__HARDWARETEST__",
    "HardwareTest Pro": "__HARDWARETESTPRO__",
    "Starry Tool": "__STARRYTOOL__",
    "Starry Toolbox": "__STARRYTOOLBOX__",
    "Utility Tools": "__UTILITYTOOLS__",
}

IGNORE_TEXT_EXACT = {
    "English", "Español", "Français", "العربية", "বাংলা", "Português", "Русский",
    "اردو", "Bahasa Indonesia", "Deutsch", "Naijá", "मराठी", "తెలుగు", "Türkçe",
    "தமிழ்", "हिन्दी", "Tiếng Việt", "日本語", "简体中文", "한국어", "🌐",
    "Home", "Toolbox", "Utility Tools", "PRO", "OK", "PNG", "JPG", "GIF", "SVG",
    "WS", "WSS", "JSON", "Hex", "Web", "Windows", "macOS", "Linux", "Chrome OS",
}

PCM_MANUAL = {
    "About Us": "About Us",
    "Contact Us": "Contact Us",
    "Disclaimer": "Disclaimer",
    "Privacy Policy": "Privacy Policy",
    "Terms of Service": "Terms of Service",
    "Toolbox": "Toolbox",
    "Utility Tools": "Utility Tools",
    "Mouse Test": "Mouse test",
    "Keyboard Test": "Keyboard test",
    "Mic Test": "Mic test",
    "App Icon Generator": "App icon generator",
    "Password Generator": "Password generator",
    "WebSocket test tool": "Tool to test WebSocket",
}

UI_SINGLE_WORDS = {
    "Ready", "Active", "Testing", "Fault", "Error", "Warning", "Info", "Success",
    "Start", "Stop", "Reset", "Search", "Connect", "Disconnect", "Connected",
    "Disconnected", "Online", "Offline", "History", "Copy", "Copied", "Generate",
    "Import", "Export", "Loading", "Retry", "Left", "Right", "Middle", "Wheel",
    "Space", "Enter", "Shift", "Ctrl", "Alt", "Tab", "Esc", "Play", "Pause",
    "Recording", "Camera", "Microphone", "Audio", "Video", "Checksum", "Password",
    "Amount", "From", "To", "Upload", "Download", "Open", "Close", "Send",
    "Receive", "Subscribe", "Unsubscribe", "Ping", "Pong", "Latency", "Preview",
    "Random", "Strong", "Weak", "Medium", "High", "Low"
}

SCRIPT_REF_PATTERNS = [
    (r"/static/js/(.+)/script-en\.js", r"/static/js/\1/script-{locale}.js"),
    (r"/static/js/(.+)/home-en\.js", r"/static/js/\1/home-{locale}.js"),
    (r"/static/js/(.+)/en-main\.js", r"/static/js/\1/{locale}-main.js"),
]


def load_cache():
    if CACHE_PATH.exists():
        try:
            return json.loads(CACHE_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return {}
    return {}


def save_cache(cache):
    CACHE_PATH.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")


TRANSLATION_CACHE = load_cache()


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
    if not normalized or normalized in IGNORE_TEXT_EXACT:
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


def translate_google(text: str, locale_code: str) -> str:
    if locale_code == "pcm":
        return PCM_MANUAL.get(text, text)

    locale_cache = TRANSLATION_CACHE.setdefault(locale_code, {})
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


def normalize_branding(text: str) -> str:
    for source, token in BRAND_TOKENS.items():
        text = text.replace(token, source)
    text = text.replace(" - English Version", "")
    text = text.replace("English Version", "")
    text = re.sub(r"__[^_]{1,80}__", lambda m: m.group(0).strip("_"), text)
    return text


def rewrite_script_refs(html: str, locale_code: str):
    refs = []
    for pattern, repl in SCRIPT_REF_PATTERNS:
        def _replace(match):
            source = match.group(0)
            target = repl.format(locale=locale_code).replace("\\1", match.group(1))
            refs.append((source, target))
            return target
        html = re.sub(pattern, _replace, html)
    return html, refs


def collect_html_nodes(soup):
    nodes = []
    texts = []
    for element in soup.find_all(string=True):
        if isinstance(element, Comment):
            continue
        parent = element.parent
        if parent and parent.name in {"script", "style"}:
            continue
        if parent and parent.find_parent(class_="language-dropdown"):
            continue
        original = str(element)
        normalized = " ".join(original.split()).strip()
        if should_translate_text(normalized):
            nodes.append(("text", element, normalized))
            texts.append(normalized)

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
                nodes.append(("attr", tag, attr))
                texts.append(value)
    return nodes, texts


def localize_html_page(locale_code: str, page_path: Path):
    html = page_path.read_text(encoding="utf-8")
    soup = BeautifulSoup(html, "html.parser")
    nodes, texts = collect_html_nodes(soup)
    translations = {}
    for text in dict.fromkeys(texts):
        translations[text] = translate_google(text, locale_code)
    changed = sum(1 for s, t in translations.items() if s != t)

    for node_type, ref, payload in nodes:
        if node_type == "text":
            translated = translations.get(payload)
            if translated:
                ref.replace_with(translated)
        else:
            value = ref.get(payload)
            translated = translations.get(value)
            if translated:
                ref[payload] = translated

    html = str(soup)
    for source, target in translations.items():
        html = html.replace(source, target)
    html, refs = rewrite_script_refs(html, locale_code)
    html = normalize_branding(html)
    page_path.write_text(html, encoding="utf-8")
    return changed, refs


STRING_RE = re.compile(
    r"""
    (?P<quote>['"])
    (?P<body>(?:\\.|(?! (?P=quote) ).)*?)
    (?P=quote)
    """,
    re.VERBOSE | re.DOTALL,
)


def should_translate_js_string(value: str, source: str, start: int, end: int) -> bool:
    value = value.strip()
    if not value:
        return False
    if value in IGNORE_TEXT_EXACT:
        return False
    if value.startswith(("http", "/", "#", ".", "ws://", "wss://")):
        return False
    if any(ext in value for ext in [".png", ".jpg", ".jpeg", ".svg", ".gif", ".webp", ".json", ".css", ".js", ".enc", ".zip"]):
        return False
    if any(token in value for token in ["document.", "window.", "localStorage", "querySelector", "getElementById", "<div", "</", "function", "return ", "=>", "mipmap-", "AppIcon-", "ic_launcher", "url(", "classList", "data-"]):
        return False
    if re.fullmatch(r"[A-Za-z0-9_.#/\-]+", value) and value not in UI_SINGLE_WORDS:
        return False
    if len(re.findall(r"[A-Za-z]{3,}", value)) == 0:
        return False

    trailing = source[end:].lstrip()
    if trailing.startswith(":"):
        return False
    return True


def localize_script_file(locale_code: str, source_rel: str, target_rel: str):
    source_path = ROOT / source_rel.lstrip("/").replace("/", "\\")
    target_path = ROOT / target_rel.lstrip("/").replace("/", "\\")
    source = source_path.read_text(encoding="utf-8")

    pieces = []
    last = 0
    changed = 0
    for match in STRING_RE.finditer(source):
        start, end = match.span()
        pieces.append(source[last:start])
        quote = match.group("quote")
        body = match.group("body")
        value = bytes(body, "utf-8").decode("unicode_escape")
        if should_translate_js_string(value, source, start, end):
            translated = translate_google(value, locale_code)
            if translated != value:
                changed += 1
            escaped = translated.replace("\\", "\\\\").replace(quote, "\\" + quote).replace("\n", "\\n")
            pieces.append(f"{quote}{escaped}{quote}")
        else:
            pieces.append(match.group(0))
        last = end
    pieces.append(source[last:])
    result = normalize_branding("".join(pieces))
    target_path.parent.mkdir(parents=True, exist_ok=True)
    target_path.write_text(result, encoding="utf-8")
    return changed


def main():
    selected = sys.argv[1:] or LOCALES
    all_refs = {locale: set() for locale in selected}

    for locale_code in selected:
        html_changed = 0
        html_pages = 0
        for route in TARGET_ROUTES:
            page_path = ROOT / locale_code / route
            if not page_path.exists():
                continue
            changed, refs = localize_html_page(locale_code, page_path)
            html_changed += changed
            html_pages += 1
            for source, target in refs:
                all_refs[locale_code].add((source, target))
        save_cache(TRANSLATION_CACHE)
        print(f"{locale_code} html-pages: {html_pages}, changed-strings: {html_changed}", flush=True)

    for locale_code in selected:
        script_changes = 0
        for source, target in sorted(all_refs[locale_code]):
            script_changes += localize_script_file(locale_code, source, target)
        save_cache(TRANSLATION_CACHE)
        print(f"{locale_code} script-files: {len(all_refs[locale_code])}, changed-literals: {script_changes}", flush=True)

    save_cache(TRANSLATION_CACHE)


if __name__ == "__main__":
    main()
