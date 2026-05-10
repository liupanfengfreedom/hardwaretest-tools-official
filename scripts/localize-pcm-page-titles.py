from pathlib import Path


ROOT = Path(r"F:\WebTool\toolsite")


def patch(rel_path, replacements):
    path = ROOT / rel_path
    text = path.read_text(encoding="utf-8")
    original = text
    for src, dst in replacements:
        text = text.replace(src, dst)
    if text != original:
        path.write_text(text, encoding="utf-8")
        return True
    return False


image_converter = [
    ("<title>Image resize and convert tool - Privacy Image Studio | Free browser tool</title>", "<title>Image resize and convert tool - private browser studio | StarryRing</title>"),
    ('            "name": "Privacy Image Studio - Tool to resize and convert image",', '            "name": "Private browser image studio",'),
    ('                "caption": "Privacy Image Studio main screen"', '                "caption": "Private image studio main screen"'),
    ('                    "name": "What na Privacy Image Studio?",', '                    "name": "Wetin be dis private image studio?",'),
]


audio_converter = [
    ("<title>Audio converter for browser - free MP3/WAV/FLAC/AAC tool | WAVFORM</title>", "<title>Browser audio converter - free MP3/WAV/FLAC/AAC tool | StarryRing</title>"),
    ('            "name": "WAVFORM Audio converter",', '            "name": "Browser audio converter",'),
]


app_icon = [
    ("<title>App icon generator for browser | App Icon Studio | StarryRing</title>", "<title>Browser app icon generator | StarryRing</title>"),
    ('            "name": "App Icon Studio - Smart Icon Generator",', '            "name": "Browser app icon generator",'),
    ('                "caption": "App Icon Studio Interface"', '                "caption": "App icon generator screen"'),
]


currency = [
    ('<meta content="Global Exchange Rate Trend Analyzer Interface Screenshot" property="og:image:alt"/>', '<meta content="Currency trend analyzer screen shot" property="og:image:alt"/>'),
    ('            "name": "Global Exchange Rate Trend Analyzer",', '            "name": "Currency trend analyzer",'),
    ('                "caption": "Global Exchange Rate Trend Analyzer Interface"', '                "caption": "Currency trend analyzer screen"'),
    ('                    "name": "What na di Global Exchange Rate Trend Analyzer?",', '                    "name": "Wetin be dis currency trend analyzer?",'),
]


ping = [
    ('            "name": "Network Pulse - browser network diagnostics tool",', '            "name": "Browser network pulse checker",'),
    ('            "description": "Free browser network diagnostics: ICMP Ping via remote proxy and HTTPS GET directly from browser. Real‑time latency, packet loss, jitter with live charts and terminal log.",', '            "description": "Free browser network checker: ICMP ping through remote proxy and HTTPS GET direct from browser, with latency, packet loss and jitter tracking.",'),
]


changed = 0
changed += patch("pcm/utility-tools/design-media/image-converter/index.html", image_converter)
changed += patch("pcm/utility-tools/design-media/audio-converter/index.html", audio_converter)
changed += patch("pcm/utility-tools/design-media/app-icon-generator/index.html", app_icon)
changed += patch("pcm/utility-tools/math/currency-calculator/index.html", currency)
changed += patch("pcm/utility-tools/netdev/ping/index.html", ping)

print(f"updated {changed} files")
