import json
import re
import sys
import time
from pathlib import Path
from urllib.error import URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

ROOT = Path(r"F:\WebTool\toolsite")
TARGET_DIR = ROOT / "static" / "js" / "toolbox" / "keyboard"
LOCALES = ["es", "fr", "ar", "bn", "pt", "ru", "ur", "id", "de", "mr", "te", "tr", "ta", "pcm"]
CACHE_PATH = ROOT / "scripts" / ".keyboard-runtime-cache.json"

MANUAL_PHRASES = [
    "💡 Tip: Rapidly press the same key to test key intervals. Intervals <80ms are marked in red.",
    "Left Shift",
    "Right Shift",
    "Left Ctrl",
    "Right Ctrl",
    "Left Alt",
    "Right Alt",
    "Caps Lock",
    "Esc",
    "Page Up",
    "Page Down",
    "Num Lock",
    "Scroll Lock",
    "Print Screen",
    "Menu",
    "<i class=\"fas fa-scroll\"></i> Auto Scroll On",
    "<i class=\"fas fa-scroll\"></i> Auto Scroll Off",
    "Severe Double-Tap",
    "Moderate Double-Tap",
    "Minor Double-Tap",
    "Weak Anti-Ghosting",
    "Excellent NKRO Performance",
    "Key Sticking",
    "Test data, diagnosis results, and logs have been reset",
    "Log cleared",
    "<i class=\"fas fa-eye\"></i> Show Log",
    "<i class=\"fas fa-eye-slash\"></i> Hide Log",
    "Auto scroll enabled",
    "Auto scroll disabled",
    "Starting key interval test: Rapidly press the same key (e.g., W key or Spacebar)",
    "🔍 Step 1: Single Key Function Test",
    "Please test the following key groups sequentially to check for non-responsive keys:<br>1. WASD directional keys<br>2. Number keys 1-5<br>3. Arrow keys ↑↓←→<br>4. Spacebar and Enter keys",
    "Check if each key turns white when pressed",
    "⏱️ Step 2: Key Interval Detection",
    "Rapidly press the same key 10 times (recommend testing W key and Spacebar), observe log output",
    "Observe key intervals. Normal should be >80ms. Intervals <80ms are marked red",
    "🎮 Step 3: NKRO Anti-Ghosting Test",
    "Press your entire hand on the middle keyboard area, pressing as many keys as possible simultaneously",
    "Observe 'Current Concurrency' value. Normal keyboards should have ≥6, gaming keyboards can reach 10+",
    "⚡ Step 4: Response Delay Test",
    "Press different keys at moderate speed, observe response time",
    "Interval times should be stable between 50-200ms without large fluctuations",
    "🔄 Step 5: Key Conflict Detection",
    "Press simultaneously: W+A+Shift+Space<br>Then: Ctrl+Shift+Alt",
    "All keys should highlight simultaneously, none should fail",
    "💡 Tip: Normal human operation intervals are typically >100ms, gamers may reach 80-120ms.",
    "💡 Tip: Frequent <50ms intervals may indicate keyboard double-tap faults.",
    "💡 Tip: Try pressing multiple keys simultaneously to test anti-ghosting capability.",
    "💡 Tip: Test all keys sequentially, especially frequently used keys like WASD and Spacebar.",
    "💡 Tip: Observe if down/up counts match. Mismatch may indicate key sticking.",
    "Severe double-tap fault, immediate repair needed",
    "Moderate double-tap fault, address soon",
    "Minor double-tap, monitor closely",
    "<div class=\"log-entry\"><span class=\"timestamp\">⏱️</span> Log cleared</div>",
    "<div class=\"log-entry\"><span class=\"timestamp\">⏱️</span> Test reset</div>",
    "🔄 Counters reset, test again",
    "✅ Ready (chatter detection per key, hold ignored)",
]

SKIP_SUBSTRINGS = [
    "querySelector",
    "getElementById",
    "data-code",
    "position:",
    "rgba(",
    ".toast-message",
    ".key",
    ".diagnosis-",
    ".report-",
    "toast-",
    "key-stat-",
    "cssText",
    "style.",
    "window.print()",
    "saveReportAsImage()",
    "slideOut 0.3s ease",
    "progress-fill",
    "progress-text",
    "status-badge",
    "log-entry log-",
    "interval-value ",
    "fas fa-",
    "far fa-",
    "width: ",
    "px;",
]

SAFE_MARKERS = [" ", "<br>", "&lt;", "💡", "🔍", "⏱️", "🎮", "⚡", "🔄", "✅", "⏱️</span>"]

DIRECT_SEGMENTS = [
    "Auto Scroll On",
    "Auto Scroll Off",
    "Severe Double-Tap",
    "Severe Double-Taps",
    "Weak Anti-Ghosting",
    "Starting key interval test: Rapidly press the same key (e.g., W key or Spacebar)",
    "Starting key interval test - Please rapidly press the same key repeatedly",
]

PCM_MAP = {
    "💡 Tip: Rapidly press the same key to test key intervals. Intervals <80ms are marked in red.": "💡 Tip: Press the same key fast-fast to test key interval. Interval wey pass below 80ms go show red.",
    "Left Shift": "Left Shift",
    "Right Shift": "Right Shift",
    "Left Ctrl": "Left Ctrl",
    "Right Ctrl": "Right Ctrl",
    "Left Alt": "Left Alt",
    "Right Alt": "Right Alt",
    "Caps Lock": "Caps Lock",
    "Esc": "Esc",
    "Page Up": "Page Up",
    "Page Down": "Page Down",
    "Num Lock": "Num Lock",
    "Scroll Lock": "Scroll Lock",
    "Print Screen": "Print Screen",
    "Menu": "Menu",
    "<i class=\"fas fa-scroll\"></i> Auto Scroll On": "<i class=\"fas fa-scroll\"></i> Auto scroll on",
    "<i class=\"fas fa-scroll\"></i> Auto Scroll Off": "<i class=\"fas fa-scroll\"></i> Auto scroll off",
    "Severe Double-Tap": "Serious double-tap",
    "Moderate Double-Tap": "Middle double-tap",
    "Minor Double-Tap": "Small double-tap",
    "Weak Anti-Ghosting": "Weak anti-ghosting",
    "Excellent NKRO Performance": "Excellent NKRO performance",
    "Key Sticking": "Key dey stick",
    "Test data, diagnosis results, and logs have been reset": "Test data, diagnosis result, and logs don reset finish",
    "Log cleared": "Log don clear",
    "<i class=\"fas fa-eye\"></i> Show Log": "<i class=\"fas fa-eye\"></i> Show log",
    "<i class=\"fas fa-eye-slash\"></i> Hide Log": "<i class=\"fas fa-eye-slash\"></i> Hide log",
    "Auto scroll enabled": "Auto scroll don turn on",
    "Auto scroll disabled": "Auto scroll don turn off",
    "Starting key interval test: Rapidly press the same key (e.g., W key or Spacebar)": "Key interval test dey start: press the same key fast-fast, like W key or Spacebar.",
    "🔍 Step 1: Single Key Function Test": "🔍 Step 1: Single key function test",
    "Please test the following key groups sequentially to check for non-responsive keys:<br>1. WASD directional keys<br>2. Number keys 1-5<br>3. Arrow keys ↑↓←→<br>4. Spacebar and Enter keys": "Abeg test these key groups one by one make you check whether any key no respond:<br>1. WASD direction keys<br>2. Number keys 1-5<br>3. Arrow keys ↑↓←→<br>4. Spacebar and Enter keys",
    "Check if each key turns white when pressed": "Check whether each key turn white when you press am",
    "⏱️ Step 2: Key Interval Detection": "⏱️ Step 2: Key interval detection",
    "Rapidly press the same key 10 times (recommend testing W key and Spacebar), observe log output": "Press the same key 10 times fast-fast, wey recommend W key and Spacebar, then watch the log output.",
    "Observe key intervals. Normal should be >80ms. Intervals <80ms are marked red": "Check key interval. Normal one suppose pass 80ms. Interval below 80ms go show red.",
    "🎮 Step 3: NKRO Anti-Ghosting Test": "🎮 Step 3: NKRO anti-ghosting test",
    "Press your entire hand on the middle keyboard area, pressing as many keys as possible simultaneously": "Press your full hand for the middle keyboard area make you press plenty keys together.",
    "Observe 'Current Concurrency' value. Normal keyboards should have ≥6, gaming keyboards can reach 10+": "Check the 'Current Concurrency' value. Normal keyboard suppose get 6 or pass, gaming keyboard fit reach 10+.",
    "⚡ Step 4: Response Delay Test": "⚡ Step 4: Response delay test",
    "Press different keys at moderate speed, observe response time": "Press different keys for normal speed and watch the response time.",
    "Interval times should be stable between 50-200ms without large fluctuations": "Interval time suppose steady between 50-200ms without big jump.",
    "🔄 Step 5: Key Conflict Detection": "🔄 Step 5: Key conflict detection",
    "Press simultaneously: W+A+Shift+Space<br>Then: Ctrl+Shift+Alt": "Press together: W+A+Shift+Space<br>Then: Ctrl+Shift+Alt",
    "All keys should highlight simultaneously, none should fail": "All keys suppose highlight together, none suppose fail.",
    "💡 Tip: Normal human operation intervals are typically >100ms, gamers may reach 80-120ms.": "💡 Tip: Normal human key interval usually pass 100ms, gamers fit reach 80-120ms.",
    "💡 Tip: Frequent <50ms intervals may indicate keyboard double-tap faults.": "💡 Tip: If interval below 50ms dey happen often, e fit mean keyboard get double-tap fault.",
    "💡 Tip: Try pressing multiple keys simultaneously to test anti-ghosting capability.": "💡 Tip: Try press many keys together make you test anti-ghosting power.",
    "💡 Tip: Test all keys sequentially, especially frequently used keys like WASD and Spacebar.": "💡 Tip: Test all keys one by one, especially keys wey people use pass like WASD and Spacebar.",
    "💡 Tip: Observe if down/up counts match. Mismatch may indicate key sticking.": "💡 Tip: Check whether down/up count match. If dem no match, key fit dey stick.",
    "Severe double-tap fault, immediate repair needed": "Serious double-tap fault, e need repair sharp-sharp",
    "Moderate double-tap fault, address soon": "Middle double-tap fault, solve am soon",
    "Minor double-tap, monitor closely": "Small double-tap, watch am closely",
    "<div class=\"log-entry\"><span class=\"timestamp\">⏱️</span> Log cleared</div>": "<div class=\"log-entry\"><span class=\"timestamp\">⏱️</span> Log don clear</div>",
    "<div class=\"log-entry\"><span class=\"timestamp\">⏱️</span> Test reset</div>": "<div class=\"log-entry\"><span class=\"timestamp\">⏱️</span> Test don reset</div>",
    "🔄 Counters reset, test again": "🔄 Counter don reset, test again",
    "✅ Ready (chatter detection per key, hold ignored)": "✅ Ready (chatter detection per key, hold ignored)",
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


def extract_translatable_literals(source_path: Path):
    text = source_path.read_text(encoding="utf-8", errors="ignore")
    pattern = re.compile(r"""(['"])(.*?)(?<!\\)\1""", re.S)
    phrases = set(MANUAL_PHRASES)
    for match in pattern.finditer(text):
        value = match.group(2)
        if len(value) < 4:
            continue
        if "\n" in value:
            continue
        if "${" in value:
            continue
        if value.startswith((".", "#", "@")):
            continue
        if "[" in value or "]" in value:
            continue
        if not re.search(r"[A-Za-z]", value):
            continue
        if re.fullmatch(r"[A-Za-z0-9_-]+", value):
            continue
        if value not in MANUAL_PHRASES and not any(marker in value for marker in SAFE_MARKERS):
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
    protected = text.replace("<", "__LT__").replace(">", "__GT__")
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
            translated = "".join(part[0] for part in data[0] if part and part[0]).replace("__LT__", "<").replace("__GT__", ">")
            locale_cache[text] = translated
            return translated
        except (URLError, TimeoutError, json.JSONDecodeError) as exc:
            last_error = exc
            time.sleep(1.0 * (attempt + 1))
    raise RuntimeError(f"keyboard phrase translate failed for {locale}: {last_error}")


def quoted_variants(phrase: str, translated: str):
    variants = [
        (f"'{phrase}'", f"'{translated}'"),
        (f'"{phrase}"', f'"{translated}"'),
    ]
    return variants


def localize_file(path: Path, locale: str):
    text = path.read_text(encoding="utf-8", errors="ignore")
    original = text
    english_source = path.with_name(path.name.replace(f"-{locale}.js", "-en.js"))
    phrases = extract_translatable_literals(english_source if english_source.exists() else path)
    for phrase in phrases:
        translated = translate(locale, phrase)
        for old, new in quoted_variants(phrase, translated):
            text = text.replace(old, new)
    for segment in DIRECT_SEGMENTS:
        text = text.replace(segment, translate(locale, segment))
    if text != original:
        path.write_text(text, encoding="utf-8")
        return 1
    return 0


def main():
    locales = sys.argv[1:] or LOCALES
    changed = 0
    for locale in locales:
        changed += localize_file(TARGET_DIR / f"script-{locale}.js", locale)
        changed += localize_file(TARGET_DIR / "apple-keyboard" / f"script-{locale}.js", locale)
        print(locale, "done", flush=True)
    save_cache(CACHE)
    print("changed-files", changed)


if __name__ == "__main__":
    main()
