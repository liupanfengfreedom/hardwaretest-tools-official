import json
import re
from pathlib import Path

from bs4 import BeautifulSoup, Comment

ROOT = Path(r"F:\WebTool\toolsite")
PCM_ROOT = ROOT / "pcm"
ROUTES = sorted(path.relative_to(PCM_ROOT).as_posix() for path in PCM_ROOT.rglob("*.html"))

ATTRS = ("title", "placeholder", "aria-label", "alt")
META_NAMES = {
    "description",
    "keywords",
    "twitter:title",
    "twitter:description",
    "apple-mobile-web-app-title",
    "application-name",
}
META_PROPERTIES = {"og:title", "og:description", "og:image:alt", "og:site_name"}
JSON_KEYS = {"name", "description", "caption", "headline", "text", "alternateName"}

PHRASE_MAP = [
    ("Loading...", "Dey load..."),
    ("Home", "House"),
    ("Tool box", "Tool corner"),
    ("Toolbox", "Tool corner"),
    ("mouse test", "mouse check"),
    ("Mouse test", "Mouse check"),
    ("keyboard test", "keyboard check"),
    ("Keyboard test", "Keyboard check"),
    ("camera test", "camera check"),
    ("Camera test", "Camera check"),
    ("microphone test", "microphone check"),
    ("Microphone test", "Microphone check"),
    ("Mic test", "Mic check"),
    ("speaker Test", "speaker check"),
    ("Speaker test", "Speaker check"),
    ("Screen Test", "Screen check"),
    ("online", "for internet"),
    ("Online", "For internet"),
    ("Free", "No-pay"),
    ("Free online wey you fit use", "Free tool wey you fit use online"),
    ("Free online", "Free tool wey you fit use online"),
    ("Free Online Tool", "Free tool wey you fit use online"),
    ("Free Online", "Free tool wey you fit use online"),
    ("Global Exchange Rate Trend Analyzer - Enhanced", "Global exchange rate trend analyzer plus"),
    ("Global Exchange Rate Trend Analyzer Features", "Wetin dis global exchange rate trend analyzer fit do"),
    ("Real-time Currency Conversion & Historical Trend Analysis Tool | 170+ Global Currencies | Data Sourced from European Central Bank", "Real-time currency conversion and historical trend analysis tool for 170+ world currencies, with data from European Central Bank."),
    ("Professional Mouse Tester Features", "Things dis pro mouse test tool fit do"),
    ("Pro Mouse tester Features", "Things dis pro mouse test tool fit do"),
    ("Features", "Wetin e fit do"),
    ("Technical Specifications", "Technical details"),
    ("Overview:", "Overview:"),
    ("Introduction:", "Intro:"),
    ("Current", "Current"),
    ("Frequently Asked Questions (FAQ)", "Question wey people dey ask well well (FAQ)"),
    ("Learn how to use this tool from scratch. Includes step-by-step instructions, testing tips, and FAQs.", "Learn how to use dis tool from beginning. E get step-by-step guide, test tips, and FAQ."),
    ("Learn more about", "Learn more about"),
    ("How to use", "Use guide"),
    ("Click to view", "Click make you open am"),
    ("Currently viewing", "Na dis you dey view now"),
    ("Specialized test for", "Special test for"),
    ("Comprehensively tests", "E test well well"),
    ("Automatically identifies", "E dey identify by itself"),
    ("Logs timestamps and details of all", "E keep time stamp and details of all"),
    ("Deep dive into", "Deep check inside"),
    ("online", "online"),
    ("Online", "Online"),
    ("Tool Interface", "Tool interface"),
    ("Select the test tool you need for a comprehensive", "Choose di test tool wey you need for better"),
    ("Select the currency you currently have", "Choose di currency wey you get now"),
    ("Select the currency you want to convert to", "Choose di currency wey you wan change am to"),
    ("Enter the amount you want to convert", "Put di amount wey you wan convert"),
    ("This tool", "Dis tool"),
    ("This page", "Dis page"),
    ("This test", "Dis test"),
    ("These", "Dese"),
    ("This", "Dis"),
    ("Tests", "Test"),
    ("Tests ", "Test "),
    ("Detects", "Detect"),
    ("Includes", "E include"),
    ("Allows", "E allow"),
    ("Helps", "E help"),
    ("Shows", "E show"),
    ("Displays", "E show"),
    ("Provides", "E give"),
    ("Supports", "E support"),
    ("Professional", "Pro"),
    ("Current", "Current"),
    ("Double-click", "Double-click"),
    ("Button Function Test + Side Button Test + Click Test", "Button function test + side button test + click test"),
    ("Online Mouse testing Tool", "Online mouse test tool"),
    ("Online Mouse test", "Online mouse test"),
    ("Mouse test Toolbox", "Mouse test toolbox"),
    ("Mouse Tester", "Mouse test tool"),
    ("Keyboard Tester", "Keyboard test tool"),
    ("Speaker Test", "Speaker test"),
    ("Dead Pixel Test", "Dead pixel test"),
    ("Camera Test", "Camera test"),
    ("Mic Test", "Mic test"),
    ("WebSocket Test", "WebSocket test"),
    ("JSON Parser", "JSON parser"),
    ("QR Code Generator", "QR code generator"),
    ("Password Generator", "Password generator"),
    ("Random Number Generator", "Random number generator"),
    ("Currency Converter", "Currency converter"),
    ("App Icon Generator", "App icon generator"),
    ("Exchange Rate Technical Specifications", "Exchange rate technical details"),
    ("Key Advantages of", "Main advantage of"),
    ("Question wey people dey ask well well (FAQ)", "Question wey people dey ask well well (FAQ)"),
    ("Image Converter", "Image converter"),
    ("Video Converter", "Video converter"),
    ("Audio Converter", "Audio converter"),
]

WORD_MAP = {
    " the ": " di ",
    " The ": " Di ",
    " your ": " your ",
    " you ": " you ",
    " can ": " fit ",
    " will ": " go ",
    " should ": " suppose ",
    " with ": " with ",
    " and ": " and ",
    " for ": " for ",
    " from ": " from ",
    " to ": " to ",
}

BRAND_MAP = {
    "StarryRing": "StarryRing",
    "Starry Tool": "Starry Tool",
    "Starry Toolbox": "Starry Toolbox",
    "KeyCheck Pro": "KeyCheck Pro",
    "CyberPass Pro": "CyberPass Pro",
    "HardwareTest": "HardwareTest",
}


def has_english_signal(text: str) -> bool:
    normalized = " ".join(text.split()).strip()
    if not normalized:
        return False
    if normalized.startswith(("http", "/", "#", "@", "mailto:", "tel:")):
        return False
    if "starryring.com/" in normalized.lower():
        return False
    return len(re.findall(r"[A-Za-z]{3,}", normalized)) > 0


def pidginize(text: str) -> str:
    if not has_english_signal(text):
        return text
    out = text
    for source, target in PHRASE_MAP:
        out = out.replace(source, target)
    for source, target in WORD_MAP.items():
        out = out.replace(source, target)
    out = re.sub(r"\b([Tt])his\b", lambda m: "Dis" if m.group(1) == "T" else "dis", out)
    out = re.sub(r"\b([Tt])hese\b", lambda m: "Dese" if m.group(1) == "T" else "dese", out)
    out = re.sub(r"\b([Tt])hat\b", lambda m: "Dat" if m.group(1) == "T" else "dat", out)
    out = re.sub(r"\b([Aa])re\b", lambda m: "Na" if m.group(1) == "A" else "na", out)
    out = re.sub(r"\b([Ii])s\b", lambda m: "Na" if m.group(1) == "I" else "na", out)
    out = re.sub(r"\b([Ww])hen\b", lambda m: "When" if m.group(1) == "W" else "when", out)
    for brand, replacement in BRAND_MAP.items():
        out = out.replace(brand, replacement)
    return out


def transform_json(payload):
    if isinstance(payload, dict):
        out = {}
        for key, value in payload.items():
            if isinstance(value, str) and key in JSON_KEYS:
                out[key] = pidginize(value)
            else:
                out[key] = transform_json(value)
        return out
    if isinstance(payload, list):
        return [transform_json(item) for item in payload]
    return payload


def process_page(route: str):
    path = PCM_ROOT / route
    soup = BeautifulSoup(path.read_text(encoding="utf-8", errors="ignore"), "html.parser")
    changed = 0

    for element in soup.find_all(string=True):
        if isinstance(element, Comment):
            continue
        parent = element.parent
        if parent and parent.name in {"script", "style"}:
            continue
        if parent and parent.find_parent(class_="language-dropdown"):
            continue
        text = " ".join(str(element).split()).strip()
        if has_english_signal(text):
            updated = pidginize(text)
            if updated != text:
                element.replace_with(updated)
                changed += 1

    for tag in soup.find_all(True):
        if tag.find_parent(class_="language-dropdown"):
            continue
        for attr in ATTRS:
            value = tag.get(attr)
            if value and has_english_signal(value):
                updated = pidginize(value)
                if updated != value:
                    tag[attr] = updated
                    changed += 1
        if tag.name == "meta":
            value = tag.get("content")
            if value and (
                tag.get("name") in META_NAMES or tag.get("property") in META_PROPERTIES
            ) and has_english_signal(value):
                updated = pidginize(value)
                if updated != value:
                    tag["content"] = updated
                    changed += 1

    for script_tag in soup.find_all("script", attrs={"type": "application/ld+json"}):
        try:
            payload = json.loads(script_tag.string or script_tag.get_text())
        except json.JSONDecodeError:
            continue
        new_payload = transform_json(payload)
        if new_payload != payload:
            script_tag.string = json.dumps(new_payload, ensure_ascii=False, indent=4)
            changed += 1

    html = soup.decode(formatter="html").lstrip("\ufeff")
    html = re.sub(r"^\s*html\s*(?=<html\b)", "", html, count=1, flags=re.IGNORECASE)
    html = "<!DOCTYPE html>\n" + html.lstrip()
    path.write_text(html, encoding="utf-8")
    return changed


def main():
    total = 0
    for route in ROUTES:
        count = process_page(route)
        total += count
        if count:
            print(f"{route}: {count}", flush=True)
    print(f"pcm total changes={total}", flush=True)


if __name__ == "__main__":
    main()
