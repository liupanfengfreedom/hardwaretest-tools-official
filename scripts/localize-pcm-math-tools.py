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


HTML_REPLACEMENTS = [
    ("MD5 Hash Generator", "MD5 hash maker"),
    ("MD5 Hash Tool", "MD5 hash tool"),
    ("Checksum Tool", "checksum tool"),
    ("CRC32 Checksum Tool", "CRC32 checksum tool"),
    ("CRC32 Checksum Generator &amp; Verification Tool | StarryRing", "CRC32 checksum checker and maker | StarryRing"),
    ("CyberPass Pro - Pro For internet Password generator | Secure Random Password Tool | StarryRing",
     "CyberPass Pro - browser password generator | secure random password tool | StarryRing"),
    ("CyberNum - Pro For internet Random Number Engine, E support Integer, Decimal, Custom Range Random Number Generation | StarryRing",
     "CyberNum - browser random number engine for integer, decimal, and custom range | StarryRing"),
    ("CLIENT-SIDE ONLY", "BROWSER ONLY"),
    ("REAL-TIME COMPUTE", "LIVE COMPUTE"),
    ("NO DATA TRANSMITTED", "NO DATA DEY LEAVE"),
    ("Output Config", "Output setup"),
    ("Hash Variant", "Hash type"),
    ("Input Encoding", "Input format"),
    ("Batch Mode", "Batch style"),
    ("Single / Full Text", "Single / full text"),
    ("Split by Line (Batch)", "Split by line (batch)"),
    ("Calculation Settings", "Calculation setup"),
    ("Output Format", "Output style"),
    ("MD5 is a <strong>128-bit one-way hash function</strong>dat produces a 32-character hexadecimal digest. It na suitable for data integrity checks and fingerprinting, but<strong>not recommended</strong>for password storage. Use bcrypt or Argon2 instead.",
     "MD5 na <strong>128-bit one-way hash function</strong> wey gives 32-character hex digest. E fit help with data integrity check and fingerprint work, but e <strong>no good</strong> for password storage. Use bcrypt or Argon2 instead."),
    ("All calculations run<strong>locally in your browser</strong>. No data na uploaded to any server. E support CRC-32/ISO-HDLC, CRC-32C, CRC-32/MPEG-2, and CRC-32/BZIP2 variants.",
     "All calculations run <strong>locally inside your browser</strong>. No data dey upload to any server. E support CRC-32/ISO-HDLC, CRC-32C, CRC-32/MPEG-2, and CRC-32/BZIP2 variants."),
    ("No-pay browser-based MD5 hash generator for text, files, hex input, Base64, and batch processing.",
     "Free browser MD5 hash tool for text, file, hex input, Base64, and batch processing."),
    ("No-pay tool wey you fit use for internet MD5 hash generator for text, files, hex input, Base64, and batch processing. Instantly calculate MD5-32, MD5-16, and uppercase MD5 checksums in your browser.",
     "Free browser MD5 hash tool for text, file, hex input, Base64, and batch processing. Calculate MD5-32, MD5-16, and uppercase MD5 output inside your browser."),
    ("Generate MD5 hashes for text, files, hex byte streams, Base64, and batch input. E support MD5-32, MD5-16, and uppercase output directly in your browser.",
     "Generate MD5 hash for text, file, hex byte stream, Base64, and batch input. E support MD5-32, MD5-16, and uppercase output inside your browser."),
    ("No-pay tool wey you fit use for internet CRC32 checksum tool for text, files, hex input, Base64, and multiple CRC32 variants.",
     "Free browser CRC32 checksum tool for text, file, hex input, Base64, and many CRC32 variants."),
    ("No-pay tool wey you fit use for internet CRC32 checksum generator for text, files, hex input, Base64, and multiple CRC32 variants. Great for file integrity checks and data verification.",
     "Free browser CRC32 checksum tool for text, file, hex input, Base64, and many CRC32 variants. Good for file integrity check and data verification."),
    ("Calculate CRC32 checksums for text, files, hex input, and Base64. E support ISO-HDLC, Castagnoli, MPEG-2, and BZIP2 CRC32 variants.",
     "Calculate CRC32 checksum for text, file, hex input, and Base64. E support ISO-HDLC, Castagnoli, MPEG-2, and BZIP2 CRC32 variants."),
    ("CyberPass Pro - Password generator", "CyberPass Pro - password generator"),
    ("CyberPass Pro Password generator", "CyberPass Pro password generator"),
    ("CyberNum Random Number Engine", "CyberNum random number engine"),
    ("Math Tools", "Math tools"),
    ("Password generator", "Password generator"),
    ("Random Number Engine", "random number engine"),
]


JS_REPLACEMENTS = [
    ("Please calculate CRC32 first", "Calculate CRC32 first"),
    ("Please enter the expected checksum", "Enter the expected checksum first"),
    ("Please enter data or upload a file", "Enter data or upload file"),
    ("Calculation complete", "Calculation don complete"),
    ("View format guide ↗", "See format guide ↗"),
    ("Batch add is unavailable in file mode", "Batch add no dey available for file mode"),
    ("Add a batch line at the end", "Add one more batch line at the end"),
    ("Generate", "Generate"),
    ("Result", "Result"),
    ("Copied", "Don copy"),
    ("Copied:", "Don copy:"),
    ("Copy failed", "Copy no work"),
    ("Password don copy", "Password don copy"),
]


FILES = [
    ROOT / "pcm" / "utility-tools" / "math" / "md5-generator" / "index.html",
    ROOT / "pcm" / "utility-tools" / "math" / "crc32-generator" / "index.html",
    ROOT / "pcm" / "utility-tools" / "math" / "password-generator" / "index.html",
    ROOT / "pcm" / "utility-tools" / "math" / "random-number-generator" / "index.html",
]

SCRIPTS = [
    ROOT / "static" / "js" / "utility-tools" / "math" / "md5-generator" / "script-pcm.js",
    ROOT / "static" / "js" / "utility-tools" / "math" / "crc32-generator" / "script-pcm.js",
    ROOT / "static" / "js" / "utility-tools" / "math" / "password-generator" / "script-pcm.js",
    ROOT / "static" / "js" / "utility-tools" / "math" / "random-number-generator" / "script-pcm.js",
]


def main():
    changed = []
    for path in FILES:
        if replace_many(path, HTML_REPLACEMENTS):
            changed.append(path.relative_to(ROOT).as_posix())
    for path in SCRIPTS:
        if replace_many(path, JS_REPLACEMENTS):
            changed.append(path.relative_to(ROOT).as_posix())
    for item in changed:
        print(item)


if __name__ == "__main__":
    main()
