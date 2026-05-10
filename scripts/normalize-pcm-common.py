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
