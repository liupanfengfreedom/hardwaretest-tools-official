import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PCM = ROOT / "pcm"


GLOBAL_REPLACEMENTS = [
    ("<span itemprop=\"name\">Home</span>", "<span itemprop=\"name\">House</span>"),
    ("><i class=\"fas fa-home\"></i>Home</a>", "><i class=\"fas fa-home\"></i>House</a>"),
    ("><i aria-hidden=\"true\" class=\"fas fa-home\"></i>Home</a>", "><i aria-hidden=\"true\" class=\"fas fa-home\"></i>House</a>"),
    (">Home</a>", ">House</a>"),
    ("Tool page hub", "Tool corner"),
    ("Tool page center", "Tool corner"),
    ("Language Switcher", "Language picker"),
    ("English version", "English side"),
    ("Chinese version", "Chinese side"),
    ("Privacy rule", "Privacy rules"),
    ("Terms wey guide use", "Terms of use"),
    ("Terms wey walk-through use", "Terms of use"),
    ("Contact</h2>", "Reach us</h2>"),
    ("All rights reserved", "All rights reserved"),
    ("Start again", "Start afresh"),
    ("Clear all", "Clear everything"),
    ("Clear All", "Clear everything"),
    ("Reset All", "Reset everything"),
    ("Reset Data", "Reset data"),
    ("Reset default", "Return default"),
    ("Upload File", "Upload file"),
    ("Download CSV log", "Download CSV log"),
    ("Copy Config", "Copy setup"),
    ("Paste JSON Config", "Paste JSON setup"),
    ("Upload Config File", "Upload setup file"),
    ("Output Encoding", "Output encoding"),
    ("Input Data", "Input data"),
    ("Input format", "Input style"),
    ("Output style", "Output style"),
    ("Output setup", "Output setup"),
    ("Primary Output", "Main output"),
    ("Search keys or values...", "Search key or value..."),
    ("Enter JSON and click Parse", "Put JSON, then click Parse"),
    ("Click to upload logo image", "Click make you upload logo image"),
    ("Click generate after customizing settings", "Click generate after you don set am"),
    ("Click the color box or use the picker make you choose color", "Click color box or use picker make you choose color"),
    ("Click screen to change color", "Click screen make color change"),
    ("Press Space to switch", "Press Space make e switch"),
    ("ESC to exit", "ESC make you comot"),
    ("Current frequency level level level level level", "Current frequency level"),
    ("Current frequency level level level level", "Current frequency level"),
    ("Test frequency level level level level level", "Check frequency level"),
    ("Test frequency level level level level", "Check frequency level"),
    ("Send request now now", "Send request now"),
    ("'Send request now now'", "'Send request now'"),
]


FILE_REPLACEMENTS = {
    "index.html": [
        ("Test my gear", "Check my gear"),
        ("Tool wey gamers build for gamers", "Tool wey gamers build for gamers"),
        ("Input testing tool wey gamers and indie developers build", "Input check tool wey gamers and indie developers build"),
        ("Free to use", "Free to use"),
        ("No signup", "No signup"),
        ("No input data saved", "No input data saved"),
    ],
    "about-us/index.html": [
        ("About StarryRing &ndash; browser input checks for gamers and developers", "About StarryRing &ndash; page-side input checks for gamers and developers"),
        ("Privacy clear well", "Privacy dey clear"),
    ],
    "contact-us/index.html": [
        ("Reach StarryRing &middot; Contact page", "Reach StarryRing &middot; contact side"),
    ],
    "disclaimer/index.html": [
        ("7. Contact", "7. Reach us"),
    ],
    "privacy/index.html": [
        ("Privacy rule", "Privacy rules"),
        ("12. Contact", "12. Reach us"),
    ],
    "terms/index.html": [
        ("8. Contact", "8. Reach us"),
    ],
    "toolbox/index.html": [
        ("Mouse test", "Mouse check"),
        ("Keyboard test", "Keyboard check"),
        ("Camera test", "Camera check"),
        ("Speaker test", "Speaker check"),
        ("Mouse test lab", "Mouse check lab"),
        ("Keyboard Master", "Keyboard check master"),
        ("Audio and video checks", "Audio and video check"),
        ("Color accuracy analysis", "Color accuracy check"),
        ("Microphone sensitivity check", "Mic sensitivity check"),
        ("Audio quality check", "Audio quality check"),
        ("Test mode hides mouse and interface by itself", "Check mode hide mouse and interface by itself"),
        ("Start mouse test", "Start mouse check"),
        ("HardwareTest Tools", "HardwareTest tools"),
        ("All systems dey ready.", "All systems dey ready."),
    ],
    "toolbox/camera/index.html": [
        ("Page-side Camera test page - Sharpness, Resolution &amp; FPS Test", "Page-side camera check page - sharpness, resolution &amp; FPS check"),
        ("Camera test page", "Camera check page"),
        ("Live Video, Resolution &amp; FPS Test", "Live video, resolution &amp; FPS check"),
        ("Free page-side app", "Free page-side app"),
        ("Camera source", "Camera source"),
        ("Privacy</div>", "Private</div>"),
        ("If you notice: 1) Blurry video; 2) Low frame rate causing stuttering; 3) Color distortion; 4) Poor performance in low light, dese may indicate camera quality issues.", "If you notice blurry video, low frame rate, color wahala or poor low-light picture, your camera quality fit get issue."),
        ("Camera live feed", "Camera live view"),
    ],
    "toolbox/mic/index.html": [
        ("Page-side Microphone test page - Volume, Noise &amp; Delay Test", "Page-side microphone check page - volume, noise &amp; delay check"),
        ("Microphone test page", "Microphone check page"),
        ("Free Live Audio Analysis", "Free live audio check"),
        ("Test microphone volume, waveform, spectrum, noise and delay", "Check mic volume, waveform, spectrum, noise and delay"),
        ("Click make you allow permission (or reset am for address bar)", "Click make you allow permission, or reset am for address bar"),
        ("Audio delay", "Audio delay"),
        ("Input gain", "Input gain"),
        ("Test actions", "Check actions"),
        ("The tool automatically performs latency tests. Di system emits test tones and measures round-trip latency from input to output, with results displayed in di \"Audio Latency\" stats item.", "Di page fit run delay check by itself. E play test tone, measure round-trip delay from input to output, then show result for the audio delay stats."),
    ],
    "toolbox/speaker/index.html": [
        ("Speaker test page", "Speaker check page"),
        ("Speaker frequency test", "Speaker frequency check"),
        ("Test frequency level level level level level", "Check frequency level"),
        ("Test frequency level level level level", "Check frequency level"),
        ("Start playback now now", "Start playback now"),
        ("Audio status", "Audio status"),
        ("Audio system calibration", "Audio system calibration"),
        ("Audio test app", "Audio check app"),
        ("Speaker resonance test", "Speaker resonance check"),
        ("Test room acoustic characteristics using white noise and pink noise, identify standing waves, resonance points, and provide data support for room acoustic treatment.", "Use white noise and pink noise check room sound behavior, find standing wave and resonance points, then use the data for room sound treatment."),
    ],
    "toolbox/dead-pixel/index.html": [
        ("Page-side Screen Dead Pixel Test - Free Monitor Quality Detection", "Page-side screen dead-pixel check - free monitor quality check"),
        ("Screen Dead Pixel Detection Tool", "Screen dead-pixel check app"),
        ("Page-side Screen Dead Pixel Detection Tool - Pro Display Quality Test", "Page-side screen dead-pixel check app - pro display quality check"),
        ("Monitor Test", "Monitor check"),
        ("Gaming Monitor Test", "Gaming monitor check"),
        ("Start Full Screen check", "Start full-screen check"),
        ("Pro Screen checking Tool Wetin e fit do", "Pro screen check app wetin e fit do"),
        ("Dead Pixel Detection", "Dead-pixel spotting"),
        ("Color Uniformity Test", "Color uniformity check"),
        ("Backlight Bleeding Test", "Backlight bleeding check"),
        ("Test if color performance na uniform across screen areas, identifying issues like yellowing, reddening, or uneven brightness at edges.", "Check whether color stay even across screen, and spot yellowing, red tint or uneven edge brightness."),
        ("E give standardized testing process: Dead pixel test &rarr; Color Test &rarr; Grayscale Test &rarr; Response Test, ensuring comprehensive coverage of all testing scenarios.", "E give standard check flow: dead pixel &rarr; color &rarr; grayscale &rarr; response, so the main screen issues no hide."),
    ],
    "toolbox/keyboard/index.html": [
        ("Keyboard test page - Chatter, NKRO & response test", "Keyboard check page - chatter, NKRO & response check"),
        ("Keyboard test page", "Keyboard check page"),
        ("Free keyboard check page. Test key presses, chatter, response delay and NKRO live, plus get quick repair hints.", "Free keyboard check page. Check key press, chatter, response delay and NKRO live, plus quick repair hints."),
        ("Hint: Press any key to start test - di key go light up live. Click \"Diagnosis\" if you want quick repair hints.", "Hint: Press any key make check start. Di key go light up live. Click \"Diagnosis\" if you want quick repair hints."),
    ],
    "toolbox/keyboard/apple-keyboard/index.html": [
        ("Apple Keyboard Diagnostic", "Apple Keyboard check"),
        ("Reset Test", "Reset check"),
        ("Clear log", "Clear log"),
        ("Keyboard check", "Keyboard check"),
    ],
    "toolbox/mouse/index.html": [
        ("Mouse check page | Tap, double-tap, and scroll-wheel check", "Mouse check page | tap, double-tap and scroll-wheel check"),
        ("Mouse check corner", "Mouse check corner"),
        ("Mouse check zone", "Mouse check zone"),
        ("Clear all data", "Clear all data"),
    ],
    "toolbox/mouse/scroll-wheel/index.html": [
        ("Mouse wheel check page - Backscroll and jump-fault check", "Mouse wheel check page - backscroll and jump-fault check"),
        ("Upward Scroll Test (Up)", "Up scroll check (up)"),
        ("Downward Scroll Test (Down)", "Down scroll check (down)"),
        ("Dual Test Modes", "Two check modes"),
        ("Select \"Upward Scroll Test\" mode, then scroll upward 20 to 30 times without stopping", "Choose \"Up scroll check\" mode, then scroll up 20 to 30 times without stopping"),
    ],
    "toolbox/mouse/polling-rate/index.html": [
        ("Mouse move-rate check page | Steady cursor motion check", "Mouse move-rate check page | steady cursor motion check"),
        ("Mouse move-rate check page for page side", "Mouse move-rate check page for page side"),
        ("Test oversampling mouse (2000Hz+)", "Check oversampling mouse (2000Hz+)"),
        ("Share am for:", "Share am for:"),
        ("Download di latest release", "Download latest release"),
        ("Share on Twitter", "Share for Twitter"),
        ("Share on Reddit", "Share for Reddit"),
        ("Share on Facebook", "Share for Facebook"),
        ("Share on Telegram", "Share for Telegram"),
    ],
    "toolbox/mouse/instruction/index.html": [
        ("Mouse check page walk-through | How to check every mouse function", "Mouse check page walk-through | how to check every mouse function"),
        ("Test area status signs", "Check-area status signs"),
        ("Reset function:", "Reset function:"),
        ("Move your mouse into di <b>\"Mouse check area\"</b>.", "Move your mouse inside di <b>\"Mouse check area\"</b>."),
        ("Tap the \"Reset All Data\" side to clear counts and logs if you want start fresh again.", "Tap \"Reset all data\" make counts and logs clear if you want start fresh again."),
    ],
    "toolbox/mouse/double-click/instruction/index.html": [
        ("Test area status signs", "Check-area status signs"),
        ("Reset function:", "Reset function:"),
        ("About dis tool", "About dis tool"),
    ],
    "toolbox/mouse/double-click/index.html": [
        ("Color code: one tap (blue), normal double tap (green), faulty double tap (red)", "Color code: one tap (blue), normal double-tap (green), faulty double-tap (red)"),
    ],
    "toolbox/mouse/double-click/principle/index.html": [
        ("Mouse side timing sketch", "Mouse side timing sketch"),
        ("Contact oxidation:", "Contact oxidation:"),
        ("Mechanical wear:", "Mechanical wear:"),
        ("Contact shake", "Contact shake"),
    ],
    "utility-tools/index.html": [
        ("Image converter", "Image converter"),
        ("Audio recorder", "Audio recorder"),
        ("Audio converter", "Audio converter"),
        ("Currency calculator", "Currency calculator"),
        ("Password generator", "Password maker"),
        ("Random number generator", "Random number maker"),
        ("Deposit interest calculator", "Deposit interest calculator"),
        ("Loan calculator", "Loan calculator"),
        ("Test network latency and stability across different target address.", "Check network delay and stability across different target address."),
        ("Validate JSON, inspect tree view, format or minify output, and check structure stats fast.", "Validate JSON, inspect tree view, format or minify output, and check structure stats fast."),
        ("WebSocket test page", "WebSocket check page"),
        ("Test WebSocket connection, then send and receive message live.", "Check WebSocket connection, then send and receive message live."),
    ],
    "utility-tools/netdev/ping/index.html": [
        ("Diagnostics Tool", "Diagnostics app"),
        ("Pro page-side network diagnostics. Test via", "Pro page-side network diagnostics. Check via"),
        ("Test Method", "Check method"),
        ("Start Test", "Start check"),
        ("What's di difference between ICMP Ping and HTTPS GET?", "Wetin be difference between ICMP Ping and HTTPS GET?"),
        ("Why na Ping and HTTPS latencies different?", "Why Ping and HTTPS delay no be the same?"),
        ("Why do you use a remote proxy for Ping?", "Why una use remote proxy for Ping?"),
        ("Search history", "Search old records"),
    ],
    "utility-tools/netdev/websocket-test/index.html": [
        ("WebSocket test page - free WS/WSS client", "WebSocket check page - free WS/WSS client"),
        ("WebSocket test page", "WebSocket check page"),
        ("WebSocket test app", "WebSocket check app"),
        ("Clear all", "Clear everything"),
        ("Enter WebSocket server address, choose ws/wss, add custom headers if needed. After successful connection, status indicator turns green.", "Enter WebSocket server address, choose ws/wss, add custom headers if needed. After connection work, status light go turn green."),
        ("Message Statistics", "Message stats"),
        ("Message Log", "Message log"),
        ("Connection Settings", "Connection setup"),
    ],
    "utility-tools/netdev/json-parser/index.html": [
        ("Browser JSON parser, formatter and tree viewer", "Page-side JSON parser, formatter and tree viewer"),
        ("JSON parser", "JSON parser"),
        ("Input JSON", "Input JSON"),
        ("Clear", "Clear"),
    ],
    "utility-tools/netdev/qr-code-generator/index.html": [
        ("QR Code Detailed Settings", "QR code detailed setup"),
        ("QR Code Color", "QR code color"),
        ("Background Color", "Background color"),
        ("Generate Beautiful QR Code", "Generate fine QR code"),
        ("QR Code Preview Area", "QR code preview area"),
        ("Download QR code image", "Download QR code image"),
        ("Upload logo image", "Upload logo image"),
    ],
    "utility-tools/design-media/audio-converter/index.html": [
        ("Audio convert page - free MP3/WAV/FLAC/AAC helper", "Audio convert page - free MP3/WAV/FLAC/AAC helper"),
        ("01 — Upload files", "01 — Upload files"),
        ("02 — File Queue", "02 — File queue"),
        ("04 — Download results", "04 — Download results"),
        ("Start conversion", "Start conversion"),
        ("Extract Audio from Video", "Extract audio from video"),
        ("Privacy Safe, Zero Upload", "Privacy safe, zero upload"),
    ],
    "utility-tools/design-media/online-voice-recorder/index.html": [
        ("Audio record page", "Audio record page"),
        ("Audio source", "Audio source"),
        ("Microphone", "Microphone"),
        ("Click", "Click"),
        ("We no see audio track. Check \"Share audio\" for the popup or allow microphone, then try again.", "We no see audio track. Check \"Share audio\" for popup or allow microphone, then try again."),
    ],
    "utility-tools/design-media/color-grading/index.html": [
        ("Color tool", "Color tool"),
        ("Color Analysis", "Color check"),
        ("Color info", "Color info"),
        ("Live Color Conversion", "Live color conversion"),
        ("In-depth Color Analysis", "Deep color check"),
        ("Color Technical details", "Color technical details"),
        ("Recommendations for choosing accessible colors:", "Better ways to choose accessible colors:"),
    ],
    "utility-tools/design-media/favicon-generator/index.html": [
        ("Start Generation", "Start generation"),
        ("Settings", "Settings"),
        ("Best Page-side Icon Generator - Favicon Studio Pro", "Best page-side icon maker - Favicon Studio Pro"),
        ("Image cropping area", "Image crop area"),
        ("Download complete icon pack", "Download full icon pack"),
    ],
    "utility-tools/design-media/app-icon-generator/index.html": [
        ("Generate full icon set", "Generate full icon set"),
        ("Upload again", "Upload again"),
        ("Upload icon", "Upload icon"),
        ("Preview and generate", "Preview and generate"),
        ("Real‑Time Preview", "Live preview"),
        ("Batch Export", "Batch export"),
        ("Privacy &amp; Security", "Privacy &amp; security"),
    ],
    "utility-tools/design-media/image-converter/index.html": [
        ("Image resize and convert page - private image room", "Image resize and convert page - private image room"),
        ("Preview", "Preview"),
        ("File name", "File name"),
        ("Output format", "Output format"),
        ("Download", "Download"),
        ("Image preview", "Image preview"),
    ],
    "utility-tools/math/random-number-generator/index.html": [
        ("Random number generator", "Random number maker"),
        ("Digits to Generate", "Digits to generate"),
        ("Count to Generate", "Count to generate"),
        ("Generate Random Sequence", "Generate random list"),
        ("Random Number Generation Technical details", "Random number technical details"),
        ("Random number algorithm used by dis tool", "Random number algorithm wey dis tool dey use"),
    ],
    "utility-tools/math/password-generator/index.html": [
        ("Password generator", "Password maker"),
        ("Password check", "Password check"),
        ("Password stats", "Password stats"),
        ("Password security technical standards", "Password security technical standards"),
        ("Password entropy measures randomness and unpredictability", "Password entropy measures randomness and unpredictability"),
        ("Password don copy", "Password don copy"),
        ("Password size adjustment", "Password size adjustment"),
    ],
    "utility-tools/math/loan-interest-rate-calculator/index.html": [
        ("Loan interest calculator", "Loan interest calculator"),
        ("Loan amount", "Loan amount"),
        ("Loan time", "Loan time"),
        ("Loan FAQ", "Loan FAQ"),
    ],
    "utility-tools/math/currency-calculator/index.html": [
        ("Currency trend analyzer", "Currency trend analyzer"),
        ("Currency converter", "Currency converter"),
        ("Global Currency Coverage", "Global currency coverage"),
        ("Click different time range buttons to switch between trend charts", "Click different time range buttons make trend chart switch"),
    ],
    "utility-tools/math/md5-generator/index.html": [
        ("Upload File", "Upload file"),
        ("Original Input", "Original input"),
        ("Standard Output", "Standard output"),
        ("Truncated Output", "Truncated output"),
        ("Uppercase Output", "Uppercase output"),
    ],
    "utility-tools/math/crc32-generator/index.html": [
        ("Input Reflection", "Input reflection"),
        ("Output Reflection", "Output reflection"),
        ("Input format Guide", "Input style guide"),
        ("Output style Guide", "Output style guide"),
        ("Best For", "Best for"),
    ],
}


def replace_many(path: Path, replacements: list[tuple[str, str]]) -> bool:
    text = path.read_text(encoding="utf-8")
    original = text
    for old, new in GLOBAL_REPLACEMENTS + replacements:
        text = text.replace(old, new)
    text = re.sub(r"Privacy rules+", "Privacy rules", text)
    text = re.sub(r"Current frequency level(?: level)+", "Current frequency level", text)
    text = re.sub(r"Check frequency level(?: level)+", "Check frequency level", text)
    text = re.sub(r"Request setup panel(?: panel)+", "Request setup panel", text)
    text = re.sub(r"Response result panel(?: panel)+", "Response result panel", text)
    text = re.sub(r"Request URL address(?: address)+", "Request URL address", text)
    text = text.replace("Send request now now", "Send request now")
    if text != original:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def main() -> None:
    changed = []
    for rel, replacements in FILE_REPLACEMENTS.items():
        path = PCM / rel
        if replace_many(path, replacements):
            changed.append(path.relative_to(ROOT).as_posix())
    for path in PCM.rglob("index.html"):
        if path.relative_to(PCM).as_posix() in FILE_REPLACEMENTS:
            continue
        if replace_many(path, []):
            changed.append(path.relative_to(ROOT).as_posix())
    for item in changed:
        print(item)


if __name__ == "__main__":
    main()
