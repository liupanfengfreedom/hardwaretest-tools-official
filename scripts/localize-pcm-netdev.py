from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def replace_many(path: Path, replacements: list[tuple[str, str]]) -> bool:
    text = path.read_text(encoding="utf-8")
    original = text
    for old, new in replacements:
        text = text.replace(old, new)
    if text != original:
        path.write_text(text, encoding="utf-8")
        return True
    return False


REPLACEMENTS = [
    ("For internet JSON parser, Formatter &amp; Tree Viewer | StarryRing",
     "Browser JSON parser, formatter and tree viewer | StarryRing"),
    ("JSON parser", "JSON parser"),
    ("JSON<span>Parser</span>", "JSON<span>Parser</span>"),
    ("For internet POST Tool / API Tester - Pure Frontend HTTP Request Debugging Tool | StarryRing Tool corner",
     "Browser POST tool and API tester | StarryRing"),
    ("For internet POST Tool / API Tester", "Browser POST tool and API tester"),
    ("Network Pulse - For internet Network Diagnostics Tool",
     "Network Pulse - browser network diagnostics tool"),
    ("QR Magic - No-pay tool wey you fit use for internet QR code generator | Custom Logo, Colors, Sizes | Advanced QR Tool",
     "QR Magic - browser QR code generator with logo, color, and size control"),
    ("QR Magic - Advanced QR code generator", "QR Magic - advanced QR code generator"),
    ("WebSocket For internet Test Tool - No-pay WS/WSS Client | StarryRing",
     "Browser WebSocket test tool - free WS/WSS client | StarryRing"),
    ("For internet WebSocket test Tool", "Browser WebSocket test tool"),
    ("No-pay tool wey you fit use for internet", "Free browser"),
    ("No-pay Advanced QR code generator", "Advanced browser QR code generator"),
    ("No-pay WS/WSS Client", "Free WS/WSS client"),
    ("Network Testing Tools", "Network tools"),
    ("Utilities", "Useful tools"),
    ("Response Result", "Response result"),
    ("Request Configuration", "Request setup"),
    ("Tool Wetin e fit do", "Wetin dis tool fit do"),
    ("Pro Network Diagnostics Wetin e fit do", "Wetin network diagnostics fit do"),
    ("NetworkPulse- Diagnostics Tool", "NetworkPulse - diagnostics tool"),
]


FILES = [
    ROOT / "pcm" / "utility-tools" / "netdev" / "json-parser" / "index.html",
    ROOT / "pcm" / "utility-tools" / "netdev" / "post-tool" / "index.html",
    ROOT / "pcm" / "utility-tools" / "netdev" / "ping" / "index.html",
    ROOT / "pcm" / "utility-tools" / "netdev" / "qr-code-generator" / "index.html",
    ROOT / "pcm" / "utility-tools" / "netdev" / "websocket-test" / "index.html",
]


def main():
    for path in FILES:
        if replace_many(path, REPLACEMENTS):
            print(path.relative_to(ROOT).as_posix())


if __name__ == "__main__":
    main()
