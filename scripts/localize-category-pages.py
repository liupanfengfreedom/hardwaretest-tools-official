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
LOCALES = [
    "es", "fr", "ar", "bn", "pt", "ru", "ur", "id", "de", "pcm", "mr", "te", "tr", "ta"
]

ROUTES = {
    "toolbox/index.html": {
        "script_from": "/static/js/toolbox/en-main.js",
        "script_to": "/static/js/toolbox/{locale}-main.js",
        "extra_texts": [
            "HardwareTest Pro - English Version",
            "Professional online mouse|keyboard|camera|microphone testing tools",
            "HardwareTest Tools",
        ],
        "runtime_messages": {
            "showDocs": "View User Manual",
            "hideDocs": "Hide User Manual",
            "fontsReady": "All fonts loaded successfully",
            "fontsWarn": "Some fonts failed to load:"
        }
    },
    "utility-tools/index.html": {
        "script_from": "/static/js/utility-tools/script-en.js",
        "script_to": "/static/js/utility-tools/script-{locale}.js",
        "runtime_messages": {
            "toolsSuffix": "tools",
            "resultsHint": "Found {count} matching tools",
            "defaultHint": "Type a keyword to quickly find the tool you need",
            "focusHint": "Press ESC to clear • Ctrl+K to search quickly"
        }
    }
}

BRAND_TOKENS = {
    "StarryRing": "__STARRYRING__",
    "KeyCheck Pro": "__KEYCHECKPRO__",
    "HardwareTest": "__HARDWARETEST__",
    "HardwareTest Pro": "__HARDWARETESTPRO__",
    "Utility Tools": "__UTILITYTOOLS__",
}

IGNORE_TEXT_EXACT = {
    "English", "Español", "Français", "العربية", "বাংলা", "Português", "Русский",
    "اردو", "Bahasa Indonesia", "Deutsch", "Naijá", "मराठी", "తెలుగు", "Türkçe",
    "தமிழ்", "हिन्दी", "Tiếng Việt", "日本語", "简体中文", "한국어", "🌐",
    "Home", "Toolbox", "Utility Tools", "PRO", "html"
}

PCM_MANUAL = {
    "View User Manual": "See user manual",
    "Hide User Manual": "Hide user manual",
    "All fonts loaded successfully": "All fonts load well",
    "Some fonts failed to load:": "Some fonts no load:",
    "Found {count} matching tools": "Found {count} tools wey match",
    "Type a keyword to quickly find the tool you need": "Type keyword make you quick find the tool wey you need",
    "Press ESC to clear • Ctrl+K to search quickly": "Press ESC clear • Ctrl+K search quick",
    "mouse test,keyboard test,camera test,microphone test": "mouse test, keyboard test, camera test, microphone test",
    "Professional online hardware testing tools - mouse test, mouse click test, double click test, keyboard test, microphone test, camera test. Free, no download needed, instant hardware diagnostics solution": "Professional online hardware test tools - mouse test, mouse click test, double click test, keyboard test, microphone test, camera test. Free, no download, instant hardware diagnostics solution.",
    "HardwareTest Pro - English Version": "HardwareTest Pro",
    "Professional online mouse|keyboard|camera|microphone testing tools": "Professional online mouse, keyboard, camera, and microphone testing tools",
    "HardwareTest Tools": "HardwareTest Tools",
    "Mouse Test": "Mouse test",
    "Keyboard Test": "Keyboard test",
    "Camera Test": "Camera test",
    "Mic Test": "Mic test",
    "Screen Test": "Screen test",
    "speaker Test": "Speaker test",
    "Mouse double-clicking? Keyboard ghosting? Mic too quiet? No download needed. Professional Online Hardware Lab .": "Mouse dey double-click? Keyboard dey ghost? Mic too quiet? No download needed. Na professional online hardware lab.",
    "Online Hardware Lab": "Online hardware lab",
    "Mouse Test Lab": "Mouse test lab",
    "Millisecond-level switch analysis. Real-time Polling Rate, scroll wheel & side button tests. Fix double-click issues.": "Millisecond-level switch analysis. Real-time polling rate, scroll wheel, and side button tests. Fix double-click wahala.",
    "Start Mouse Test": "Start mouse test",
    "Keyboard Master": "Keyboard master",
    "Full-key rollover & conflict test. Integrated repair guide for ghosting and unresponsive keys.": "Full-key rollover and conflict test. Get built-in repair guide for ghosting and keys wey no respond.",
    "Launch Keyboard Test": "Launch keyboard test",
    "Apple Keyboard Test": "Apple keyboard test",
    "A/V Diagnostics": "A/V diagnostics",
    "One-click webcam & mic check. Detailed resolution, frame rate & waveform analysis. Mobile & PC supported.": "One-click webcam and mic check. Detailed resolution, frame rate, and waveform analysis. Mobile and PC supported.",
    "Webcam Test": "Webcam test",
    "HardwareTest User Manual & Features": "HardwareTest user manual and features",
    "Comprehensive camera status detection including resolution, frame rate, autofocus, and color accuracy. Supports front and rear camera switching tests.": "Complete camera status check including resolution, frame rate, autofocus, and color accuracy. Supports front and rear camera switching tests.",
    "Precise microphone status detection including sensitivity testing, noise analysis, and audio quality assessment. Provides real-time waveform visualization.": "Precise microphone status check including sensitivity test, noise analysis, and audio quality check. Shows real-time waveform.",
    "Frequently Asked Questions": "Frequently asked questions",
    "Q: Do these testing tools require any software installation?": "Q: Do these testing tools need any software installation?",
    "A: Not at all! HardwareTest is a web-based online tool that works directly in modern browsers like Chrome, Firefox, Edge, etc.": "A: Not at all! HardwareTest na web tool wey work direct for modern browsers like Chrome, Firefox, and Edge.",
    "Q: Are the test results accurate?": "Q: Are the test results accurate?",
    "A: Our tools use professional testing algorithms that accurately reflect hardware status. Note that some advanced features may require specific browser permissions.": "A: Our tools use professional testing algorithms wey show hardware status well. Some advanced features fit need special browser permission.",
    "Q: Does it support mobile devices?": "Q: E support mobile devices?",
    "A: Yes! HardwareTest fully supports smartphones and tablets, allowing you to test mobile device cameras, microphones, and other functions.": "A: Yes! HardwareTest support smartphones and tablets well, so you fit test camera, microphone, and other functions.",
    "© 2023 HardwareTest Tools Official. All Systems Operational.": "© 2023 HardwareTest Tools Official. All systems operational.",
    "Utility Tools – Your Online Toolbox": "Utility tools – your online toolbox",
    "A collection of various utility tools to boost your productivity. One‑click access.": "Collection of different utility tools to boost your productivity. One-click access.",
    "Search tool name or function...": "Search tool name or function...",
    "Design & Media": "Design and media",
    "Math Tools": "Math tools",
    "Dev & Network Tools": "Dev and network tools",
    "App Icon Generator": "App icon generator",
    "Generate multi‑size app icons for iOS & Android with one click": "Generate app icons in many sizes for iOS and Android with one click",
    "Favicon Generator": "Favicon generator",
    "Create browser icons for your website. Export in multiple formats and sizes": "Create browser icons for your website. Export in many formats and sizes",
    "Image Converter": "Image converter",
    "Convert between PNG, JPG, WebP, SVG, etc. Resize with high quality kept": "Convert between PNG, JPG, WebP, SVG, and more. Resize while keeping high quality",
    "Online Voice Recorder": "Online voice recorder",
    "Record system audio or microphone. Supports timed stop, multiple export formats, real-time waveform visualization": "Record system audio or microphone. Supports timed stop, many export formats, and real-time waveform display",
    "Audio Converter": "Audio converter",
    "Convert between MP3, WAV, FLAC, AAC and more. Extract audio from videos. Process locally": "Convert between MP3, WAV, FLAC, AAC, and more. Extract audio from videos. Process am locally",
    "Currency Calculator": "Currency calculator",
    "Real‑time exchange rates and conversion for 150+ global currencies": "Real-time exchange rates and conversion for 150+ world currencies",
    "Password Generator": "Password generator",
    "Generate strong, secure passwords with customizable length and character types": "Generate strong secure passwords with custom length and character types",
    "MD5 Hash Tool": "MD5 hash tool",
    "Generate MD5-32, MD5-16, and uppercase hashes from text, files, or batch input": "Generate MD5-32, MD5-16, and uppercase hashes from text, files, or batch input",
    "CRC32 Checksum Tool": "CRC32 checksum tool",
    "Calculate and verify CRC32 checksums for text, files, hex input, Base64, and multiple CRC32 variants": "Calculate and verify CRC32 checksum for text, files, hex input, Base64, and many CRC32 variants",
    "RSA Encryption Tool": "RSA encryption tool",
    "Generate key pairs, import PEM public keys, and run RSA-OAEP encryption directly in your browser": "Generate key pairs, import PEM public keys, and run RSA-OAEP encryption direct for browser",
    "RSA Decryption Tool": "RSA decryption tool",
    "Import PEM private keys, read Base64, Hex, or .enc ciphertext, and perform RSA-OAEP decryption directly in your browser": "Import PEM private keys, read Base64, Hex, or .enc ciphertext, and do RSA-OAEP decryption direct for browser",
    "AES Encryption Tool": "AES encryption tool",
    "Use CBC, CTR, or GCM, generate random keys and IV values, and encrypt text or files directly in your browser": "Use CBC, CTR, or GCM, generate random keys and IV values, and encrypt text or files direct for browser",
    "AES Decryption Tool": "AES decryption tool",
    "Import the key and IV, read Base64, Hex, or .enc ciphertext, and decrypt it directly in your browser": "Import key and IV, read Base64, Hex, or .enc ciphertext, and decrypt am direct for browser",
    "WebSocket test tool": "Tool to test WebSocket",
    "Test WebSocket connections online. Send and receive messages in real‑time": "Test WebSocket connections online. Send and receive messages in real time",
    "More tools coming soon...": "More tools dey come soon...",
}


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
    if normalized.startswith("http") or normalized.startswith("/"):
        return False
    if "starryring.com/" in normalized.lower():
        return False
    if re.fullmatch(r"[\d\s:.,\-–—+/|()%&]+", normalized):
        return False
    if len(re.findall(r"[A-Za-z]{3,}", normalized)) == 0:
        return False
    return True


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
    time.sleep(0.12)
    return unescape(unprotect_text(translated or text))


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
            nodes.append(("text", element, normalized))
            texts.append(normalized)

    for tag in soup.find_all(True):
        if tag.find_parent(class_="language-dropdown"):
            continue
        for attr in ("content", "title", "placeholder", "aria-label"):
            value = tag.get(attr)
            if not value:
                continue
            if attr == "content":
                if tag.name != "meta":
                    continue
                if tag.get("name") not in {"description", "twitter:title", "twitter:description"} and tag.get("property") not in {"og:title", "og:description"}:
                    continue
            if should_translate_text(value):
                nodes.append(("attr", tag, attr))
                texts.append(value)

    return nodes, texts


def normalize_branding(html: str) -> str:
    for source, token in BRAND_TOKENS.items():
        html = html.replace(token, source)
    html = html.replace(" - English Version", "")
    html = re.sub(r"__[^_]{1,80}__", lambda m: m.group(0).strip("_"), html)
    return html


def write_toolbox_script(locale_code: str, locale_tag: str):
    messages = {
        key: google_translate_one(value, locale_code) for key, value in ROUTES["toolbox/index.html"]["runtime_messages"].items()
    }
    script = f"""window.addEventListener('DOMContentLoaded', () => {{
    document.querySelectorAll('a[target="_blank"]').forEach(link => {{
        link.addEventListener('click', function() {{
            if (this.hostname === window.location.hostname) {{
                document.querySelector('.loading').classList.add('active');
                setTimeout(() => {{
                    document.querySelector('.loading').classList.remove('active');
                }}, 3000);
            }}
        }});
    }});

    const docsToggle = document.querySelector('.docs-toggle');
    const docsContent = document.querySelector('.docs-content');

    if (docsToggle && docsContent) {{
        docsToggle.addEventListener('click', function() {{
            docsContent.classList.toggle('active');
            docsToggle.textContent = docsContent.classList.contains('active')
                ? {json.dumps(messages["hideDocs"], ensure_ascii=False)}
                : {json.dumps(messages["showDocs"], ensure_ascii=False)};
        }});
    }}

    document.addEventListener('visibilitychange', function() {{
        if (document.visibilityState === 'visible') {{
            document.querySelector('.loading').classList.remove('active');
        }}
    }});
}});

document.fonts.ready.then(() => {{
    console.log({json.dumps(messages["fontsReady"], ensure_ascii=False)});
}}).catch((error) => {{
    console.warn({json.dumps(messages["fontsWarn"], ensure_ascii=False)}, error);
}});
"""
    out = ROOT / "static/js/toolbox" / f"{locale_code}-main.js"
    out.write_text(script, encoding="utf-8")


def write_utility_script(locale_code: str, locale_tag: str):
    base = ROUTES["utility-tools/index.html"]["runtime_messages"]
    messages = {key: google_translate_one(value, locale_code) for key, value in base.items()}
    script = f"""lucide.createIcons();

document.addEventListener('DOMContentLoaded', function() {{
    document.body.classList.add('loaded');

    const searchBar = document.querySelector('.search-bar');
    const cards = document.querySelectorAll('.tool-card');
    const sections = document.querySelectorAll('.category-section');

    searchBar.addEventListener('input', (e) => {{
        const term = e.target.value.toLowerCase().trim();
        let visibleCardsCount = 0;

        cards.forEach(card => {{
            const title = card.querySelector('h3').innerText.toLowerCase();
            const desc = card.querySelector('p').innerText.toLowerCase();
            const tag = card.querySelector('.tool-tag').innerText.toLowerCase();

            if (title.includes(term) || desc.includes(term) || tag.includes(term)) {{
                card.style.display = 'flex';
                visibleCardsCount++;
            }} else {{
                card.style.display = 'none';
            }}
        }});

        sections.forEach(section => {{
            const sectionCards = section.querySelectorAll('.tool-card');
            const countElement = section.querySelector('.category-count');
            let visibleInSection = 0;

            sectionCards.forEach(card => {{
                if (card.style.display !== 'none') {{
                    visibleInSection++;
                }}
            }});

            if (countElement) {{
                countElement.textContent = `${{visibleInSection}} {messages["toolsSuffix"]}`;
            }}

            if (visibleInSection === 0 && term.length > 0) {{
                section.style.display = 'none';
            }} else {{
                section.style.display = 'block';
            }}
        }});

        const resultsHint = document.querySelector('.search-hint');
        if (resultsHint) {{
            if (term.length > 0) {{
                resultsHint.textContent = {json.dumps(messages["resultsHint"], ensure_ascii=False)}.replace('{{count}}', visibleCardsCount);
            }} else {{
                resultsHint.textContent = {json.dumps(messages["defaultHint"], ensure_ascii=False)};
            }}
        }}

        if (term.length === 0) {{
            sections.forEach(section => {{
                section.style.display = 'block';
            }});
        }}
    }});

    cards.forEach(card => {{
        card.addEventListener('click', function(e) {{
            e.preventDefault();
            const targetUrl = this.getAttribute('href');
            this.style.transform = 'translateY(-4px) scale(0.95)';
            setTimeout(() => {{
                window.location.href = targetUrl;
            }}, 150);
        }});
    }});

    document.addEventListener('keydown', function(e) {{
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {{
            e.preventDefault();
            searchBar.focus();
        }}
        if (e.key === 'Escape' && document.activeElement === searchBar) {{
            searchBar.value = '';
            searchBar.dispatchEvent(new Event('input'));
            searchBar.blur();
        }}
    }});

    const searchHint = document.querySelector('.search-hint');
    const originalHint = searchHint.textContent;
    searchBar.addEventListener('focus', function() {{
        searchHint.textContent = {json.dumps(messages["focusHint"], ensure_ascii=False)};
    }});

    searchBar.addEventListener('blur', function() {{
        if (this.value === '') {{
            searchHint.textContent = originalHint;
        }}
    }});
}});
"""
    out = ROOT / "static/js/utility-tools" / f"script-{locale_code}.js"
    out.write_text(script, encoding="utf-8")


def localize_route(locale_code: str, route: str):
    page_path = ROOT / locale_code / route
    html = page_path.read_text(encoding="utf-8")
    soup = BeautifulSoup(html, "html.parser")
    nodes, texts = collect_nodes(soup)
    translations = {}
    for text in dict.fromkeys(texts):
        translations[text] = google_translate_one(text, locale_code)
    for text in ROUTES[route].get("extra_texts", []):
        translations[text] = google_translate_one(text, locale_code)
    changed = sum(1 for k, v in translations.items() if k != v)

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
    route_meta = ROUTES[route]
    html = html.replace(route_meta["script_from"], route_meta["script_to"].format(locale=locale_code))
    for source, target in translations.items():
        html = html.replace(source, target)
    html = html.replace('"inLanguage": "en"', f'"inLanguage": "{locale_code}"')
    html = normalize_branding(html)
    page_path.write_text(html, encoding="utf-8")
    return changed, len(translations)


def main():
    selected = sys.argv[1:] or LOCALES
    for locale_code in selected:
        total_changed = 0
        total_seen = 0
        for route in ROUTES:
            changed, seen = localize_route(locale_code, route)
            total_changed += changed
            total_seen += seen
            print(f"{locale_code} {route}: {changed}/{seen}", flush=True)
        write_toolbox_script(locale_code, locale_code)
        write_utility_script(locale_code, locale_code)
        print(f"{locale_code} total: {total_changed}/{total_seen}", flush=True)


if __name__ == "__main__":
    main()
