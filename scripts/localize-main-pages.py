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
ROUTES = [
    "index.html",
    "about-us/index.html",
    "contact-us/index.html",
    "disclaimer/index.html",
    "privacy/index.html",
    "terms/index.html",
]

LOCALES = {
    "es": {"locale": "es-ES"},
    "fr": {"locale": "fr-FR"},
    "ar": {"locale": "ar-SA"},
    "bn": {"locale": "bn-BD"},
    "pt": {"locale": "pt-PT"},
    "ru": {"locale": "ru-RU"},
    "ur": {"locale": "ur-PK"},
    "id": {"locale": "id-ID"},
    "de": {"locale": "de-DE"},
    "pcm": {"locale": "en-NG"},
    "mr": {"locale": "mr-IN"},
    "te": {"locale": "te-IN"},
    "tr": {"locale": "tr-TR"},
    "ta": {"locale": "ta-IN"},
}

BRAND_TOKEN = "__STARRYRING__"
PRODUCT_TOKEN = "__KEYCHECKPRO__"
IGNORE_TEXT_EXACT = {
    "English", "Español", "Français", "العربية", "বাংলা", "Português", "Русский",
    "اردو", "Bahasa Indonesia", "Deutsch", "Naijá", "मराठी", "తెలుగు", "Türkçe",
    "தமிழ்", "हिन्दी", "Tiếng Việt", "日本語", "简体中文", "한국어", "🌐",
    "SoftwareApplication", "WebSite", "Organization", "FAQPage", "Question", "Answer",
    "Home", "Toolbox", "Utility Tools",
}
PCM_MANUAL = {
    "KeyCheck Pro - Online Mouse & Keyboard Tester | Gaming Peripherals Diagnostics": "KeyCheck Pro - online mouse and keyboard tester | gaming gear diagnostics",
    "StarryRing – input tester for gamers & developers": "StarryRing – input tester for gamers and developers",
    "Contact · Starry Ring": "Contact · StarryRing",
    "Disclaimer - StarryRing": "Disclaimer - StarryRing",
    "Privacy Policy": "Privacy Policy",
    "Terms of Service": "Terms of Service",
    "Professional online mouse and keyboard testing platform featuring precision diagnostics for gaming peripherals, input latency analysis, and hardware performance validation. Trusted by gamers, developers, and tech enthusiasts worldwide.": "Professional online mouse and keyboard testing platform wey get precise checks for gaming gear, input delay analysis, and hardware performance validation. Gamers, developers, and tech people for many places trust am.",
    "Learn why StarryRing was built for gamers and developers who need fast, trustworthy keyboard and mouse diagnostics in a clean browser-based environment.": "Learn why StarryRing build this tool for gamers and developers wey need fast and trustworthy keyboard and mouse diagnostics for clean browser environment.",
    "Contact the StarryRing team for bug reports, feedback, feature ideas, or developer collaboration through email, GitHub, or Discord.": "Reach StarryRing team for bug report, feedback, feature idea, or developer collaboration through email, GitHub, or Discord.",
    "Read the StarryRing disclaimer covering general information, third-party services, limitations of liability, and use-at-your-own-risk terms.": "Read StarryRing disclaimer about general information, third-party services, liability limits, and use-am-at-your-own-risk terms.",
    "Review the StarryRing privacy policy to learn what data may be collected, how it is used, and how we protect your browsing information.": "Check StarryRing privacy policy make you know wetin data fit collect, how dem use am, and how we protect your browsing info.",
    "Read the StarryRing terms of service covering acceptable use, content ownership, limitations of liability, and other conditions for using the site.": "Read StarryRing terms of service about acceptable use, content ownership, liability limits, and other conditions for using the site.",
    "About Us": "About Us",
    "Contact Us": "Contact Us",
    "Disclaimer": "Disclaimer",
    "Privacy Policy": "Privacy Policy",
    "Terms of Service": "Terms of Service",
    "Professional Mouse Test & Keyboard Test Platform": "Professional mouse and keyboard test platform",
    "Explore Precision Testing Tools": "Explore precision testing tools",
    "Trusted browser-based diagnostics for gamers, keyboard enthusiasts, and hardware tinkerers.": "Trusted browser diagnostics for gamers, keyboard lovers, and hardware tinkerers.",
    "Built by Gamers · Polished for Developers": "Built by gamers · sharpened for developers",
    "When your game feels off, you need a trustworthy testing tool": "When your game no dey feel right, you need one testing tool wey you fit trust",
    "I'm a gamer and an indie game developer. While playing, debugging inputs, and fine-tuning controls, I've repeatedly faced the same question:": "I be gamer and indie game developer. As I dey play, debug inputs, and fine-tune controls, I don face this same question many times:",
    "Is it my mistake, or is my mouse/keyboard faulty?": "Na my mistake, or my mouse/keyboard get fault?",
    "KeyCheck Pro has a simple goal:": "KeyCheck Pro get one simple goal:",
    "Make input problems verifiable, reproducible, and explainable.": "Make input wahala something we fit verify, repeat, and explain.",
    "Real Input Logging": "Real input logging",
    "Data Visualization": "Data visualization",
    "Precision Testing": "Precision testing",
    "A Tool by Gamers, for Gamers": "Tool by gamers, for gamers",
    "KeyCheck Pro isn't commercial software; it was born from real frustrations. When input devices become unreliable, both gaming experience and development judgment suffer.": "KeyCheck Pro no be commercial software; e born from real frustration. When input devices no dey reliable, both gaming experience and development judgment dey suffer.",
    "If the input itself cannot be trusted, then all judgments based on it are unreliable.": "If you no fit trust the input itself, then every judgment wey depend on am no go reliable.",
    "Developer Toolbox: Practical Tools to Boost Efficiency": "Developer toolbox: practical tools to boost efficiency",
    "During game development, beyond core input testing, you also encounter various trivial yet essential tasks:": "During game development, apart from core input testing, you still meet many small but important tasks:",
    "asset processing, data generation, network debugging, quick generation…": "asset processing, data generation, network debugging, quick generation…",
    "We've integrated a streamlined toolset optimized specifically for game developers, making these repetitive tasks": "We don put together one streamlined toolset wey suit game developers well, so these repetitive tasks fit become",
    "fast, simple, and reliable": "fast, simple, and reliable",
    "Enter Utility Tools": "Enter utility tools",
    "Test My Peripherals": "Test my peripherals",
    "An input testing tool made by gamers and indie developers": "Input testing tool wey gamers and indie developers build",
    "Free to use · No signup · No input data stored": "Free to use · No signup · No input data stored",
}


def should_translate_text(text: str) -> bool:
    normalized = " ".join(text.split()).strip()
    if not normalized or normalized in IGNORE_TEXT_EXACT:
        return False
    if normalized.startswith("http") or normalized.startswith("/"):
        return False
    if normalized.startswith("@") or "starryring.com/" in normalized.lower():
        return False
    if re.fullmatch(r"[\d\s:.,\-–—+/|()%]+", normalized):
        return False
    if len(re.findall(r"[A-Za-z]{3,}", normalized)) == 0:
        return False
    return True


def protect_text(text: str) -> str:
    return text.replace("StarryRing", BRAND_TOKEN).replace("KeyCheck Pro", PRODUCT_TOKEN)


def unprotect_text(text: str) -> str:
    return text.replace(BRAND_TOKEN, "StarryRing").replace(PRODUCT_TOKEN, "KeyCheck Pro")


def google_translate_one(text: str, locale_code: str) -> str:
    if locale_code == "pcm":
        return PCM_MANUAL.get(text, text)

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

    if not translated:
        return text
    time.sleep(0.12)
    return unescape(unprotect_text(translated))


def collect_nodes(soup):
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
            nodes.append(("text", element, original, normalized))
            texts.append(normalized)

    for tag in soup.find_all(True):
        if tag.find_parent(class_="language-dropdown"):
            continue
        if tag.name == "meta":
            if tag.get("name") in {"description", "twitter:title", "twitter:description", "author", "copyright"}:
                value = tag.get("content")
                if value and should_translate_text(value):
                    nodes.append(("attr", tag, "content", value))
                    texts.append(value)
            if tag.get("property") in {"og:title", "og:description", "og:image:alt", "og:site_name"}:
                value = tag.get("content")
                if value and should_translate_text(value):
                    nodes.append(("attr", tag, "content", value))
                    texts.append(value)
            continue

        for attr in ("aria-label", "title", "placeholder", "alt"):
            value = tag.get(attr)
            if value and should_translate_text(value):
                nodes.append(("attr", tag, attr, value))
                texts.append(value)

    return nodes, texts


def localize_json_ld(html: str, translations: dict[str, str]) -> str:
    for source, target in translations.items():
        html = html.replace(source, target)
    return html


def normalize_branding(html: str) -> str:
    html = html.replace(BRAND_TOKEN, "StarryRing")
    html = html.replace(PRODUCT_TOKEN, "KeyCheck Pro")
    html = re.sub(r"(\|\s*)[^<|]*Starry[^<]*(</title>)", r"\1StarryRing\2", html)
    html = re.sub(r"([·\-–—]\s*)Starry\s+Ring", r"\1StarryRing", html)
    html = re.sub(r"__[^_]{1,80}__", "StarryRing", html)
    return html


def localize_route(locale_code: str, route: str) -> tuple[int, int]:
    page_path = ROOT / locale_code / route
    html = page_path.read_text(encoding="utf-8")
    soup = BeautifulSoup(html, "html.parser")
    nodes, texts = collect_nodes(soup)
    translations = {}
    for text in dict.fromkeys(texts):
        translations[text] = google_translate_one(text, locale_code)

    changed_count = sum(1 for source, target in translations.items() if source != target)

    for node_type, ref, payload, normalized in nodes:
        if node_type == "text":
            translated = translations.get(normalized)
            if translated:
                ref.replace_with(translated)
        else:
            translated = translations.get(normalized)
            if translated:
                ref[payload] = translated

    html = str(soup)
    html = localize_json_ld(html, translations)
    html = normalize_branding(html)
    page_path.write_text(html, encoding="utf-8")
    return changed_count, len(translations)


def main():
    selected = sys.argv[1:] or list(LOCALES.keys())
    for locale_code in selected:
        total_changed = 0
        total_strings = 0
        for route in ROUTES:
            changed, count = localize_route(locale_code, route)
            total_changed += changed
            total_strings += count
            print(f"{locale_code} {route}: {changed}/{count}", flush=True)
        print(f"{locale_code} total: {total_changed}/{total_strings}", flush=True)


if __name__ == "__main__":
    main()
