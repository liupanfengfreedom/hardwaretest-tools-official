import json
import re
import sys
import time
from html import unescape
from pathlib import Path
from urllib.parse import quote, urlencode
from urllib.error import URLError
from urllib.request import Request, urlopen

from bs4 import BeautifulSoup, Comment, NavigableString

ROOT = Path(r"F:\WebTool\toolsite")
ROUTE = Path("utility-tools/math/currency-calculator/index.html")
BRAND_TOKEN = "__STARRYRING__"
BRAND_VARIANTS = [
    "Anillo estrellado",
    "Bague Étoilée",
    "Bague étoilée",
    "তারারিং",
    "Anel Estrelado",
    "Звездное Кольцо",
    "Звездное кольцо",
    "ستاروں کی رنگت",
    "Cincin Berbintang",
    "__حلقة النجوم__",
    "__तारांकित__",
    "__స్టారిరింగ్__",
    "__ஸ்டாரிரிங்__",
]

LOCALES = {
    "es": {"langpair": "en|es", "locale": "es-ES"},
    "fr": {"langpair": "en|fr", "locale": "fr-FR"},
    "ar": {"langpair": "en|ar", "locale": "ar-SA"},
    "bn": {"langpair": "en|bn", "locale": "bn-BD"},
    "pt": {"langpair": "en|pt", "locale": "pt-PT"},
    "ru": {"langpair": "en|ru", "locale": "ru-RU"},
    "ur": {"langpair": "en|ur", "locale": "ur-PK"},
    "id": {"langpair": "en|id", "locale": "id-ID"},
    "de": {"langpair": "en|de", "locale": "de-DE"},
    "pcm": {"langpair": None, "locale": "en-NG"},
    "mr": {"langpair": "en|mr", "locale": "mr-IN"},
    "te": {"langpair": "en|te", "locale": "te-IN"},
    "tr": {"langpair": "en|tr", "locale": "tr-TR"},
    "ta": {"langpair": "en|ta", "locale": "ta-IN"},
}

PCM_MANUAL = {
    "Global Exchange Rate Trend Analyzer - Enhanced": "Global Exchange Rate Trend Analyzer - Better Better",
    "Real-time Currency Conversion & Historical Trend Analysis Tool | 170+ Global Currencies | Data Sourced from European Central Bank": "Real-time currency conversion and old trend analysis tool | 170+ world currencies | Data come from European Central Bank",
    "Amount": "Amount",
    "Enter the amount you want to convert": "Put the amount wey you wan convert",
    "From": "From",
    "To": "To",
    "Select the currency you currently have": "Choose the currency wey you get now",
    "Select the currency you want to convert to": "Choose the currency wey you wan convert to",
    "Fetching exchange rate...": "Dey fetch exchange rate...",
    "Real-time exchange rate reference (Data sourced from European Central Bank, updated daily)": "Real-time exchange rate reference (data from European Central Bank, dem dey update am every day)",
    "Historical Trend Analysis": "Historical Trend Analysis",
    "View historical exchange rate trends to understand long-term currency performance": "See old exchange rate trend make you understand how currency don behave for long time",
    "1 Year": "1 Year",
    "5 Years": "5 Years",
    "10 Years": "10 Years",
    "20 Years": "20 Years",
    "30 Years": "30 Years",
    "Loading historical trend data...": "Dey load historical trend data...",
    "Exchange Rate Trend": "Exchange Rate Trend",
    "High Points": "High Points",
    "Low Points": "Low Points",
    "Global Exchange Rate Trend Analyzer Features": "Global Exchange Rate Trend Analyzer Features",
    "Exchange Rate Technical Specifications": "Exchange Rate Technical Specifications",
    "Frequently Asked Questions (FAQ)": "Frequently Asked Questions (FAQ)",
    "About Us": "About Us",
    "Contact Us": "Contact Us",
    "Disclaimer": "Disclaimer",
    "Privacy Policy": "Privacy Policy",
    "Terms of Service": "Terms of Service",
    "Currency Converter": "Currency Converter",
    "Utility Tools": "Utility Tools",
    "Home": "Home",
}

IGNORE_TEXT_EXACT = {
    "English", "Español", "Français", "العربية", "বাংলা", "Português", "Русский",
    "اردو", "Bahasa Indonesia", "Deutsch", "Naijá", "मराठी", "తెలుగు", "Türkçe",
    "தமிழ்", "हिन्दी", "Tiếng Việt", "日本語", "简体中文", "한국어", "🌐", "---",
    ",", ", and", "Chart.js", "Favicon", "Breadcrumb Navigation", "Language Switcher",
    "Main Header Section", "Instructions and FAQ Section", "Technical Specifications Section",
    "Page Footer", "Primary meta description and keywords", "Open Graph meta tags",
    "Twitter Card meta tags", "Preload critical resources", "Structured Data JSON-LD",
    "Internationalization links", "Stylesheets", "Local Scripts", "html"
}

TRANSLATABLE_ATTRS = {
    ("meta", "content"),
    ("input", "placeholder"),
    ("input", "aria-label"),
    ("select", "aria-label"),
    ("button", "aria-label"),
    ("button", "title"),
    ("img", "alt"),
}


def should_translate_text(text: str) -> bool:
    text = " ".join(text.split()).strip()
    if not text or text in IGNORE_TEXT_EXACT:
        return False
    if text.startswith("http") or text.startswith("/"):
        return False
    if "starryring.com" in text.lower():
        return False
    if len(re.findall(r"[A-Za-z]{3,}", text)) == 0:
        return False
    return True


def mymemory_translate_many(texts, langpair):
    if not texts:
        return {}
    if not langpair:
        return {text: PCM_MANUAL.get(text, text) for text in texts}

    def translate_chunk(chunk):
        payload = "\n".join(f"__SEG{i}__ {text}" for i, text in enumerate(chunk))
        query = urlencode({"q": payload, "langpair": langpair})
        url = f"https://api.mymemory.translated.net/get?{query}"
        data = None
        last_error = None
        for attempt in range(4):
            try:
                request = Request(url, headers={"User-Agent": "Mozilla/5.0"})
                with urlopen(request, timeout=30) as response:
                    data = json.loads(response.read().decode("utf-8"))
                break
            except (URLError, TimeoutError, FileNotFoundError) as exc:
                last_error = exc
                time.sleep(0.8 * (attempt + 1))

        if data is None:
            if len(chunk) > 1:
                midpoint = len(chunk) // 2
                left = translate_chunk(chunk[:midpoint])
                right = translate_chunk(chunk[midpoint:])
                return {**left, **right}
            return {chunk[0]: chunk[0]}

        translated = unescape(data["responseData"]["translatedText"])
        parts = re.split(r"__\s*SEG(\d+)\s*__", translated)
        found = {}
        for i in range(1, len(parts), 2):
            seg_index = int(parts[i])
            seg_text = parts[i + 1].strip().lstrip(":").strip()
            found[seg_index] = seg_text

        chunk_result = {}
        for seg_index, source in enumerate(chunk):
            chunk_result[source] = found.get(seg_index, source)

        # MyMemory sometimes echoes a large batch back unchanged.
        if len(chunk) > 1 and all(chunk_result[source] == source for source in chunk):
            midpoint = len(chunk) // 2
            left = translate_chunk(chunk[:midpoint])
            right = translate_chunk(chunk[midpoint:])
            chunk_result = {**left, **right}

        time.sleep(0.2)
        return chunk_result

    result = {}
    pending = list(dict.fromkeys(texts))
    idx = 0
    while idx < len(pending):
        chunk = []
        size = 0
        while idx < len(pending):
            probe = f"__SEG{len(chunk)}__ {pending[idx]}\n"
            if chunk and (size + len(probe) > 1200 or len(chunk) >= 8):
                break
            chunk.append(pending[idx])
            size += len(probe)
            idx += 1

        result.update(translate_chunk(chunk))

    return result


def google_translate_many(texts, target_code):
    if not texts:
        return {}
    if target_code == "pcm":
        return {text: PCM_MANUAL.get(text, text) for text in texts}

    unique_texts = list(dict.fromkeys(texts))
    results = {}
    for text in unique_texts:
        protected_text = text.replace("StarryRing", BRAND_TOKEN)
        url = (
            "https://translate.googleapis.com/translate_a/single"
            f"?client=gtx&sl=en&tl={target_code}&dt=t&q={quote(protected_text)}"
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

        if translated:
            translated = translated.replace(BRAND_TOKEN, "StarryRing")
        results[text] = translated or PCM_MANUAL.get(text, text) if target_code == "pcm" else translated or text
        time.sleep(0.12)

    return results


def collect_translatable_strings(soup):
    texts = []
    nodes = []

    for element in soup.find_all(string=True):
        if isinstance(element, Comment):
            continue
        parent = element.parent
        if parent and parent.name in {"script", "style"}:
            continue
        original = str(element)
        normalized = " ".join(original.split()).strip()
        if should_translate_text(normalized):
            nodes.append(("text", element, original))
            texts.append(normalized)

    for tag in soup.find_all(True):
        if tag.name == "meta":
            key = (tag.name, "content")
            if key in TRANSLATABLE_ATTRS:
                content = tag.get("content")
                if content and should_translate_text(content):
                    nodes.append(("attr", tag, "content"))
                    texts.append(content)
            continue

        for attr in ("placeholder", "aria-label", "title", "alt"):
            key = (tag.name, attr)
            if key in TRANSLATABLE_ATTRS:
                value = tag.get(attr)
                if value and should_translate_text(value):
                    nodes.append(("attr", tag, attr))
                    texts.append(value)

    return nodes, texts


def localize_json_ld(html, translations):
    for source, target in translations.items():
        html = html.replace(source, target)
    return html


def normalize_branding(html):
    html = re.sub(r"(<title>.*?\|\s*)[^<]+(</title>)", r"\1StarryRing\2", html, count=1, flags=re.S)
    for variant in BRAND_VARIANTS:
        html = html.replace(variant, "StarryRing")
    html = re.sub(r"__[^<>{}]{1,60}__", "StarryRing", html)
    return html


def write_runtime_script(locale_code, locale_tag, translations):
    messages = {
        "syncingRate": translations.get("Syncing exchange rate...", "Syncing exchange rate..."),
        "failedRate": translations.get("Failed to fetch exchange rate", "Failed to fetch exchange rate"),
        "loadingHistory": translations.get("Loading historical trend data...", "Loading historical trend data..."),
        "fetchError": translations.get("Failed to fetch exchange rate", "Failed to fetch exchange rate"),
        "chartError": translations.get("Failed to load chart data", "Failed to load chart data"),
        "swapLabel": translations.get("Swap source and target currencies", "Swap source and target currencies"),
        "trendTitle": translations.get("__TREND_TEMPLATE__", "{{from}}/{{to}} {{years}}-Year Trend"),
        "rateText": translations.get("__RATE_TEMPLATE__", "1 {{from}} = {{rate}} {{to}}"),
    }
    script = f"""(function () {{
    const config = {{
        locale: "{locale_tag}",
        messages: {{
            syncingRate: {json.dumps(messages["syncingRate"], ensure_ascii=False)},
            failedRate: {json.dumps(messages["failedRate"], ensure_ascii=False)},
            loadingHistory: {json.dumps(messages["loadingHistory"], ensure_ascii=False)},
            fetchError: {json.dumps(messages["fetchError"], ensure_ascii=False)},
            chartError: {json.dumps(messages["chartError"], ensure_ascii=False)},
            swapLabel: {json.dumps(messages["swapLabel"], ensure_ascii=False)},
            trendTitle: (from, to, years) => {json.dumps(messages["trendTitle"], ensure_ascii=False)}.replace('{{from}}', from).replace('{{to}}', to).replace('{{years}}', years),
            rateText: (from, rate, to) => {json.dumps(messages["rateText"], ensure_ascii=False)}.replace('{{from}}', from).replace('{{rate}}', rate.toFixed(4)).replace('{{to}}', to)
        }}
    }};

    function boot() {{
        if (!window.__currencyCalculatorCoreLoader) {{
            window.__currencyCalculatorCoreLoader = new Promise((resolve, reject) => {{
                if (typeof window.initCurrencyCalculatorCore === "function") {{
                    resolve();
                    return;
                }}
                const script = document.createElement("script");
                script.src = "/static/js/utility-tools/math/currency-calculator/core.js";
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            }});
        }}

        window.__currencyCalculatorCoreLoader.then(() => {{
            window.initCurrencyCalculatorCore(config);
        }});
    }}

    boot();
}})();
"""
    out = ROOT / "static/js/utility-tools/math/currency-calculator" / f"script-{locale_code}.js"
    out.write_text(script, encoding="utf-8")


def main():
    selected_locales = sys.argv[1:] or list(LOCALES.keys())
    for locale_code in selected_locales:
        meta = LOCALES[locale_code]
        page_path = ROOT / locale_code / ROUTE
        html = page_path.read_text(encoding="utf-8")
        soup = BeautifulSoup(html, "html.parser")

        nodes, texts = collect_translatable_strings(soup)
        extra_texts = [
            "Syncing exchange rate...",
            "Failed to fetch exchange rate",
            "Loading historical trend data...",
            "Failed to load chart data",
            "Swap source and target currencies",
            "[[1]]/[[2]] [[3]]-Year Trend",
            "1 [[1]] = [[2]] [[3]]",
        ]
        translations = google_translate_many(texts + extra_texts, locale_code)
        changed_count = sum(
            1
            for source, target in translations.items()
            if source != target and source in texts
        )

        for node_type, ref, payload in nodes:
            if node_type == "text":
                source = " ".join(str(payload).split()).strip()
                if source in translations:
                    ref.replace_with(str(payload).replace(source, translations[source]))
            else:
                value = ref.get(payload)
                if value in translations:
                    ref[payload] = translations[value]

        html = str(soup)
        html = localize_json_ld(html, translations)
        html = html.replace(f'/static/js/utility-tools/math/currency-calculator/script-en.js"', f'/static/js/utility-tools/math/currency-calculator/script-{locale_code}.js"')
        html = html.replace(BRAND_TOKEN, "StarryRing")
        html = normalize_branding(html)
        page_path.write_text(html, encoding="utf-8")

        script_translations = {
            "Syncing exchange rate...": translations.get("Syncing exchange rate...", "Syncing exchange rate..."),
            "Failed to fetch exchange rate": translations.get("Failed to fetch exchange rate", "Failed to fetch exchange rate"),
            "Loading historical trend data...": translations.get("Loading historical trend data...", "Loading historical trend data..."),
            "Failed to load chart data": translations.get("Failed to load chart data", "Failed to load chart data"),
            "Swap source and target currencies": translations.get("Swap source and target currencies", "Swap source and target currencies"),
            "__TREND_TEMPLATE__": translations.get("[[1]]/[[2]] [[3]]-Year Trend", "[[1]]/[[2]] [[3]]-Year Trend")
            .replace("[[1]]", "{{from}}")
            .replace("[[2]]", "{{to}}")
            .replace("[[3]]", "{{years}}"),
            "__RATE_TEMPLATE__": translations.get("1 [[1]] = [[2]] [[3]]", "1 [[1]] = [[2]] [[3]]")
            .replace("[[1]]", "{{from}}")
            .replace("[[2]]", "{{rate}}")
            .replace("[[3]]", "{{to}}"),
        }
        write_runtime_script(locale_code, meta["locale"], script_translations)
        print(f"localized {locale_code}: translated {changed_count}/{len(set(texts))} strings", flush=True)


if __name__ == "__main__":
    main()
