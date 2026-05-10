from pathlib import Path


ROOT = Path(r"F:\WebTool\toolsite")


COMMON = [
    ("Mouse check Tool", "Mouse check tool"),
    ("Mouse check Tools", "Mouse check tools"),
    ("Mouse check toolbox", "Mouse check tool area"),
    ("No-pay tool wey you fit use for internet", "Free browser"),
    ("tool wey you fit use for internet", "browser"),
    ("for internet", "for browser"),
    ("Test instantly.", "Use am straight away."),
    ("No download required", "No need to download anything"),
    ("Pro detection", "Sharp detection"),
    ("Real-time", "Live"),
    ("Visual feedback", "Visual feedback"),
    ("Double-click test", "Double-click check"),
    ("Click Speed Test", "Click speed check"),
    ("Mouse Polling Rate Test", "Mouse polling-rate check"),
    ("Mouse Event Frequency Tester", "Mouse event frequency checker"),
    ("Mouse Double-click test Tool", "Mouse double-click check tool"),
    ("Mouse CPS Tester Pro", "Mouse CPS checker"),
    ("CPS Tester", "CPS checker"),
    ("Tool interface", "Tool preview"),
    ("StarryRing Tool interface", "StarryRing tool preview"),
    ("Question people dey ask well well (FAQ)", "Question people dey ask well well (FAQ)"),
]


FILE_SPECIFIC = {
    "pcm/toolbox/mouse/index.html": [
        ("<title>Mouse Click/Double-Click/Scroll Wheel Test - No-pay tool wey you fit use for internet mouse checker | StarryRing</title>",
         "<title>Mouse click, double-click, and scroll-wheel checker | StarryRing</title>"),
        ('"name": "Browser mouse check tool",', '"name": "Browser mouse checker",'),
        ('"description": "No-pay tool wey you fit use for internet mouse checking tool. Test button functions, side buttons, detect mouse faults.",',
         '"description": "Free browser mouse checker for button response, side-button work, click faults, and scroll-wheel behaviour.",'),
        ('"caption": "Mouse Side Button Test Interface",', '"caption": "Mouse side-button check preview",'),
        ('"description": "Mouse side button (Forward/Back) function test"', '"description": "Check whether mouse side button for forward and back dey work well"'),
        ('"caption": "Mouse Click Test Interface",', '"caption": "Mouse click check preview",'),
        ('"description": "Mouse click function test"', '"description": "Check whether mouse click action dey respond well"'),
        ('"featureList": [\n                "Click & Single-Click Test",\n                "Double-Click & Multi-Click Detection",\n                "Scroll Wheel Performance Test (Up/Down)",\n                "Side Button (Forward/Back) Function Test",\n                "Middle Button (Press/Scroll) Test",\n                "Real-time Visual Feedback & Event Log",\n                "Comprehensive Fault Diagnosis Report"\n            ]',
         '"featureList": [\n                "Single-click response check",\n                "Double-click and multi-click detection",\n                "Scroll-wheel up and down check",\n                "Side-button function check",\n                "Middle-button press and scroll check",\n                "Live visual feedback and event log",\n                "Full mouse fault report"\n            ]'),
        ('<meta content="Mouse click test, mouse checking tool, mouse button tester" name="description"/>',
         '<meta content="Free browser mouse checker for click response, double-click issue, side buttons, and scroll wheel." name="description"/>'),
        ('<meta content="Browser mouse check tool" property="og:title"/>', '<meta content="Browser mouse checker" property="og:title"/>'),
        ('<meta content="No-pay tool wey you fit use for internet mouse checking tool. Proly detects mouse button functions, side button tests. No download required. Test instantly." property="og:description"/>',
         '<meta content="Free browser mouse checker for button response, side buttons, and scroll-wheel issues. No need to download anything." property="og:description"/>'),
        ('<meta content="Browser mouse check tool" name="twitter:title"/>', '<meta content="Browser mouse checker" name="twitter:title"/>'),
        ('<meta content="No-pay tool wey you fit use for internet mouse checking tool. Proly detects mouse button functions, side button tests. No download required. Test instantly." name="twitter:description"/>',
         '<meta content="Check mouse click, side buttons, and scroll wheel directly for browser. No need to download anything." name="twitter:description"/>'),
        ('<span class="breadcrumb-active">Mouse check tool</span>', '<span class="breadcrumb-active">Mouse check tool</span>'),
        ('<i class="fas fa-tools"></i>Mouse check tool area</h2>', '<i class="fas fa-tools"></i>Mouse check tool area</h2>'),
        ('<p class="tools-navigation-subtitle">Choose di test tool wey you need for better mouse performance check.</p>',
         '<p class="tools-navigation-subtitle">Choose di mouse check wey you need make you fit know whether your mouse still dey perform well.</p>'),
        ('<h3>CPS Test</h3>', '<h3>CPS check</h3>'),
        ('<p>Clicks Per Second test to evaluate clicking speed and hand agility.</p>',
         '<p>Measure how many clicks you fit do each second and how steady your hand dey.</p>'),
        ('<h3>Double-click check</h3>', '<h3>Double-click check</h3>'),
        ('<p>Special test for double-click speed and micro-switch condition.</p>',
         '<p>Use dis one check unwanted double-click issue and switch condition.</p>'),
    ],
    "pcm/toolbox/mouse/cps/index.html": [
        ("<title>CPS checker - Free browser Mouse Click Speed Test | Measure Clicks Per Second</title>",
         "<title>CPS checker | Mouse click speed check</title>"),
        ('"name": "Mouse CPS checker",', '"name": "Mouse CPS checker",'),
        ('<meta content="Free browser CPS test tool to measure your mouse click speed. Multiple test modes: 10s, 5s, 1s, 60s with live CPS data, click stability score, and history tracking. Perfect for gamers and productivity testing." name="description"/>',
         '<meta content="Free browser CPS checker to measure mouse click speed with 1s, 5s, 10s, and 60s modes, live data, and result history." name="description"/>'),
        ('<meta content="CPS checker - Free browser Mouse Click Speed Test" property="og:title"/>', '<meta content="CPS checker | Mouse click speed check" property="og:title"/>'),
        ('<meta content="Free browser mouse click speed test with multiple modes, live statistics, and history tracking" property="og:description"/>',
         '<meta content="Measure click speed, watch live data, and compare result history directly for browser." property="og:description"/>'),
        ('<meta content="CPS checker - Free browser Mouse Click Speed Test | Measure Clicks Per Second" name="twitter:title"/>', '<meta content="CPS checker | Mouse click speed check" name="twitter:title"/>'),
        ('<meta content="Free browser CPS test tool to measure your mouse click speed. Multiple test modes: 10s, 5s, 1s, 60s with live CPS data, click stability score, and history tracking. Perfect for gamers and productivity testing." name="twitter:description"/>',
         '<meta content="Measure mouse click speed with several timer modes, live CPS data, and stored results." name="twitter:description"/>'),
        ('<span class="breadcrumb-active" itemprop="name">Click speed check</span>', '<span class="breadcrumb-active" itemprop="name">Click speed check</span>'),
        ('<h1 style="color: var(--primary-color); margin-bottom: 0.5rem;">Mouse CPS Tester - Free browser Click Speed Test</h1>',
         '<h1 style="color: var(--primary-color); margin-bottom: 0.5rem;">Mouse CPS checker for browser</h1>'),
        ('<p style="color: var(--text-secondary); line-height: 1.6; margin-bottom: 1rem;">Use di professional CPS tester to measure your mouse click speed. CPS (Clicks Per Second) na an important metric for measuring reaction speed and clicking ability. Dis tool offers multiple test modes suitable for gamers, office workers, and users looking to improve hand coordination.</p>',
         '<p style="color: var(--text-secondary); line-height: 1.6; margin-bottom: 1rem;">Use dis CPS checker to measure how fast you fit click your mouse. E get different timer modes, live stats, and result history for gaming, work, or simple hand-speed practice.</p>'),
        ('<h2>Mouse CPS Tester<span class="version-badge">Pro Version</span></h2>', '<h2>Mouse CPS checker<span class="version-badge">Pro Version</span></h2>'),
        ('<h2><i class="fas fa-sliders-h"></i>Test Mode</h2>', '<h2><i class="fas fa-sliders-h"></i>Check mode</h2>'),
    ],
    "pcm/toolbox/mouse/double-click/index.html": [
        ("<title>Free Double-Click Tester Browser - Diagnose Mouse Chattering &amp; Faulty Clicks | StarryRing</title>",
         "<title>Double-click checker | Diagnose mouse faulty clicks</title>"),
        ('<meta content="Free browser mouse double-click testing tool. Sharp detection of faulty clicks, button bounce, switch degradation. Test all buttons including side buttons. No need to download anything for Windows, macOS, Linux." name="description"/>',
         '<meta content="Free browser double-click checker to catch faulty clicks, button bounce, and switch wear on left, right, middle, and side buttons." name="description"/>'),
        ('<meta content="Mouse double click test tool interface preview" property="og:image:alt"/>', '<meta content="Mouse double-click checker preview" property="og:image:alt"/>'),
        ('<meta content="Mouse Double-click test" name="apple-mobile-web-app-title"/>', '<meta content="Mouse double-click check" name="apple-mobile-web-app-title"/>'),
        ('"name": "Mouse double-click check tool",', '"name": "Mouse double-click checker",'),
        ('"description": "Free browser mouse double-click testing tool, detect faulty clicks, button bounce, switch degradation, test all buttons including side buttons",',
         '"description": "Free browser double-click checker to catch faulty clicks, bounce problem, switch wear, and side-button issues.",'),
        ('"featureList": [\n                "Double-click fault detection",\n                "Adjustable sensitivity threshold",\n                "Live event logging",\n                "Visual feedback system"\n            ]',
         '"featureList": [\n                "Double-click fault detection",\n                "Adjustable sensitivity threshold",\n                "Live event log",\n                "Visual feedback system"\n            ]'),
        ('"name": "How to detect mouse double-click fault?"', '"name": "How you fit catch mouse double-click fault?"'),
        ('"name": "What does click counting mean?"', '"name": "Wetin click counting mean?"'),
        ('"name": "What na Mouse Double Click Issue?"', '"name": "Wetin be mouse double-click issue?"'),
        ('"name": "Which mouse brands na prone to double click?"', '"name": "Which mouse brands fit show double-click issue?"'),
        ('"name": "How to Use di Mouse Double-click check Tool"', '"name": "How to use di mouse double-click checker"'),
        ('"name": "Enter test area"', '"name": "Enter di test area"'),
        ('"name": "Test each button"', '"name": "Check each button"'),
        ('"name": "Monitor faulty double-clicks"', '"name": "Watch faulty double-click count"'),
        ('"name": "Adjust sensitivity threshold"', '"name": "Adjust sensitivity threshold"'),
        ('"name": "Review event log"', '"name": "Check event log"'),
    ],
    "pcm/toolbox/mouse/polling-rate/index.html": [
        ("<title>Mouse polling-rate check Browser - Event Frequency &amp; Jitter Analysis</title>",
         "<title>Mouse polling-rate checker | Event frequency and jitter</title>"),
        ('<meta content="Mouse polling rate test tool interface preview" property="og:image:alt"/>', '<meta content="Mouse polling-rate checker preview" property="og:image:alt"/>'),
        ('<meta content="Mouse Polling Rate Test" name="apple-mobile-web-app-title"/>', '<meta content="Mouse polling-rate check" name="apple-mobile-web-app-title"/>'),
        ('"name": "Mouse event frequency checker",', '"name": "Mouse event frequency checker",'),
        ('"description": "Free browser mouse event frequency testing tool, live detection of mouse movement sampling rate, jitter analysis, performance monitoring in browsers",',
         '"description": "Free browser polling-rate checker for mouse movement sampling, jitter level, and event performance.",'),
        ('"name": "How to Use di Mouse Polling Rate check Tool"', '"name": "How to use di mouse polling-rate checker"'),
        ('"name": "Enter test area"', '"name": "Enter di test area"'),
        ('"name": "Perform rapid movements"', '"name": "Move mouse fast"'),
        ('"name": "Monitor live frequency"', '"name": "Watch live frequency"'),
    ],
}


def replace_in_file(path_str, replacements):
    path = ROOT / path_str
    text = path.read_text(encoding="utf-8")
    original = text
    for old, new in COMMON:
        text = text.replace(old, new)
    for old, new in replacements:
        text = text.replace(old, new)
    if text != original:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def main():
    updated = 0
    for path_str, replacements in FILE_SPECIFIC.items():
        if replace_in_file(path_str, replacements):
            updated += 1
    print(f"updated {updated} files")


if __name__ == "__main__":
    main()
