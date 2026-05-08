import json
import re
import time
from html import unescape
from pathlib import Path
from urllib.error import URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

ROOT = Path(r"F:\WebTool\toolsite")
LOCALES = ["es", "fr", "ar", "bn", "pt", "ru", "ur", "id", "de", "pcm", "mr", "te", "tr", "ta"]
CACHE_PATH = ROOT / "scripts" / ".common-html-residuals-cache.json"

COMMON_PHRASES = [
    "Home",
    "Toolbox",
    "Utility Tools",
    "Mouse Test",
    "Keyboard Test",
    "Keyboard Tester",
    "Speaker Test",
    "Microphone Test",
    "Mic Test",
    "Camera Test",
    "Double Click Test",
    "JSON Parser",
    "QR Code Generator",
    "Color Grading",
    "Video Converter",
    "Currency Converter",
    "English Version",
    "English version",
]

PCM_MAP = {
    "Home": "Home",
    "Toolbox": "Toolbox",
    "Utility Tools": "Utility tools",
    "Mouse Test": "Mouse test",
    "Keyboard Test": "Keyboard test",
    "Keyboard Tester": "Keyboard tester",
    "Speaker Test": "Speaker test",
    "Microphone Test": "Microphone test",
    "Mic Test": "Mic test",
    "Camera Test": "Camera test",
    "Double Click Test": "Double-click test",
    "JSON Parser": "JSON parser",
    "QR Code Generator": "QR code generator",
    "Color Grading": "Color grading",
    "Video Converter": "Video converter",
    "Currency Converter": "Currency converter",
    "English Version": "",
    "English version": "",
}

LOCALE_TAGS = {
    "es": ("es", "es_ES", "es"),
    "fr": ("fr", "fr_FR", "fr"),
    "ar": ("ar", "ar_AR", "ar"),
    "bn": ("bn", "bn_BD", "bn"),
    "pt": ("pt", "pt_PT", "pt"),
    "ru": ("ru", "ru_RU", "ru"),
    "ur": ("ur", "ur_PK", "ur"),
    "id": ("id", "id_ID", "id"),
    "de": ("de", "de_DE", "de"),
    "pcm": ("pcm", "pcm_NG", "pcm-NG"),
    "mr": ("mr", "mr_IN", "mr"),
    "te": ("te", "te_IN", "te"),
    "tr": ("tr", "tr_TR", "tr"),
    "ta": ("ta", "ta_IN", "ta"),
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


def translate(text: str, locale: str) -> str:
    if locale == "pcm":
        return PCM_MAP.get(text, text)
    locale_cache = CACHE.setdefault(locale, {})
    if text in locale_cache:
        return locale_cache[text]
    url = (
        "https://translate.googleapis.com/translate_a/single"
        f"?client=gtx&sl=en&tl={locale}&dt=t&q={quote(text)}"
    )
    translated = text
    for attempt in range(5):
        try:
            request = Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urlopen(request, timeout=30) as response:
                data = json.loads(response.read().decode("utf-8"))
            translated = "".join(part[0] for part in data[0] if part and part[0])
            break
        except (URLError, TimeoutError, json.JSONDecodeError):
            time.sleep(0.8 * (attempt + 1))
    translated = unescape(translated)
    locale_cache[text] = translated
    return translated


def normalize_seo(html: str, locale: str) -> str:
    lang_tag, og_locale, hreflang_self = LOCALE_TAGS[locale]
    html = re.sub(r'(<html\b[^>]*\blang=")[^"]+(")', rf"\1{lang_tag}\2", html, count=1)
    html = re.sub(r'(<meta[^>]+property="og:locale"[^>]+content=")[^"]+(")', rf"\1{og_locale}\2", html)
    html = re.sub(r'("inLanguage"\s*:\s*")[^"]+(")', rf'\1{lang_tag}\2', html)

    def replace_hreflang(match):
        href = match.group(1)
        rel = match.group(2)
        if f"https://starryring.com/{locale}/" in href or f'/{locale}/' in href:
            return f'href="{href}" rel="{rel}" hreflang="{hreflang_self}"'
        return match.group(0)

    html = re.sub(r'href="([^"]+)"\s+rel="alternate"\s+hreflang="([^"]+)"', replace_hreflang, html)
    html = html.replace(" - English Version", "")
    html = html.replace(" English Version", "")
    html = html.replace("English Version", "")
    html = html.replace("English version", "")
    return html


def process_file(path: Path, locale: str, replacements: dict[str, str]) -> int:
    html = path.read_text(encoding="utf-8", errors="ignore")
    original = html
    for source, target in replacements.items():
        html = html.replace(source, target)
    html = normalize_seo(html, locale)
    html = re.sub(r"\s{2,}", " ", html)
    html = html.replace("> <", "><")
    if html != original:
        path.write_text(html, encoding="utf-8")
        return 1
    return 0


def main():
    total = 0
    for locale in LOCALES:
        replacements = {phrase: translate(phrase, locale) for phrase in COMMON_PHRASES}
        replacements["Toolbox"] = replacements["Toolbox"]
        changed = 0
        for path in (ROOT / locale).rglob("*.html"):
            changed += process_file(path, locale, replacements)
        save_cache(CACHE)
        print(locale, "changed-files", changed, flush=True)
        total += changed
    print("total-changed-files", total)


if __name__ == "__main__":
    main()
