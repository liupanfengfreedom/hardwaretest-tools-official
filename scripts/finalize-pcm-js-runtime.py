from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


REPLACEMENTS = {
    "static/js/toolbox/speaker/script-pcm.js": [
        ("'Start playback'", "'Start playback now'"),
        ("'Stop playback'", "'Stop playback now'"),
    ],
    "static/js/toolbox/camera/script-pcm.js": [
        ("'Camera permission ask'", "'Camera permission request'"),
        ("`Camera ${++videoCount}`", "`Camera ${++videoCount}`"),
        ("'Camera live stream'", "'Camera live view'"),
        ("'Start fail: '", "'Start no work: '"),
        ("'Error: ' + errorMessage", "'Wahala: ' + errorMessage"),
        ("'Camera access fail: ' + errorMessage + '\\n\\nOpen help guide?'", "'Camera access no work: ' + errorMessage + '\\n\\nOpen help guide?'"),
        ("'Stop'", "'Stop finish'"),
        ("'Stream switch failed:'", "'Stream switch no work:'"),
    ],
    "static/js/toolbox/keyboard/script-pcm.js": [
        ("infoTime.innerText = 'Start';", "infoTime.innerText = 'Start';"),
        ("Keyboard Diagnostic Mode", "Keyboard check mode"),
        ("Complete Diagnosis & Generate Report", "Finish check & make report"),
        ("Response delay test completed, judge based on usage experience", "Response delay check don finish, judge am with your use experience"),
        ("Please test more keys to evaluate response delay", "Abeg test more keys make response delay result better"),
        ("Keyboard check report", "Keyboard check report"),
        ("Keyboard in good condition", "Keyboard dey okay"),
        ("Keyboard in Good Condition", "Keyboard dey okay"),
    ],
    "static/js/toolbox/mouse/cps/script-pcm.js": [
        ("Test completed, please click \"Start again\" button to start new test", "Check don finish, click \"Start again\" make new check start"),
        ("Ready to Start", "Ready to start"),
        ("Click mouse to start countdown", "Click mouse make countdown start"),
        ("Click mouse left button to start countdown", "Click left mouse side make countdown start"),
        ("Click mouse right button to start countdown", "Click right mouse side make countdown start"),
        ("Click mouse middle button to start countdown", "Click middle mouse side make countdown start"),
        ("Click to Start", "Click to start"),
        ("Mouse CPS Test", "Mouse CPS check"),
        ("Click mouse quickly!", "Click mouse fast-fast!"),
        ("Click mouse left button quickly!", "Click left mouse side fast-fast!"),
        ("Click mouse right button quickly!", "Click right mouse side fast-fast!"),
        ("Click mouse middle button quickly!", "Click middle mouse side fast-fast!"),
        ("Click \"Start again\" button below to start new test", "Click \"Start again\" below make new check start"),
        ("Test completed! Click \"Start again\" button to start new test", "Check don finish! Click \"Start again\" make new check start"),
        ("Reset complete, move mouse to test area to activate and start new test", "Reset don finish, move mouse go check area make new check start"),
        ("<i class=\"fas fa-redo\"></i> Start again", "<i class=\"fas fa-redo\"></i> Start again"),
        ("<i class=\"fas fa-play-circle\"></i> Click to start new test", "<i class=\"fas fa-play-circle\"></i> Click make new check start"),
        ("Click steadiness", "Click steadiness"),
        ("Appearance Settings", "Appearance settings"),
        ("Show Click Particle Effects", "Show click particle effects"),
        ("Test Settings", "Check settings"),
        ("Clear All Data", "Clear all data"),
        ("Restore Default Settings", "Restore default settings"),
        ("Export failed, please try again", "Export no work, abeg try again"),
        ("Please use ${allowedButton} to click", "Abeg use ${allowedButton} click"),
    ],
    "static/js/toolbox/mouse/polling-rate/script-pcm.js": [
        ("No data to export. Please perform testing first.", "No data to export. Abeg run check first."),
        ("Download test data file:", "Download check data file:"),
        ("Testing tool ready (${startTime}) - Start moving mouse to test", "Check tool ready (${startTime}) - start to move mouse make check begin"),
    ],
    "static/js/utility-tools/netdev/ping/script-pcm.js": [
        ("Please enter a target address or domain", "Abeg enter target address or domain"),
        ("Stop Test", "Stop check"),
        ("Start Test", "Start check"),
        ("Error: ", "Wahala: "),
        ("[Connection failed]", "[Connection no work]"),
    ],
    "static/js/utility-tools/netdev/websocket-test/script-pcm.js": [
        ("Connection failed: ", "Connection no work: "),
    ],
    "static/js/utility-tools/design-media/image-converter/script-pcm.js": [
        ("Start work", "Start work"),
        ("Error processing file", "Wahala as file dey process"),
    ],
    "static/js/utility-tools/design-media/app-icon-generator/script-pcm.js": [
        ("Icon generation failed:", "Icon making no work:"),
        ("Generate full icon set (.zip)", "Generate full icon set (.zip)"),
    ],
    "static/js/utility-tools/design-media/favicon-generator/script-pcm.js": [
        ("Generate again", "Generate again"),
        ("Upload the icons folder to your website root directory", "Upload the icons folder go your website root directory"),
        ("Upload the site.webmanifest file to the root directory", "Upload the site.webmanifest file go root directory"),
    ],
    "static/js/utility-tools/design-media/audio-converter/script-pcm.js": [
        ("Browser does not support Web Audio API", "This browser no support Web Audio API"),
        ("browser does not support this audio format", "browser no support this audio format"),
        ("File reading failed", "File reading no work"),
        ("lamejs not loaded, please check network and retry", "lamejs no load, abeg check network and try again"),
        ("This browser does not support ", "This browser no support "),
        ("Upload file first", "Upload file first"),
        ("Playback failed: ", "Playback no work: "),
    ],
    "static/js/utility-tools/design-media/online-voice-recorder/script-pcm.js": [
        ("Start no work: ", "Start no work: "),
        ("Microphone · captured via getUserMedia", "Microphone · captured through getUserMedia"),
        ("System sound · browser capture am through Screen Capture API", "System sound · browser capture am through Screen Capture API"),
        ("System audio", "System audio"),
    ],
    "static/js/utility-tools/math/aes-encrypt/script-pcm.js": [
        ("Invalid hex string", "Hex string no valid"),
        ("Please enter or generate a key", "Abeg enter or generate key"),
        ("The key must be a hex string containing only 0-9 and a-f", "Key must be hex string with only 0-9 and a-f"),
        ("Please generate a new key", "Abeg generate new key"),
        ("Please enter or generate an IV", "Abeg enter or generate IV"),
        ("Please generate a new IV", "Abeg generate new IV"),
        ("Please enter content to process", "Abeg enter content make e process"),
        ("Unsupported mode", "Mode no supported"),
        ("This browser does not support AES-192, so the tool switched to AES-256 automatically", "This browser no support AES-192, so tool switch go AES-256 by itself"),
    ],
    "static/js/utility-tools/math/aes-decrypt/script-pcm.js": [
        ("The hex string length must be even", "Hex string length must be even"),
        ("Please enter a key", "Abeg enter key"),
        ("The key must be a hex string containing only 0-9 and a-f", "Key must be hex string with only 0-9 and a-f"),
        ("Please enter an IV", "Abeg enter IV"),
        ("Please enter ciphertext", "Abeg enter ciphertext"),
        ("Invalid Base64 content. Please check the ciphertext input.", "Base64 content no valid. Abeg check ciphertext input."),
        ("Unsupported mode", "Mode no supported"),
        ("GCM authentication failed - the key or IV is wrong, or the ciphertext was modified in transit", "GCM authentication no work - key or IV wrong, or ciphertext change for road"),
    ],
    "static/js/utility-tools/math/rsa-encrypt/script-pcm.js": [
        ("Invalid hex string", "Hex string no valid"),
        ("Please enter content to process", "Abeg enter content make e process"),
        ("Please paste or generate a public key", "Abeg paste or generate public key"),
        ("Invalid public key format. Please use PEM format", "Public key format no valid. Abeg use PEM format"),
        ("Public key import failed - ", "Public key import no work - "),
        ("Plaintext is too large", "Plaintext too large"),
        ("Shorten the message or use hybrid encryption.", "Shorten the message or use hybrid encryption."),
        ("Encryption failed: ", "Encryption no work: "),
    ],
    "static/js/utility-tools/math/rsa-decrypt/script-pcm.js": [
        ("Unable to read", "No fit read"),
        ("Please try again.", "Abeg try again."),
        ("is not a PEM file", "no be PEM file"),
        ("Please upload a valid private key file.", "Abeg upload valid private key file."),
        ("is a certificate file (CERTIFICATE), not a private key.", "na certificate file (CERTIFICATE), no be private key."),
        ("Please upload a -----BEGIN PRIVATE KEY----- or -----BEGIN RSA PRIVATE KEY----- file.", "Abeg upload -----BEGIN PRIVATE KEY----- or -----BEGIN RSA PRIVATE KEY----- file."),
        ("Password-protected private keys are not supported here; please use an unencrypted private key file.", "Password-protected private keys no supported here; abeg use private key file wey no encrypt."),
        ("Please enter ciphertext", "Abeg enter ciphertext"),
        ("Invalid Base64 ciphertext. Please check the input.", "Base64 ciphertext no valid. Abeg check input."),
        ("Please enter a private key", "Abeg enter private key"),
        ("Invalid private key format. Please use PEM.", "Private key format no valid. Abeg use PEM."),
        ("Private key import failed - ", "Private key import no work - "),
        ("Decryption fail - please verify the private key matches the encryption public key, and that the hash algorithm and ciphertext are correct.", "Decryption no work - abeg confirm say private key match public key, and hash algorithm plus ciphertext correct."),
    ],
    "static/js/utility-tools/math/password-generator/script-pcm.js": [
        ("Generation failed. Please try again.", "Generation no work. Abeg try again."),
        ("Generate New Password", "Generate new password"),
        ("Generation failed", "Generation no work"),
    ],
    "static/js/utility-tools/math/crc32-generator/script-pcm.js": [
        ("Enter data or upload file", "Enter data or upload file"),
        ("Hex input only allows 0-9 and a-f", "Hex input only allows 0-9 and a-f"),
        ("Hex input must contain an even number of characters", "Hex input must get even number of characters"),
        ("Invalid Base64 format, please check your input", "Base64 format no valid, abeg check your input"),
    ],
    "static/js/utility-tools/math/md5-generator/script-pcm.js": [
        ("Invalid Base64 input", "Base64 input no valid"),
        ("title=\"Copy\"", "title=\"Copy\""),
    ],
}


def main() -> None:
    changed = []
    for rel, replacements in REPLACEMENTS.items():
        path = ROOT / rel
        text = path.read_text(encoding="utf-8")
        original = text
        for old, new in replacements:
            text = text.replace(old, new)
        if text != original:
            path.write_text(text, encoding="utf-8")
            changed.append(rel)
    for rel in changed:
        print(rel)


if __name__ == "__main__":
    main()
