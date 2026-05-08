import json
import time
from pathlib import Path
from urllib.error import URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

ROOT = Path(r"F:\WebTool\toolsite")
TARGET_FILE = ROOT / "static" / "js" / "toolbox" / "camera"
LOCALES = ["es", "fr", "ar", "bn", "pt", "ru", "ur", "id", "de", "mr", "te", "tr", "ta", "pcm"]
CACHE_PATH = ROOT / "scripts" / ".camera-runtime-cache.json"

PHRASES = [
    "Camera Permission Request",
    "Webcam Test Tool needs access to your camera device to detect performance parameters. Please confirm if you allow access?",
    "We guarantee: All data is processed locally only, not uploaded to any servers.",
    "Allow Access",
    "Deny Access",
    "Waiting for user confirmation...",
    "User denied access permission",
    "Requesting permission...",
    "Camera tool initialization failed:",
    "No camera detected",
    "Error enumerating devices:",
    "Device enumeration failed",
    "Camera video stream",
    "Running normally",
    "Error starting specific stream:",
    "Start failed:",
    "Unknown",
    "Unknown device",
    "Camera error:",
    "Unknown error",
    "User denied camera permission",
    "No camera device found",
    "Camera is being used by another application",
    "Cannot meet camera parameter requirements",
    "Requires HTTPS or localhost environment",
    "Error:",
    "Camera access failed:",
    "View help documentation?",
    "Stopped",
    "Switching...",
    "Mirror Flip",
    "Cancel Mirror",
    "Your browser does not support camera access. Please use modern browsers like Chrome, Firefox, Edge, or Safari.",
    "Camera functionality may be limited in non-HTTPS environment",
    "Camera tool global error:",
    "Unhandled Promise rejection:",
]

PCM_MAP = {
    "Camera Permission Request": "Camera permission request",
    "Webcam Test Tool needs access to your camera device to detect performance parameters. Please confirm if you allow access?": "Webcam test tool need permission to use your camera so e fit check performance details. You gree make e use am?",
    "We guarantee: All data is processed locally only, not uploaded to any servers.": "We promise say all data stay for your device only, e no go upload go any server.",
    "Allow Access": "Allow access",
    "Deny Access": "No gree access",
    "Waiting for user confirmation...": "Dey wait for your confirmation...",
    "User denied access permission": "User no gree give access permission",
    "Requesting permission...": "Dey ask for permission...",
    "Camera tool initialization failed:": "Camera tool no fit start well:",
    "No camera detected": "No camera show",
    "Error enumerating devices:": "Error as e dey list devices:",
    "Device enumeration failed": "Device listing fail",
    "Camera video stream": "Camera video stream",
    "Running normally": "Dey run normal",
    "Error starting specific stream:": "Error as e dey start dis specific stream:",
    "Start failed:": "Start fail:",
    "Unknown": "Unknown",
    "Unknown device": "Unknown device",
    "Camera error:": "Camera error:",
    "Unknown error": "Unknown error",
    "User denied camera permission": "User deny camera permission",
    "No camera device found": "No camera device show",
    "Camera is being used by another application": "Another app dey use di camera now now",
    "Cannot meet camera parameter requirements": "No fit meet di camera parameter requirement",
    "Requires HTTPS or localhost environment": "E need HTTPS or localhost environment",
    "Error:": "Error:",
    "Camera access failed:": "Camera access fail:",
    "View help documentation?": "Open help documentation?",
    "Stopped": "Stop",
    "Switching...": "Dey switch...",
    "Mirror Flip": "Mirror flip",
    "Cancel Mirror": "Cancel mirror",
    "Your browser does not support camera access. Please use modern browsers like Chrome, Firefox, Edge, or Safari.": "Your browser no support camera access. Abeg use modern browser like Chrome, Firefox, Edge, or Safari.",
    "Camera functionality may be limited in non-HTTPS environment": "Camera fit get limit for non-HTTPS environment",
    "Camera tool global error:": "Global camera tool error:",
    "Unhandled Promise rejection:": "Unhandled promise rejection:",
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
        except (URLError, TimeoutError, json.JSONDecodeError) as exc:
            last_error = exc
            time.sleep(1.0 * (attempt + 1))
    raise RuntimeError(f"camera phrase translate failed for {locale}: {last_error}")


def localize_file(locale: str):
    path = TARGET_FILE / f"script-{locale}.js"
    text = path.read_text(encoding="utf-8", errors="ignore")
    original = text
    for phrase in PHRASES:
        translated = translate(locale, phrase)
        text = text.replace(phrase, translated)
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
