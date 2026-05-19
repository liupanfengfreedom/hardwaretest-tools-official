from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PCM_ROOT = ROOT / "pcm"
STATIC_JS_ROOT = ROOT / "static" / "js"


HTML_REPLACEMENTS = [
    ("About us", "Who we be"),
    ("Contact us", "Reach us"),
    ("Privacy policy", "Privacy rule"),
    ("privacy policy", "privacy rule"),
    ("Terms of service", "Terms wey guide use"),
    ("terms of service", "terms wey guide use"),
    ("Disclaimer", "Notice"),
    ("House", "Home"),
    ("Utility tools", "Useful tools"),
    ("Enter Utility tools", "Enter useful tools"),
    ("Copied to clipboard!", "Don copy am!"),
    ("Copied to clipboard", "Don copy am"),
    ("Password copied to clipboard!", "Password don copy"),
    ("A collection of various utility tools to boost your productivity. One‑click access.",
     "Collection of useful tools wey fit help your work move faster. One-click access."),
    ("Your For internet Tool corner", "Your browser tool corner"),
    ("Search tool name or function...", "Search tool name or wetin e dey do..."),
    ("Type a keyword to quickly find di tool you need", "Type keyword make you find the tool wey you need quick"),
    ("Response data fit be copied to clipboard for further analysis",
     "Response data fit copy go clipboard for more checking"),
    ("extra software", "extra app"),
    ("Extra software", "Extra app"),
    ("official driver app", "official control app"),
    ("Official driver app", "Official control app"),
    ("mouse buttons", "mouse sides"),
    ("Mouse buttons", "Mouse sides"),
    ("side buttons", "side sides"),
    ("Side buttons", "Side sides"),
    ("button response", "side response"),
    ("Button response", "Side response"),
    ("button condition", "side condition"),
    ("Button condition", "Side condition"),
    ("button press", "side press"),
    ("button presses", "side presses"),
    ("Button press", "Side press"),
    ("Button presses", "Side presses"),
    ("button-press", "side-press"),
    ("Button-press", "Side-press"),
    ("button area", "side area"),
    ("Button area", "Side area"),
    ("left button", "left side"),
    ("right button", "right side"),
    ("middle button", "middle side"),
    ("Left button", "Left side"),
    ("Right button", "Right side"),
    ("Middle button", "Middle side"),
    ("Buttons no dey answer", "Sides no dey answer"),
    ("buttons no dey answer", "sides no dey answer"),
    ("hardware fault", "hardware wahala"),
    ("Hardware fault", "Hardware wahala"),
    ("Fault Detection", "Wahala spotting"),
    ("Fault guide", "Wahala guide"),
    ("Normal status", "Normal look"),
    ("Abnormal status", "Abnormal look"),
    ("double-click speed", "double-tap speed"),
    ("Double-click speed", "Double-tap speed"),
    ("extra clicks", "extra taps"),
    ("Extra clicks", "Extra taps"),
    ("click mark", "tap mark"),
    ("click marks", "tap marks"),
    ("Click mark", "Tap mark"),
    ("Click marks", "Tap marks"),
    ("Detailed event log", "Full event log"),
    ("Real-time", "Live"),
    ("real-time", "live"),
    ("Average Interval", "Average gap"),
    ("Reset All Data button", "Reset All Data side"),
    ("double-tap fault detection", "double-tap wahala spotting"),
    ("Double-tap fault detection", "Double-tap wahala spotting"),
    ("for internet", "page-side"),
    ("For internet", "Page-side"),
    ("Browser Apple Magic Keyboard checker", "Page-side Apple Magic Keyboard check page"),
    ("Browser WebSocket test tool", "Page-side WebSocket test tool"),
    ("real-time strength analysis", "live strength analysis"),
    ("real-time conversion", "live conversion"),
    ("real-time preview", "live preview"),
    ("real-time stats", "live stats"),
    ("real-time waveform", "live waveform"),
    ("real-time communication", "live communication"),
    ("real-time rate", "live rate"),
    ("real-time fluctuations", "live rate movement"),
]


JS_REPLACEMENTS = [
    ("Copied to clipboard!", "Don copy am!"),
    ("Copied to clipboard", "Don copy am"),
    ("Copied:", "Don copy:"),
    ("Copy failed. Please select and copy manually.", "Copy no work. Abeg select am and copy by hand."),
    ("Copy failed, please copy manually", "Copy no work, abeg copy am by hand"),
    ("Copy failed", "Copy no work"),
    ("Generating...", "Dey generate..."),
    ("Generating, please wait...", "Dey generate, abeg wait..."),
    ("Password copied to clipboard!", "Password don copy"),
    ("Real-time", "Live"),
    ("real-time", "live"),
    ("Average Interval", "Average gap"),
    ("Detailed event log", "Full event log"),
]


def replace_text(path: Path, replacements):
    text = path.read_text(encoding="utf-8")
    original = text
    for old, new in replacements:
        text = text.replace(old, new)
    if text != original:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def iter_files(root: Path, suffix: str):
    try:
        for path in root.rglob(f"*{suffix}"):
            yield path
    except PermissionError:
        return


def main():
    changed = []
    for path in iter_files(PCM_ROOT, ".html"):
        if replace_text(path, HTML_REPLACEMENTS):
            changed.append(path.relative_to(ROOT).as_posix())
    for path in iter_files(STATIC_JS_ROOT, "script-pcm.js"):
        if replace_text(path, JS_REPLACEMENTS):
            changed.append(path.relative_to(ROOT).as_posix())
    for item in changed:
        print(item)


if __name__ == "__main__":
    main()
