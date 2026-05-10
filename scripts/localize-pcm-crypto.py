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
    ("RSA Encryption Tool", "RSA encrypt tool"),
    ("RSA Decryption Tool", "RSA decrypt tool"),
    ("AES Encryption Tool", "AES encrypt tool"),
    ("AES Decryption Tool", "AES decrypt tool"),
    ("Key Pair Generator", "key-pair maker"),
    ("Private Key Decoder", "private-key reader"),
    ("Config Exporter", "config export helper"),
    ("Config Importer", "config import helper"),
    ("CLIENT-SIDE ONLY", "BROWSER ONLY"),
    ("Algorithm Configuration", "Algorithm setup"),
    ("Switch to Encryption Tool", "Go to encrypt tool"),
    ("SecurityApplication", "SecurityApplication"),
    ("Generate RSA public/private key pairs", "Generate RSA public and private key pair"),
    ("Import PEM public keys", "Import PEM public key"),
    ("Support RSA-OAEP with multiple hash options", "Support RSA-OAEP with plenty hash options"),
    ("Export Base64 or Hex output", "Export Base64 or Hex output"),
    ("All cryptographic operations run locally in the browser", "All cryptographic work runs locally for browser"),
    ("Import PEM private keys", "Import PEM private key"),
    ("Accept Base64 and Hex ciphertext", "Accept Base64 and Hex ciphertext"),
    ("Load binary .enc files", "Load binary .enc file"),
    ("Support multiple OAEP hash options", "Support plenty OAEP hash options"),
    ("Run entirely in the browser", "Run fully inside browser"),
    ("Support AES-CBC, AES-CTR, and AES-GCM", "Support AES-CBC, AES-CTR, and AES-GCM"),
    ("Generate random keys and IV values", "Generate random key and IV values"),
    ("Encrypt text or uploaded files", "Encrypt text or uploaded file"),
    ("Output Base64 or Hex ciphertext", "Output Base64 or Hex ciphertext"),
    ("Export matching decryption config as JSON", "Export matching decrypt config as JSON"),
    ("Accept Base64, Hex, and .enc ciphertext", "Accept Base64, Hex, and .enc ciphertext"),
    ("Import encryption config as JSON", "Import encrypt config as JSON"),
    ("Download binary output when needed", "Download binary output when needed"),
    ("Run entirely in the browser", "Run fully inside browser"),
    ("No-pay tool wey you fit use for internet", "Free browser"),
    ("Generate RSA key pairs for internet, import PEM public keys, and perform RSA-OAEP encryption locally in your browser.",
     "Generate RSA key pair, import PEM public key, and run RSA-OAEP encryption locally inside your browser."),
    ("Import a PEM private key, decrypt Base64, Hex, or .enc ciphertext, and keep every operation inside your browser.",
     "Import PEM private key, decrypt Base64, Hex, or .enc ciphertext, and keep every step inside your browser."),
    ("Generate AES keys and IV values for internet, encrypt text or files with CBC, CTR, or GCM, and keep every operation inside your browser.",
     "Generate AES key and IV, encrypt text or file with CBC, CTR, or GCM, and keep every step inside your browser."),
    ("Import an AES key and IV, decrypt Base64, Hex, or .enc ciphertext, and keep every operation inside your browser.",
     "Import AES key and IV, decrypt Base64, Hex, or .enc ciphertext, and keep every step inside your browser."),
    ("// cryptographic tool v2.0", "// crypto tool v2.0"),
    ("<span class=\"badge\">BROWSER ONLY</span>", "<span class=\"badge\">BROWSER ONLY</span>"),
    ("<span class=\"config-title\">Algorithm setup</span>", "<span class=\"config-title\">Algorithm setup</span>"),
    ("<span><strong>BROWSER ONLY</strong>- keys and data na processed entirely inside your browser and na never uploaded to any server. Built on di native Web Crypto API.</span>",
     "<span><strong>BROWSER ONLY</strong> - keys and data stay inside your browser. We no upload am to any server. Native Web Crypto API dey run the work.</span>"),
    ("<span><strong>BROWSER ONLY</strong>- Keys and data stay inside your browser and na never uploaded to any server. Powered by di native Web Crypto API.</span>",
     "<span><strong>BROWSER ONLY</strong> - keys and data stay inside your browser. We no upload am to any server. Native Web Crypto API dey power am.</span>"),
    ("<span><strong>BROWSER ONLY</strong>- Keys and data stay inside your browser and na never uploaded to any server. All cryptographic work runs on di native Web Crypto API.</span>",
     "<span><strong>BROWSER ONLY</strong> - keys and data stay inside your browser. We no upload am to any server. All crypto work dey run on native Web Crypto API.</span>"),
    ("<h1 class=\"logo-title\">RSA<span>Cipher</span></h1>", "<h1 class=\"logo-title\">RSA<span>Locker</span></h1>"),
    ("<h1 class=\"logo-title\">RSA<span>Decipher</span></h1>", "<h1 class=\"logo-title\">RSA<span>Unlocker</span></h1>"),
    ("<h1 class=\"logo-title\">AES<span>Cipher</span></h1>", "<h1 class=\"logo-title\">AES<span>Locker</span></h1>"),
    ("<h1 class=\"logo-title\">AES<span>Decipher</span></h1>", "<h1 class=\"logo-title\">AES<span>Unlocker</span></h1>"),
]


JS_REPLACEMENTS = [
    ("Key pair generated", "Key pair don ready"),
    ("Key generation failed: ", "Key generation fail: "),
    ("No private key available", "No private key ready"),
    ("Private key downloaded", "Private key don download"),
    ("Configuration file downloaded", "Config file don download"),
    ("Configuration copied as JSON", "Config don copy as JSON"),
    ("Binary file - raw bytes will be encrypted directly", "Binary file - raw bytes go enter encrypt direct"),
    ("File loaded - format locked to TEXT", "File don load - format lock to TEXT"),
    ("Loaded: ", "Don load: "),
    ("File cleared", "File don clear"),
    ("No encrypted data available", "No encrypted data ready"),
    ("Nothing available to download", "Nothing ready to download"),
    ("Downloading file: ", "Dey download file: "),
    ("Download started...", "Download don start..."),
    ("Pasted", "Don paste am"),
    ("Unable to access the clipboard", "No fit use clipboard"),
    ("This field is empty", "This field empty"),
    ("Copied", "Don copy"),
    ("Nothing to copy", "Nothing dey to copy"),
    ("Ready - paste a public key or generate a key pair, then click Encrypt", "Ready - paste public key or generate key pair, then click Encrypt"),
    ("Ready - configure the public key, then click Encrypt", "Ready - set public key, then click Encrypt"),
    ("Encryption successful", "Encryption work well"),
    ("Decryption successful", "Decryption work well"),
    ("Decryption failed", "Decryption fail"),
    ("No decrypted data available", "No decrypted data ready"),
    ("Ready - paste a private key and ciphertext, then click Decrypt", "Ready - paste private key and ciphertext, then click Decrypt"),
    ("Clipboard content is not valid JSON", "Clipboard content no be valid JSON"),
    ("Invalid JSON file format", "JSON file format no correct"),
    ("No recognizable config fields were found in the JSON", "We no see any config field we fit use for the JSON"),
    ("Applied: ", "Applied: "),
    ("Mode changed. Please generate a fresh IV.", "Mode don change. Generate fresh IV."),
    ("Mode changed. Please confirm the IV again.", "Mode don change. Check the IV again."),
    ("Key generated", "Key don generate"),
    ("IV generated", "IV don generate"),
]


FILES = [
    ROOT / "pcm" / "utility-tools" / "math" / "rsa-encrypt" / "index.html",
    ROOT / "pcm" / "utility-tools" / "math" / "rsa-decrypt" / "index.html",
    ROOT / "pcm" / "utility-tools" / "math" / "aes-encrypt" / "index.html",
    ROOT / "pcm" / "utility-tools" / "math" / "aes-decrypt" / "index.html",
]

SCRIPTS = [
    ROOT / "static" / "js" / "utility-tools" / "math" / "rsa-encrypt" / "script-pcm.js",
    ROOT / "static" / "js" / "utility-tools" / "math" / "rsa-decrypt" / "script-pcm.js",
    ROOT / "static" / "js" / "utility-tools" / "math" / "aes-encrypt" / "script-pcm.js",
    ROOT / "static" / "js" / "utility-tools" / "math" / "aes-decrypt" / "script-pcm.js",
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
