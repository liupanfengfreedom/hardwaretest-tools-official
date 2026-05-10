from pathlib import Path


ROOT = Path(r"F:\WebTool\toolsite")


def replace_in_file(rel_path, replacements):
    path = ROOT / rel_path
    text = path.read_text(encoding="utf-8")
    original = text
    for src, dst in replacements:
        text = text.replace(src, dst)
    if text != original:
        path.write_text(text, encoding="utf-8")
        return True
    return False


camera_js = [
    ("title.textContent = 'Camera permission request';", "title.textContent = 'Camera permission ask';"),
    ("allowButton.textContent = 'Allow access';", "allowButton.textContent = 'Gree access';"),
    ("btn.textContent = isMirrored ? 'Mirror am' : 'Cancel mirror';", "btn.textContent = isMirrored ? 'Mirror am' : 'Off mirror';"),
    ("if (window.confirm('Camera access fail: ' + errorMessage + '\\n\\nOpen help documentation?')) {", "if (window.confirm('Camera access fail: ' + errorMessage + '\\n\\nOpen help guide?')) {"),
]


mic_js = [
    ("pttBtn.innerHTML = \"Recording... <br><span style='font-size:12px'>Release to Play</span>\";", "pttBtn.innerHTML = \"Dey record... <br><span style='font-size:12px'>Leave am to play</span>\";"),
    ("pttBtn.innerHTML = \"Hold to Record<br><span style='font-size:12px;font-weight:400;opacity:0.8'>Release to Play</span>\";", "pttBtn.innerHTML = \"Hold am to record<br><span style='font-size:12px;font-weight:400;opacity:0.8'>Leave am to play</span>\";"),
    ('latencyMsEl.textContent = "Dey calculate...";', 'latencyMsEl.textContent = "Dey calculate...";'),
    ('audioLatencyEl.textContent = "Dey test...";', 'audioLatencyEl.textContent = "Dey test...";'),
    ('micStatusDisplayEl.textContent = "Dey connect...";', 'micStatusDisplayEl.textContent = "Dey connect...";'),
    ('statusText.textContent = "Running";', 'statusText.textContent = "Dey run";'),
    ('statusText.textContent = "Click page make audio activate";', 'statusText.textContent = "Click page make audio wake up";'),
    ('playStateEl.textContent = "Recording";', 'playStateEl.textContent = "Dey record";'),
    ('playStateEl.textContent = "Playing back...";', 'playStateEl.textContent = "Dey play back...";'),
    ('playStateEl.textContent = "Standby";', 'playStateEl.textContent = "Dey wait";'),
    ('statusText.textContent = "Requesting...";', 'statusText.textContent = "Dey ask...";'),
]


image_converter_js = [
    ("btnRun.innerHTML = '<i class=\"fas fa-bolt\"></i> Start work';", "btnRun.innerHTML = '<i class=\"fas fa-bolt\"></i> Start work';"),
    ("badge.innerText = 'Need update';", "badge.innerText = 'Need refresh';"),
    ("badge.innerHTML = '<i class=\"fas fa-exclamation-circle\"></i> Need update';", "badge.innerHTML = '<i class=\"fas fa-exclamation-circle\"></i> Need refresh';"),
    ("<button class=\"btn-action btn-orig\" id=\"vo-${id}\"><i class=\"fas fa-eye\"></i> Original</button>", "<button class=\"btn-action btn-orig\" id=\"vo-${id}\"><i class=\"fas fa-eye\"></i> Source</button>"),
    ("<button class=\"btn-action btn-result\" id=\"vr-${id}\"><i class=\"fas fa-magic\"></i> Result</button>", "<button class=\"btn-action btn-result\" id=\"vr-${id}\"><i class=\"fas fa-magic\"></i> New one</button>"),
    ("document.getElementById(`vo-${id}`).onclick = () => showPreview(item.origUrl, 'Preview of original image');", "document.getElementById(`vo-${id}`).onclick = () => showPreview(item.origUrl, 'Source image preview');"),
    ("rBtn.onclick = () => showPreview(item.resultUrl, 'Preview of result');", "rBtn.onclick = () => showPreview(item.resultUrl, 'Converted image preview');"),
    ("badge.innerHTML = '<i class=\"fas fa-check-circle\"></i> Ready';", "badge.innerHTML = '<i class=\"fas fa-check-circle\"></i> Don ready';"),
    ("btnDownloadMain.innerHTML = `<i class=\"fas fa-file-archive\"></i> Download all (${fileQueue.length} images)`;", "btnDownloadMain.innerHTML = `<i class=\"fas fa-file-archive\"></i> Save all (${fileQueue.length} images)`;"),
    ("btnDownloadMain.innerHTML = `<i class=\"fas fa-file-archive\"></i> Download all (${fileQueue.length} images)`;", "btnDownloadMain.innerHTML = `<i class=\"fas fa-file-archive\"></i> Save all (${fileQueue.length} images)`;"),
]


audio_converter_js = [
    ("title=\"Remove\"", "title=\"Remove am\""),
    ("label = 'Original file';", "label = 'Source file';"),
    ("label = 'Converted file';", "label = 'New file';"),
    ("line.textContent = '['+t+'] ' + msg;", "line.textContent = '['+t+'] ' + msg;"),
    ("'Download</a>';", "'Save am</a>';"),
    ("btn.textContent = '⏳ Dey convert...';", "btn.textContent = '⏳ Dey convert...';"),
    ("? '✦ Original Sample Rate — ' + uniqueSRs[0] + ' Hz'", "? '✦ Source sample rate — ' + uniqueSRs[0] + ' Hz'"),
    ("? '✦ Original Sample Rate (Mixed)'", "? '✦ Source sample rate (mixed)'"),
    (": '✦ Original Sample Rate (Auto)';", ": '✦ Source sample rate (auto)';"),
    ("? '✦ Original Channels — ' + (uniqueChs[0] === 1 ? 'Mono' : uniqueChs[0] === 2 ? 'Stereo' : uniqueChs[0]+'ch')", "? '✦ Source channels — ' + (uniqueChs[0] === 1 ? 'Mono' : uniqueChs[0] === 2 ? 'Stereo' : uniqueChs[0]+'ch')"),
    ("? '✦ Original Channels (Mixed)'", "? '✦ Source channels (mixed)'"),
    (": '✦ Original Channels (Auto)';", ": '✦ Source channels (auto)';"),
    ("if (ao) ao.textContent = '✦ Original Sample Rate (Auto)';", "if (ao) ao.textContent = '✦ Source sample rate (auto)';"),
    ("if (ac) ac.textContent = '✦ Original Channels (Auto)';", "if (ac) ac.textContent = '✦ Source channels (auto)';"),
]


json_parser_js = [
    ("setStatus('', 'Waiting for input');", "setStatus('', 'Dey wait for input');"),
    ("document.getElementById('tree').innerHTML = '<div class=\"empty\"><div class=\"empty-ico\">{ }</div>Enter JSON and click Parse</div>';",
     "document.getElementById('tree').innerHTML = '<div class=\"empty\"><div class=\"empty-ico\">{ }</div>Put JSON then click Parse</div>';"),
    ("<div class=\"empty\"><div class=\"empty-ico\">{ }</div>Appears after parsing</div>", "<div class=\"empty\"><div class=\"empty-ico\">{ }</div>E go show after parse</div>"),
    ("<div style=\"grid-column:1/-1\"><div class=\"empty\" style=\"height:200px\"><div class=\"empty-ico\">{ }</div>Statistics appear after parsing</div></div>",
     "<div style=\"grid-column:1/-1\"><div class=\"empty\" style=\"height:200px\"><div class=\"empty-ico\">{ }</div>Stats go show after parse</div></div>"),
    ("setStatus('ok', '✓ Valid JSON');", "setStatus('ok', '✓ JSON correct');"),
    ("setStatus('err', '✗ Invalid JSON');", "setStatus('err', '✗ JSON no correct');"),
    ("document.getElementById('scnt').textContent = count ? `${count} matches` : 'No matches';",
     "document.getElementById('scnt').textContent = count ? `${count} matches` : 'No match';"),
    ("['Original size', fmtB(sz)], ['Minified size', fmtB(csz)],", "['Source size', fmtB(sz)], ['Compact size', fmtB(csz)],"),
    ("['Objects', s.obj], ['Arrays', s.arr],", "['Objects', s.obj], ['Arrays', s.arr],"),
    ("['Strings', s.str], ['Numbers', s.num],", "['Strings', s.str], ['Numbers', s.num],"),
    ("['Booleans', s.bool], ['Null', s.nul],", "['Booleans', s.bool], ['Null', s.nul],"),
    ("['Total keys', s.keys], ['Max depth', s.depth],", "['Total keys', s.keys], ['Max depth', s.depth],"),
]


keyboard_js = [
    ('<h3><i class="fas fa-file-medical-alt"></i> Keyboard Diagnostic Report</h3>', '<h3><i class="fas fa-file-medical-alt"></i> Keyboard check report</h3>'),
    ('<span>Keyboard Diagnostic Report</span>', '<span>Keyboard check report</span>'),
    ('<span class="summary-label">Keys Tested</span>', '<span class="summary-label">Keys tested</span>'),
    ('<span class="summary-label">Total Keystrokes</span>', '<span class="summary-label">Total key presses</span>'),
    ('<span class="summary-label">Maximum Concurrent</span>', '<span class="summary-label">Max together</span>'),
    ('<span class="summary-label">Test Duration</span>', '<span class="summary-label">Test duration</span>'),
    ("type: 'Incomplete Testing',", "type: 'Test never complete',"),
]


cps_js = [
    ('<h2><i class="fas fa-chart-bar"></i> Test Results</h2>', '<h2><i class="fas fa-chart-bar"></i> Test result</h2>'),
    ('View results after completing the test', 'See result after you finish di test'),
    ('Test in Progress...', 'Test dey run...'),
    ('Restart Test', 'Start again'),
    ('Click to Start New Test', 'Click to start new test'),
    ('Button Usage Distribution:', 'Button use spread:'),
    ('<div class="result-label">Average CPS</div>', '<div class="result-label">Average CPS</div>'),
    ('<div class="result-label">Max CPS</div>', '<div class="result-label">Max CPS</div>'),
    ('<div class="result-label">Total Clicks</div>', '<div class="result-label">Total clicks</div>'),
    ('<span class="result-label">Test Mode</span>', '<span class="result-label">Test mode</span>'),
    ('<span class="result-label">Button Mode</span>', '<span class="result-label">Button mode</span>'),
    ('<span class="result-label">Test Duration</span>', '<span class="result-label">Test duration</span>'),
    ('<span class="result-label">Min CPS</span>', '<span class="result-label">Min CPS</span>'),
    ('<span class="result-label">Click Consistency</span>', '<span class="result-label">Click steadiness</span>'),
    ('<span class="result-label">Overall Score</span>', '<span class="result-label">Overall score</span>'),
    ('<span>Auto-Save Test Results</span>', '<span>Auto-save test result</span>'),
    ('<i class="fas fa-download"></i> Export Data', '<i class="fas fa-download"></i> Export data'),
]


voice_recorder_js = [
    ("document.getElementById('statusText').textContent = rec\n    ? `Recording · ${sourceText}`\n    : 'Standby · Ready';",
     "document.getElementById('statusText').textContent = rec\n    ? `Dey record · ${sourceText}`\n    : 'Dey wait · Ready';"),
    ("const sourceText = source === 'mic' ? 'Microphone' : 'System audio';", "const sourceText = source === 'mic' ? 'Microphone' : 'System audio';"),
    ("<div class=\"empty-state\">No recording yet · press REC and choose audio source for the popup</div>", "<div class=\"empty-state\">No recording yet · press REC and choose audio source for di popup</div>"),
]


websocket_js = [
    ("addSys('Invalid JSON format','error');", "addSys('JSON format no correct','error');"),
    ("addSys('WS Terminal v2.4.0 ready');", "addSys('WS Terminal v2.4.0 don ready');"),
    ("addSys('Tip: wss://echo.websocket.org — sends back any message');", "addSys('Hint: wss://echo.websocket.org — e sends any message back');"),
]


md5_js = [
    ("if(!batchData.length){ showToast('No batch data available','error'); return; }", "if(!batchData.length){ showToast('No batch data ready','error'); return; }"),
    ("const header='Original Input,MD5-32,MD5-16,MD5-32 Uppercase\\n';", "const header='Source Input,MD5-32,MD5-16,MD5-32 Uppercase\\n';"),
    ("showToast('CSV exported');", "showToast('CSV don export');"),
    ("onInputChange(); showToast('Pasted');", "onInputChange(); showToast('Don paste');"),
    ("} catch(e){ showToast('Unable to access clipboard','error'); }", "} catch(e){ showToast('No fit access clipboard','error'); }"),
]


crc32_js = [
    ("if (!lastResults) { showToast('Calculate CRC32 first', 'error'); return; }", "if (!lastResults) { showToast('Calculate CRC32 first', 'error'); return; }"),
    ("if (!raw) { showToast('Enter the expected checksum first', 'error'); return; }", "if (!raw) { showToast('Put expected checksum first', 'error'); return; }"),
    ("if (isNaN(expected)) { showToast('Unable to parse the checksum. Supported formats: 0x... (hex), decimal, and binary', 'error'); return; }", "if (isNaN(expected)) { showToast('No fit read checksum. Use 0x... (hex), decimal or binary', 'error'); return; }"),
    ("? `✓ &nbsp; Checksum match — calculated value <strong style=\"margin:0 6px\">${formatCRC(got,'hex')}</strong> matches the expected value`", "? `✓ &nbsp; Checksum match — calculated value <strong style=\"margin:0 6px\">${formatCRC(got,'hex')}</strong> match di expected value`"),
    (": `✗ &nbsp; Checksum mismatch — calculated value <strong style=\"margin:0 6px\">${formatCRC(got,'hex')}</strong> ≠ expected value <strong style=\"margin:0 6px\">0x${expected.toString(16).toUpperCase().padStart(8,'0')}</strong>`;", ": `✗ &nbsp; Checksum no match — calculated value <strong style=\"margin:0 6px\">${formatCRC(got,'hex')}</strong> ≠ expected value <strong style=\"margin:0 6px\">0x${expected.toString(16).toUpperCase().padStart(8,'0')}</strong>`;"),
    ("lines.push(`\\n... previewing the first ${total} bytes out of ${bytes.length} total file bytes`);", "lines.push(`\\n... dey preview first ${total} bytes from ${bytes.length} total file bytes`);"),
    ("badge.textContent = 'TEXT PREVIEW';", "badge.textContent = 'TEXT PREVIEW';"),
    ("badge.textContent = 'HEX DUMP';", "badge.textContent = 'HEX DUMP';"),
    ("showToast(`Loaded ${file.name} (${formatBytes(file.size)})`);", "showToast(`Don load ${file.name} (${formatBytes(file.size)})`);"),
    ("ta.placeholder = 'Enter text here, or upload a file...\\n\\nCalculate CRC32 checksums in real time';", "ta.placeholder = 'Put text here, or upload file...\\n\\nCalculate CRC32 checksum live';"),
    ("setStatus('Ready - enter data and click \"Calculate CRC32\"');", "setStatus('Ready - put data and click \"Calculate CRC32\"');"),
    ("setStatus('Ready - all data has been reset');", "setStatus('Ready - all data don reset');"),
    ("showToast('Pasted');", "showToast('Don paste');"),
    ("showToast('Unable to access the clipboard, please paste manually', 'error');", "showToast('No fit access clipboard, abeg paste am by hand', 'error');"),
    ("if (!lastResults) { showToast('No result available yet', 'error'); return; }", "if (!lastResults) { showToast('No result dey yet', 'error'); return; }"),
]


ping_js = [
    ("handleResult(duration, `Response from ${target}: time=${duration}ms`);", "handleResult(duration, `Response from ${target}: time=${duration}ms`);"),
    ("log(`[Local block] ${target} request blocked by browser or extension`, false);", "log(`[Local block] ${target} request blocked by browser or extension`, false);"),
    ("handleResult(null, `Local block (${duration}ms)`);", "handleResult(null, `Local block (${duration}ms)`);"),
    ("log(`[Connection failed] ${target} unreachable (DNS failure/refused/timeout)`, false);", "log(`[Connection failed] ${target} no reachable (DNS fail/refused/timeout)`, false);"),
    ("handleResult(null, `Request failed (${duration}ms)`);", "handleResult(null, `Request fail (${duration}ms)`);"),
]


changed = 0
changed += replace_in_file("static/js/toolbox/camera/script-pcm.js", camera_js)
changed += replace_in_file("static/js/toolbox/mic/script-pcm.js", mic_js)
changed += replace_in_file("static/js/toolbox/keyboard/script-pcm.js", keyboard_js)
changed += replace_in_file("static/js/toolbox/mouse/cps/script-pcm.js", cps_js)
changed += replace_in_file("static/js/utility-tools/design-media/image-converter/script-pcm.js", image_converter_js)
changed += replace_in_file("static/js/utility-tools/design-media/audio-converter/script-pcm.js", audio_converter_js)
changed += replace_in_file("static/js/utility-tools/design-media/online-voice-recorder/script-pcm.js", voice_recorder_js)
changed += replace_in_file("static/js/utility-tools/math/md5-generator/script-pcm.js", md5_js)
changed += replace_in_file("static/js/utility-tools/math/crc32-generator/script-pcm.js", crc32_js)
changed += replace_in_file("static/js/utility-tools/netdev/ping/script-pcm.js", ping_js)
changed += replace_in_file("static/js/utility-tools/netdev/json-parser/script-pcm.js", json_parser_js)
changed += replace_in_file("static/js/utility-tools/netdev/websocket-test/script-pcm.js", websocket_js)

print(f"updated {changed} files")
